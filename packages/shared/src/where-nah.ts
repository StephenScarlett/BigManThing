/**
 * Where Nah — a GeoGuessr-style mode set in Trinidad.
 *
 * This module is intentionally framework-agnostic (no Google Maps / DOM
 * dependencies) so it can be shared between the web app, tests, and a future
 * server / edge function that serves curated locations from Supabase.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Number of rounds in a single Where Nah game. */
export const WHERE_NAH_ROUNDS = 5;

/** Maximum points awarded for a single round (a perfect guess). */
export const WHERE_NAH_MAX_ROUND_SCORE = 5000;

/** Best possible total score for a full game. */
export const WHERE_NAH_MAX_GAME_SCORE =
  WHERE_NAH_ROUNDS * WHERE_NAH_MAX_ROUND_SCORE;

/**
 * How far (in metres) the player is allowed to roam from the starting
 * panorama before Street View snaps them back. Keeps a round anchored to its
 * neighbourhood without fully locking the player in place.
 */
export const WHERE_NAH_MAX_EXPLORE_METERS = 250;

/**
 * Distance-decay constant (metres) used by {@link scoreForDistance}. Tuned for
 * the size of Trinidad (~80 km long) so that close guesses feel rewarding while
 * island-wide misses still score something.
 */
export const WHERE_NAH_SCORE_SCALE_METERS = 14_000;

/** Bounding box that fully contains the island of Trinidad. */
export const TRINIDAD_BOUNDS = {
  south: 10.02,
  north: 10.86,
  west: -61.96,
  east: -60.9,
} as const;

/** Geographic centre used as the default map view. */
export const TRINIDAD_CENTER: LatLng = { lat: 10.45, lng: -61.25 };

/**
 * Rough land outline of Trinidad (clockwise). Used to reject random points
 * that fall in the ocean / offshore before they are ever sent to Street View.
 * It does not need to be pixel-accurate — the Street View coverage check is the
 * authoritative filter — but it eliminates the vast majority of water points.
 */
export const TRINIDAD_POLYGON: ReadonlyArray<LatLng> = [
  { lat: 10.075, lng: -61.93 }, // Icacos Point (SW tip)
  { lat: 10.17, lng: -61.685 }, // Point Fortin
  { lat: 10.235, lng: -61.62 }, // La Brea
  { lat: 10.275, lng: -61.47 }, // San Fernando
  { lat: 10.4, lng: -61.48 }, // Pointe-a-Pierre / Couva coast
  { lat: 10.65, lng: -61.51 }, // Port of Spain
  { lat: 10.69, lng: -61.64 }, // Chaguaramas (NW peninsula)
  { lat: 10.78, lng: -61.43 }, // Maracas Bay
  { lat: 10.79, lng: -61.35 }, // Las Cuevas
  { lat: 10.79, lng: -61.28 }, // Blanchisseuse
  { lat: 10.8, lng: -61.15 }, // Saut d'Eau coast
  { lat: 10.81, lng: -61.06 }, // Matelot
  { lat: 10.83, lng: -60.95 }, // Toco (NE tip)
  { lat: 10.66, lng: -61.02 }, // Matura / Salybia
  { lat: 10.51, lng: -61.03 }, // Manzanilla
  { lat: 10.29, lng: -61.0 }, // Mayaro
  { lat: 10.13, lng: -60.99 }, // Galeota Point (SE tip)
  { lat: 10.15, lng: -61.03 }, // Guayaguayare
  { lat: 10.065, lng: -61.27 }, // Moruga (south coast)
  { lat: 10.07, lng: -61.64 }, // Erin
];

/** Mean radius of the Earth in metres. */
const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance between two points in metres (haversine). Deterministic
 * and dependency-free so scoring is identical on client, server, and in tests.
 */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Ray-casting point-in-polygon test. Returns true when {@link point} lies
 * inside {@link TRINIDAD_POLYGON} (or any supplied polygon).
 */
export function isPointInPolygon(
  point: LatLng,
  polygon: ReadonlyArray<LatLng> = TRINIDAD_POLYGON,
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    const intersects =
      a.lng > point.lng !== b.lng > point.lng &&
      point.lat <
        ((b.lat - a.lat) * (point.lng - a.lng)) / (b.lng - a.lng) + a.lat;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Quick bounding-box + land-polygon test for "is this point on Trinidad?". */
export function isInTrinidad(point: LatLng): boolean {
  if (
    point.lat < TRINIDAD_BOUNDS.south ||
    point.lat > TRINIDAD_BOUNDS.north ||
    point.lng < TRINIDAD_BOUNDS.west ||
    point.lng > TRINIDAD_BOUNDS.east
  ) {
    return false;
  }
  return isPointInPolygon(point);
}

/**
 * GeoGuessr-style score: 0–{@link WHERE_NAH_MAX_ROUND_SCORE} points based on an
 * exponential decay of the guess distance. A perfect guess scores the maximum;
 * the score falls off smoothly with distance.
 */
export function scoreForDistance(
  distanceMeters: number,
  maxScore: number = WHERE_NAH_MAX_ROUND_SCORE,
  scaleMeters: number = WHERE_NAH_SCORE_SCALE_METERS,
): number {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) return 0;
  const score = maxScore * Math.exp(-distanceMeters / scaleMeters);
  return Math.round(score);
}

/** Human-friendly distance label, e.g. "850 m" or "12.4 km". */
export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(distanceMeters < 10_000 ? 1 : 0)} km`;
}

/** Where a location came from — useful for analytics and curated rollout. */
export type WhereNahLocationSource = "random" | "curated";

/** A single resolved, playable Where Nah location. */
export interface WhereNahLocation {
  /**
   * Authoritative position of the panorama the round is anchored to. Scoring is
   * measured against this point.
   */
  position: LatLng;
  /** Resolved Street View panorama id, when known. */
  panoId?: string;
  /** Optional human label (curated locations may name the place). */
  label?: string;
  /** How this location was produced. */
  source: WhereNahLocationSource;
}

/**
 * Pluggable source of playable locations. The web app ships a random Trinidad
 * generator today; a Supabase-backed curated provider can implement this same
 * interface later with zero changes to the game UI.
 */
export interface WhereNahLocationProvider {
  /** The kind of locations this provider yields. */
  readonly source: WhereNahLocationSource;
  /**
   * Resolve the next playable location. Implementations must only return
   * locations with confirmed Street View coverage. May be aborted via signal.
   */
  next(signal?: AbortSignal): Promise<WhereNahLocation>;
}

/** Result of a single completed round. */
export interface WhereNahRoundResult {
  target: LatLng;
  guess: LatLng;
  distanceMeters: number;
  score: number;
}
