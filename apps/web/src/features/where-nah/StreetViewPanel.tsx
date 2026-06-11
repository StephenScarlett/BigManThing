/**
 * Street View panorama for a Where Nah round.
 *
 * - Lets the player look around and roam the immediate area, but snaps them back
 *   if they wander beyond {@link WHERE_NAH_MAX_EXPLORE_METERS} of the start.
 * - Hides every control that would reveal the location (address, road labels).
 * - Surfaces a graceful fallback if the panorama fails to load.
 */
import { useEffect, useRef, useState } from "react";
import {
  WHERE_NAH_MAX_EXPLORE_METERS,
  type LatLng,
  type WhereNahLocation,
} from "@bmt/shared";
import { loadGoogleMaps } from "@/lib/googleMaps";

interface StreetViewPanelProps {
  location: WhereNahLocation;
  /** Bump this to force a re-centre back to the round's origin. */
  resetSignal?: number;
  onResetToStart?: () => void;
  onPanoramaExhausted?: () => void;
}

export function StreetViewPanel({
  location,
  resetSignal,
  onResetToStart,
  onPanoramaExhausted,
}: StreetViewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const resetRef = useRef(onResetToStart);
  const googleRef = useRef<typeof google | null>(null);
  const originRef = useRef<LatLng>(location.position);
  const lastAllowedRef = useRef<LatLng>(location.position);
  const statusRef = useRef<"loading" | "ready" | "error">("loading");
  const appliedTokenRef = useRef<string>("");
  const retryTimerRef = useRef<number | null>(null);
  const snapTimerRef = useRef<number | null>(null);
  const autoRetryCountRef = useRef(0);
  const prevResetSignalRef = useRef<number | undefined>(resetSignal);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retryNonce, setRetryNonce] = useState(0);

  resetRef.current = onResetToStart;

  const setPanelStatus = (next: "loading" | "ready" | "error") => {
    statusRef.current = next;
    setStatus(next);
  };

  const locationToken = `${location.panoId ?? "pos"}:${location.position.lat.toFixed(6)}:${location.position.lng.toFixed(6)}`;

  // Keep the latest location available to the (mount-only) init effect.
  const locationRef = useRef<WhereNahLocation>(location);
  locationRef.current = location;

  // Point the panorama at a location. Centralised so the init effect and the
  // per-round apply effect stay in sync and never double-fetch the same pano.
  const applyLocation = (token: string) => {
    const pano = panoRef.current;
    if (!pano || appliedTokenRef.current === token) return;
    appliedTokenRef.current = token;

    const loc = locationRef.current;
    const origin = loc.position;
    originRef.current = origin;
    lastAllowedRef.current = origin;
    setPanelStatus("loading");
    pano.setVisible(true);

    if (loc.panoId) {
      pano.setPano(loc.panoId);
    } else {
      pano.setPosition(origin);
    }
    pano.setPov({ heading: Math.random() * 360, pitch: 0 });
    pano.setZoom(0);
  };

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    loadGoogleMaps()
      .then((g) => {
        if (cancelled) return;
        googleRef.current = g;

        // Remove listeners from the previous round before wiring the pano again.
        for (const listener of listenersRef.current) listener.remove();
        listenersRef.current = [];

        const pano =
          panoRef.current ??
          new g.maps.StreetViewPanorama(container, {
            addressControl: false,
            showRoadLabels: false,
            fullscreenControl: false,
            motionTracking: false,
            motionTrackingControl: false,
            enableCloseButton: false,
            zoomControl: true,
            clickToGo: true,
            disableDefaultUI: false,
            visible: true,
          });
        panoRef.current = pano;

        // Clamp roaming: if the player moves too far, bounce back to the last
        // position that was still inside the allowed radius.
        // Debounced: we don't call setPosition on every position_changed event
        // because each setPosition triggers a full Street View tile fetch burst.
        listenersRef.current.push(pano.addListener("position_changed", () => {
          const pos = pano.getPosition();
          if (!pos) return;
          const here: LatLng = { lat: pos.lat(), lng: pos.lng() };
          const dist = g.maps.geometry.spherical.computeDistanceBetween(
            new g.maps.LatLng(originRef.current.lat, originRef.current.lng),
            pos,
          );
          if (dist <= WHERE_NAH_MAX_EXPLORE_METERS) {
            lastAllowedRef.current = here;
            // Back in range — cancel any pending snap.
            if (snapTimerRef.current !== null) {
              window.clearTimeout(snapTimerRef.current);
              snapTimerRef.current = null;
            }
          } else if (snapTimerRef.current === null) {
            // Out of range — schedule a single snap after a short pause rather
            // than calling setPosition on every intermediate step.
            snapTimerRef.current = window.setTimeout(() => {
              snapTimerRef.current = null;
              pano.setPosition(lastAllowedRef.current);
            }, 250);
          }
        }));

        listenersRef.current.push(pano.addListener("status_changed", () => {
          const ok = pano.getStatus() === g.maps.StreetViewStatus.OK;
          setPanelStatus(ok ? "ready" : "error");
        }));

        // Pano is ready now — apply the current round's location. The separate
        // apply effect below already ran (and bailed) before this resolved.
        applyLocation(`${locationToken}|${retryNonce}`);
      })
      .catch(() => {
        if (!cancelled) setPanelStatus("error");
      });

    return () => {
      cancelled = true;
      for (const listener of listenersRef.current) listener.remove();
      listenersRef.current = [];
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (snapTimerRef.current !== null) {
        window.clearTimeout(snapTimerRef.current);
        snapTimerRef.current = null;
      }
      panoRef.current?.setVisible(false);
    };
  }, []);

  useEffect(() => {
    applyLocation(`${locationToken}|${retryNonce}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationToken, retryNonce]);

  // If Street View fails for the current round, auto-retry with bounded backoff.
  useEffect(() => {
    if (status !== "error") {
      autoRetryCountRef.current = 0;
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      return;
    }

    if (autoRetryCountRef.current >= 2) {
      return;
    }
    if (retryTimerRef.current !== null) return;
    const delay = 700 * 2 ** autoRetryCountRef.current;
    autoRetryCountRef.current += 1;
    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null;
      setRetryNonce((n) => n + 1);
    }, delay);

    return () => {
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [status, onPanoramaExhausted]);

  useEffect(() => {
    if (prevResetSignalRef.current === resetSignal) return;
    prevResetSignalRef.current = resetSignal;
    const pano = panoRef.current;
    if (!pano) return;
    const origin = originRef.current;
    lastAllowedRef.current = origin;
    pano.setPosition(origin);
    pano.setPov({ heading: Math.random() * 360, pitch: 0 });
    pano.setZoom(0);
  }, [resetSignal]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, []);

  const resetToStart = () => {
    const pano = panoRef.current;
    if (!pano) return;
    const origin = originRef.current;
    lastAllowedRef.current = origin;
    pano.setPosition(origin);
    pano.setPov({ heading: Math.random() * 360, pitch: 0 });
    pano.setZoom(0);
    resetRef.current?.();
  };

  return (
    <div className="relative h-full w-full bg-surface-3">
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute left-3 top-3 z-10">
        <button type="button" onClick={resetToStart} className="btn-secondary bg-surface/90 backdrop-blur">
          Back to start
        </button>
      </div>
      {status === "loading" && (
        <div className="absolute inset-0 grid place-items-center bg-surface/70 text-ink-muted">
          Loading street view…
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 grid place-items-center bg-surface/90 p-6 text-center">
          <div>
            <p className="text-ink font-semibold">Street view didn&apos;t load</p>
            <p className="text-ink-muted text-sm mt-1">
              This can happen when Street View is temporarily rate-limited (HTTP 429) or unavailable for this spot.
            </p>
            <button
              type="button"
              disabled={retryTimerRef.current !== null}
              onClick={() => setRetryNonce((n) => n + 1)}
              className="btn-secondary mt-3 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {retryTimerRef.current !== null ? "Retrying..." : "Retry panorama"}
            </button>
            {onPanoramaExhausted && (
              <button
                type="button"
                onClick={onPanoramaExhausted}
                className="btn-secondary mt-2"
              >
                Try a different location
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
