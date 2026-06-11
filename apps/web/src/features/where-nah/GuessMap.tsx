/**
 * Interactive guess map for Where Nah. The player taps anywhere on Trinidad to
 * drop a guess; once the round is revealed it also shows the true location and a
 * line connecting the two.
 */
import { useEffect, useRef, useState } from "react";
import {
  TRINIDAD_BOUNDS,
  TRINIDAD_CENTER,
  formatDistance,
  haversineMeters,
  type LatLng,
} from "@bmt/shared";
import { getMapsMapIdForTheme, loadGoogleMaps } from "@/lib/googleMaps";

interface GuessMapProps {
  guess: LatLng | null;
  actual: LatLng | null;
  /** When true, taps no longer move the guess (round is locked/revealed). */
  locked: boolean;
  onGuess: (point: LatLng) => void;
}

export function GuessMap({ guess, actual, locked, onGuess }: GuessMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const guessMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const actualMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const distanceMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const lineRef = useRef<google.maps.Polyline | null>(null);
  const onGuessRef = useRef(onGuess);
  const lockedRef = useRef(locked);
  const mapReadyRef = useRef(false);
  const [mapEpoch, setMapEpoch] = useState(0);
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  const trinidadBounds = {
    north: TRINIDAD_BOUNDS.north,
    south: TRINIDAD_BOUNDS.south,
    east: TRINIDAD_BOUNDS.east,
    west: TRINIDAD_BOUNDS.west,
  };

  onGuessRef.current = onGuess;
  lockedRef.current = locked;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const syncTheme = () => {
      setIsDarkTheme(root.classList.contains("dark"));
    };

    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  function createDotElement(color: string, label: string): HTMLElement {
    const el = document.createElement("div");
    el.className = "flex flex-col items-center gap-1 select-none";
    const bubble = document.createElement("div");
    bubble.className = "rounded-full border border-white/90 bg-surface/95 px-3 py-1 shadow-lg";
    const dot = document.createElement("span");
    dot.className = "h-4 w-4 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(255,255,255,0.35)]";
    dot.style.background = color;
    const text = document.createElement("span");
    text.className = "text-[10px] font-semibold uppercase tracking-[0.24em] text-ink";
    text.textContent = label;
    bubble.append(text);
    el.append(bubble, dot);
    return el;
  }

  function createDistanceElement(distanceMeters: number): HTMLElement {
    const el = document.createElement("div");
    el.className = "rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink shadow-lg";
    el.textContent = formatDistance(distanceMeters);
    return el;
  }

  function clearOverlay<T extends { map?: google.maps.Map | null }>(overlayRef: React.MutableRefObject<T | null>) {
    if (!overlayRef.current) return;
    overlayRef.current.map = null;
    overlayRef.current = null;
  }

  function clearMapOverlays(): void {
    clearOverlay(guessMarkerRef);
    clearOverlay(actualMarkerRef);
    clearOverlay(distanceMarkerRef);
    lineRef.current?.setMap(null);
    lineRef.current = null;
  }

  function fitTrinidadView(map: google.maps.Map, g: typeof google): void {
    map.fitBounds(trinidadBounds, 24);
    g.maps.event.addListenerOnce(map, "idle", () => {
      const zoom = map.getZoom();
      if (typeof zoom === "number" && zoom > 9) {
        map.setZoom(9);
      }
    });
  }

  // Recreate the map when theme changes so cloud map IDs/styles swap instantly.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    clearMapOverlays();
    mapClickListenerRef.current?.remove();
    mapClickListenerRef.current = null;
    mapRef.current = null;
    mapReadyRef.current = false;
    setMapEpoch(0);
    container.innerHTML = "";

    loadGoogleMaps().then((g) => {
      if (cancelled) return;
      const mapTheme = isDarkTheme ? "dark" : "light";
      const themedMapId = getMapsMapIdForTheme(mapTheme);
      const map = new g.maps.Map(container, {
        center: TRINIDAD_CENTER,
        zoom: 9,
        ...(themedMapId ? { mapId: themedMapId } : {}),
        colorScheme: isDarkTheme
          ? g.maps.ColorScheme.DARK
          : g.maps.ColorScheme.LIGHT,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "greedy",
        clickableIcons: false,
        restriction: {
          latLngBounds: {
            south: TRINIDAD_BOUNDS.south,
            north: TRINIDAD_BOUNDS.north,
            west: TRINIDAD_BOUNDS.west,
            east: TRINIDAD_BOUNDS.east,
          },
          strictBounds: false,
        },
      });
      mapRef.current = map;
      mapReadyRef.current = true;
      setMapEpoch(Date.now());
      fitTrinidadView(map, g);

      mapClickListenerRef.current = map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (lockedRef.current || !e.latLng) return;
        onGuessRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      });
    });

    return () => {
      cancelled = true;
      mapClickListenerRef.current?.remove();
      mapClickListenerRef.current = null;
    };
  }, [isDarkTheme]);

  // Sync overlays whenever the map is ready or the guess/answer changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReadyRef.current || !map || !window.google?.maps) return;
    const g = window.google;
    void g.maps.importLibrary("marker");

    const updateOverlay = async () => {
      const markerLib = (await g.maps.importLibrary("marker")) as google.maps.MarkerLibrary;
      const { AdvancedMarkerElement } = markerLib;

      const updateMarker = (
        ref: React.MutableRefObject<google.maps.marker.AdvancedMarkerElement | null>,
        position: LatLng | null,
        element: HTMLElement,
        title: string,
      ) => {
        if (!position) {
          clearOverlay(ref);
          return;
        }
        if (!ref.current) {
          ref.current = new AdvancedMarkerElement({
            map,
            position,
            title,
            content: element,
          });
        } else {
          ref.current.position = position;
          ref.current.title = title;
          ref.current.content = element;
        }
      };

      updateMarker(
        guessMarkerRef,
        guess,
        createDotElement("#E10600", "Your guess"),
        "Your guess",
      );
      updateMarker(
        actualMarkerRef,
        actual,
        createDotElement("#15803D", "Correct spot"),
        "Correct spot",
      );

      if (!actual || !guess) {
        clearOverlay(distanceMarkerRef);
        lineRef.current?.setMap(null);
        lineRef.current = null;
        return;
      }

      const distanceMeters = haversineMeters(guess, actual);
      updateMarker(
        distanceMarkerRef,
        {
          lat: (guess.lat + actual.lat) / 2,
          lng: (guess.lng + actual.lng) / 2,
        },
        createDistanceElement(distanceMeters),
        `${formatDistance(distanceMeters)} away`,
      );

      lineRef.current?.setMap(null);
      lineRef.current = new g.maps.Polyline({
        map,
        path: [guess, actual],
        geodesic: true,
        strokeColor: "#0A0A0A",
        strokeOpacity: 0,
        strokeWeight: 2,
        icons: [
          {
            icon: {
              path: "M 0,-1 0,1",
              strokeOpacity: 1,
              strokeColor: "#0A0A0A",
              scale: 2,
            },
            offset: "0",
            repeat: "12px",
          },
        ],
      });

      fitTrinidadView(map, g);
    };

    void updateOverlay();
  }, [guess, actual, mapEpoch]);

  useEffect(() => {
    return () => {
      clearMapOverlays();
      mapClickListenerRef.current?.remove();
      mapClickListenerRef.current = null;
      mapRef.current = null;
      mapReadyRef.current = false;
    };
  }, []);

  return (
    <div className="relative h-full w-full rounded-xl">
      <div ref={containerRef} className="h-full w-full" />
      {!mapReadyRef.current && (
        <div className="absolute inset-0 grid place-items-center bg-surface/70 text-ink-muted">
          Loading map…
        </div>
      )}
    </div>
  );
}
