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
 * Each entry = ~234 tile requests staggered over ~20s in the background.
 *
 * Order matters — lower index = earlier warmup. High-traffic communities first.
 * Abu Dhabi (5) → Dubai (5).
 */
export const TM_PRELOAD_COMMUNITIES: PreloadCommunity[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // ABU DHABI — Top 5
  // ═══════════════════════════════════════════════════════════════════════

  // 1. Saadiyat Island — cultural & luxury hub (NYUAD, Louvre, Mamsha)
  { name: 'Saadiyat Island',  lat: 24.5360, lng: 54.4330, zooms: [15, 16] },

  // 2. Yas Island — entertainment & mega-projects (Yas Bay, Ferrari World)
  { name: 'Yas Island',       lat: 24.4870, lng: 54.6080, zooms: [15, 16] },

  // 3. Al Reem Island — dense residential waterfront (The Gate, Shams)
  { name: 'Al Reem Island',   lat: 24.5010, lng: 54.4030, zooms: [15, 16] },

  // 4. Al Raha Beach — Canal-side mixed-use (Al Bandar, Al Muneera)
  { name: 'Al Raha Beach',    lat: 24.4400, lng: 54.6150, zooms: [15, 16] },

  // 5. Khalifa City — established suburban community near Yas
  { name: 'Khalifa City',     lat: 24.4300, lng: 54.6140, zooms: [15, 16] },

  // ═══════════════════════════════════════════════════════════════════════
  // DUBAI — Top 5
  // ═══════════════════════════════════════════════════════════════════════

  // 6. Downtown Dubai — Burj Khalifa, Dubai Mall, Emaar flagship
  { name: 'Downtown Dubai',   lat: 25.1972, lng: 55.2744, zooms: [15, 16] },

  // 7. Dubai Marina — largest man-made marina, JBR promenade
  { name: 'Dubai Marina',     lat: 25.0757, lng: 55.1342, zooms: [15, 16] },

  // 8. Palm Jumeirah — iconic palm island, Nakheel developments
  { name: 'Palm Jumeirah',    lat: 25.1124, lng: 55.1388, zooms: [15, 16] },

  // 9. Business Bay — canal district, mixed commercial & residential
  { name: 'Business Bay',     lat: 25.1865, lng: 55.2551, zooms: [15, 16] },

  // 10. Jumeirah Village Circle — most active off-plan community in Dubai
  { name: 'Jumeirah Village Circle', lat: 25.0588, lng: 55.2075, zooms: [15, 16] },
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
      // Stagger community starts 5s apart — with 10 communities the last one
      // starts 45s after the idle callback fires, all safely in the background.
      const communityOffset = idx * 5000 + extraDelaySec * 1000;
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
