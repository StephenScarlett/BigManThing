/**
 * Where Nah location providers.
 *
 * The game UI only depends on the {@link WhereNahLocationProvider} interface, so
 * the underlying source can be swapped without touching gameplay code. Today we
 * ship a random Trinidad generator. A curated, Supabase-backed provider can be
 * added later (see {@link createLocationProvider}) and selected at runtime.
 */
import {
  isInTrinidad,
  TRINIDAD_BOUNDS,
  type LatLng,
  type WhereNahLocation,
  type WhereNahLocationProvider,
} from "@bmt/shared";
import { loadGoogleMaps } from "@/lib/googleMaps";

/** Thrown when a valid panorama could not be found within the attempt budget. */
export class NoLocationFoundError extends Error {
  constructor(message = "Couldn't find a Street View spot in Trinidad. Try again.") {
    super(message);
    this.name = "NoLocationFoundError";
  }
}

function randomPointInTrinidad(): LatLng {
  // Rejection-sample within the bounding box until we land on the island.
  for (let i = 0; i < 200; i++) {
    const lat =
      TRINIDAD_BOUNDS.south +
      Math.random() * (TRINIDAD_BOUNDS.north - TRINIDAD_BOUNDS.south);
    const lng =
      TRINIDAD_BOUNDS.west +
      Math.random() * (TRINIDAD_BOUNDS.east - TRINIDAD_BOUNDS.west);
    const point = { lat, lng };
    if (isInTrinidad(point)) return point;
  }
  // Extremely unlikely; fall back to the island centre.
  return { lat: 10.45, lng: -61.25 };
}

interface RandomProviderOptions {
  /** Radius (m) to search for a nearby panorama around each random seed point. */
  searchRadius?: number;
  /** Maximum random seed points to try before giving up. */
  maxAttempts?: number;
  /** Delay between attempts to avoid API burst throttling. */
  attemptDelayMs?: number;
}

interface PanoramaLookupResult {
  data: google.maps.StreetViewPanoramaData | null;
  overQueryLimit: boolean;
}

function isInTrinidadCoastalBuffer(point: LatLng, marginDeg = 0.06): boolean {
  return (
    point.lat >= TRINIDAD_BOUNDS.south - marginDeg &&
    point.lat <= TRINIDAD_BOUNDS.north + marginDeg &&
    point.lng >= TRINIDAD_BOUNDS.west - marginDeg &&
    point.lng <= TRINIDAD_BOUNDS.east + marginDeg
  );
}

function isOverQueryLimitError(err: unknown): boolean {
  if (typeof err !== "object" || !err) return false;
  const maybe = err as { message?: string; status?: string; code?: string | number };
  const raw = String(maybe.message ?? maybe.status ?? maybe.code ?? "").toUpperCase();
  return raw.includes("OVER_QUERY_LIMIT") || raw.includes("429");
}

/** Returns ms ± up to 40% so concurrent callers don't fire in lock-step. */
function jitter(ms: number): number {
  return Math.round(ms * (0.6 + Math.random() * 0.8));
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const id = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Generates random points on the island of Trinidad and snaps each to the
 * nearest outdoor Street View panorama. Land points without nearby coverage
 * (forest, agriculture, water that slips past the polygon) are skipped and the
 * search continues — guaranteeing every returned location is playable.
 */
export class RandomTrinidadLocationProvider implements WhereNahLocationProvider {
  readonly source = "random" as const;

  private readonly searchRadius: number;
  private readonly maxAttempts: number;
  private readonly attemptDelayMs: number;
  private servicePromise: Promise<google.maps.StreetViewService> | null = null;

  constructor(options: RandomProviderOptions = {}) {
    this.searchRadius = options.searchRadius ?? 2200;
    this.maxAttempts = options.maxAttempts ?? 18;
    this.attemptDelayMs = options.attemptDelayMs ?? 400;
  }

  private async getService(): Promise<google.maps.StreetViewService> {
    if (!this.servicePromise) {
      this.servicePromise = loadGoogleMaps().then(
        (g) => new g.maps.StreetViewService(),
      );
    }
    return this.servicePromise;
  }

  async next(signal?: AbortSignal): Promise<WhereNahLocation> {
    const g = await loadGoogleMaps();
    const service = await this.getService();
    let queryLimitHits = 0;

    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      const seed = randomPointInTrinidad();
      const pano = await this.findPanorama(g, service, seed);
      if (pano.overQueryLimit) {
        queryLimitHits += 1;
        // Exponential backoff starting at 1 s, capped at 16 s, with jitter.
        const cooldown = jitter(Math.min(16_000, 1_000 * 2 ** Math.min(queryLimitHits - 1, 4)));
        await wait(cooldown, signal);
        continue;
      }
      queryLimitHits = 0;

      const resolved = pano.data?.location?.latLng;
      if (!resolved) {
        await wait(jitter(this.attemptDelayMs), signal);
        continue;
      }

      const position: LatLng = { lat: resolved.lat(), lng: resolved.lng() };
      // Coastal roads can resolve just off the polygon. Accept on-island points
      // and near-coast points within a small Trinidad-only buffer.
      const accepted = isInTrinidad(position) || isInTrinidadCoastalBuffer(position);
      if (!accepted) {
        await wait(jitter(this.attemptDelayMs), signal);
        continue;
      }

      return {
        position,
        panoId: pano.data?.location?.pano,
        source: this.source,
      };
    }

    throw new NoLocationFoundError();
  }

  private findPanorama(
    g: typeof google,
    service: google.maps.StreetViewService,
    location: LatLng,
  ): Promise<PanoramaLookupResult> {
    return service
      .getPanorama({
        location,
        radius: this.searchRadius,
        source: g.maps.StreetViewSource.OUTDOOR,
        preference: g.maps.StreetViewPreference.NEAREST,
      })
      .then((res) => ({ data: res.data, overQueryLimit: false }))
      .catch((err) => ({ data: null, overQueryLimit: isOverQueryLimitError(err) }));
  }
}

export type LocationProviderKind = "random" | "curated";

/**
 * Factory for the active location provider. Swapping the game to a curated,
 * Supabase-backed catalogue later is a one-line change here — implement a
 * `SupabaseCuratedLocationProvider` (satisfying {@link WhereNahLocationProvider})
 * that selects rows from a `where_nah_locations` table and return it for the
 * `"curated"` kind. The gameplay UI needs no changes.
 */
export function createLocationProvider(
  kind: LocationProviderKind = "random",
): WhereNahLocationProvider {
  switch (kind) {
    case "curated":
      // TODO: return new SupabaseCuratedLocationProvider() once the
      // `where_nah_locations` table + admin tooling exist. Falls back to random
      // generation in the meantime so the mode is always playable.
      return new RandomTrinidadLocationProvider();
    case "random":
    default:
      return new RandomTrinidadLocationProvider();
  }
}
