/**
 * timeMachinePreloader.ts
 *
 * Pre-warms the browser HTTP cache with Esri Wayback satellite tiles for
 * known high-traffic communities, so that Time Machine sessions load
 * near-instantly on repeat visits.
 *
 * Strategy:
 *  - Loads a 3×3 tile grid (centre + 8 neighbours) per year per zoom level
 *  - Tiles are staggered 80ms apart to avoid network contention
 *  - The whole warmup is deferred until the browser is idle (requestIdleCallback)
 *    so it never competes with real user interactions
 *  - Does NOT set crossOrigin — Esri Wayback redirects strip CORS headers
 */

import { waybackYears } from '../data/waybackYears';

// ── Community definitions ─────────────────────────────────────────────────
export interface PreloadCommunity {
  name: string;
  /** WGS-84 centre of the area to warm */
  lat: number;
  lng: number;
  /** Zoom levels to preload — default [15, 16] */
  zooms?: number[];
}

/**
 * Communities to pre-warm on every app startup.
 * Add more as needed — each community adds ~234 tile requests spread over ~20s.
 */
export const TM_PRELOAD_COMMUNITIES: PreloadCommunity[] = [
  // ── Saadiyat Island, Abu Dhabi ──────────────────────────────────────────
  // Centre of island; z=15 tiles cover ~4.8km each so the 3×3 grid
  // covers the whole island. z=16 covers the dense development cluster.
  { name: 'Saadiyat Island', lat: 24.536, lng: 54.433, zooms: [15, 16] },
];

// ── Internal helpers ──────────────────────────────────────────────────────
const _preloaded = new Set<string>();

function _tileXY(lat: number, lng: number, z: number): { x: number; y: number } {
  const n = Math.pow(2, z);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x, y };
}

/** Fire-and-forget image load — populates browser HTTP cache. */
function _loadTile(url: string): void {
  try {
    const img = new Image();
    // No crossOrigin — Esri Wayback redirects strip CORS headers
    img.src = url;
  } catch { /* ignore */ }
}

/**
 * Schedules all tile requests for one community.
 * @param community  Target area definition
 * @param startDelay Extra offset in ms before the first tile fires
 */
function _scheduleCommunity(community: PreloadCommunity, startDelay: number): void {
  const key = `${community.name}|${community.lat}|${community.lng}`;
  if (_preloaded.has(key)) return;
  _preloaded.add(key);

  const zooms = community.zooms ?? [15, 16];
  const STEP_MS = 80; // milliseconds between individual tile requests
  let tileIndex = 0;

  waybackYears.forEach(year => {
    zooms.forEach(z => {
      const { x, y } = _tileXY(community.lat, community.lng, z);

      // 3×3 grid centred on the community tile
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const url = year.tileUrl
            .replace('{z}', String(z))
            .replace('{y}', String(y + dy))
            .replace('{x}', String(x + dx));

          setTimeout(() => _loadTile(url), startDelay + tileIndex * STEP_MS);
          tileIndex++;
        }
      }
    });
  });

  const totalMs = Math.round((startDelay + tileIndex * STEP_MS) / 1000);
  console.debug(
    `[TM Preloader] Scheduling ${tileIndex} tiles for "${community.name}" — ` +
    `completes in ~${totalMs}s`,
  );
}

// ── Public API ────────────────────────────────────────────────────────────
/**
 * Pre-warms Time Machine satellite tiles for all communities listed in
 * TM_PRELOAD_COMMUNITIES.  Call once from App.tsx after the app mounts.
 *
 * Execution is deferred via requestIdleCallback (or a 8s setTimeout fallback)
 * and individual tile requests are staggered 80ms apart so the warmup never
 * impacts foreground performance.
 *
 * @param extraDelaySec  Additional seconds to wait before starting (default 0).
 *                        Useful if you want to wait for data to finish loading.
 */
export function warmupTimeMachineTiles(extraDelaySec = 0): void {
  const run = () => {
    TM_PRELOAD_COMMUNITIES.forEach((community, idx) => {
      // Stagger community starts 4s apart so their tile bursts don't overlap
      const communityOffset = idx * 4000 + extraDelaySec * 1000;
      _scheduleCommunity(community, communityOffset);
    });
  };

  // Use idle callback so this never competes with real user activity
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(run, { timeout: 15_000 });
  } else {
    setTimeout(run, 8_000); // Safari / older browsers fallback
  }
}

/**
 * Manually preload a specific project's Time Machine tiles (e.g. when the
 * user hovers over a Time Machine entry in the tour panel).
 */
export function preloadProjectTimeMachine(lat: number, lng: number, name = 'custom'): void {
  _scheduleCommunity({ name, lat, lng, zooms: [15, 16] }, 0);
}
