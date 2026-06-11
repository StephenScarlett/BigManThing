/**
 * Lazily loads the Google Maps JavaScript API (used by Where Nah for Street
 * View + the guess map). The script is injected once and shared across the app;
 * concurrent callers await the same promise.
 *
 * Reuse note: any future feature that needs Google Maps should import
 * {@link loadGoogleMaps} rather than adding its own <script> tag.
 */

const CALLBACK_NAME = "__bmtGoogleMapsReady";

let loaderPromise: Promise<typeof google> | null = null;

export type MapTheme = "light" | "dark";

export function getMapsApiKey(): string | undefined {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
}

export function getMapsMapId(): string | undefined {
  return import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined;
}

export function getMapsMapIdForTheme(theme: MapTheme): string | undefined {
  const base = getMapsMapId();
  const light = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID_LIGHT as string | undefined;
  const dark = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID_DARK as string | undefined;
  return theme === "dark" ? dark || base : light || base;
}

function getAllConfiguredMapIds(): string[] {
  const ids = [
    getMapsMapId(),
    import.meta.env.VITE_GOOGLE_MAPS_MAP_ID_LIGHT as string | undefined,
    import.meta.env.VITE_GOOGLE_MAPS_MAP_ID_DARK as string | undefined,
  ].filter((value): value is string => Boolean(value && value.trim()));
  return [...new Set(ids)];
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }
  if (window.google?.maps) return Promise.resolve(window.google);
  if (loaderPromise) return loaderPromise;

  const key = getMapsApiKey();
  if (!key) {
    return Promise.reject(
      new Error("VITE_GOOGLE_MAPS_API_KEY is not set — cannot load Google Maps"),
    );
  }

  loaderPromise = new Promise<typeof google>((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    w[CALLBACK_NAME] = () => {
      delete w[CALLBACK_NAME];
      resolve(window.google);
    };

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key,
      libraries: "geometry",
      callback: CALLBACK_NAME,
      loading: "async",
      v: "quarterly",
    });
    const mapIds = getAllConfiguredMapIds();
    if (mapIds.length) {
      // Preload configured cloud map IDs so map/theme swaps are instant.
      params.set("map_ids", mapIds.join(","));
    }
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error("Failed to load the Google Maps script"));
    };
    document.head.appendChild(script);
  });

  return loaderPromise;
}
