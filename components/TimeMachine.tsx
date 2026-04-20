import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, Settings, RefreshCw } from 'lucide-react';
import { waybackYears, WaybackYear } from '../data/waybackYears';

interface TimeMachineProps {
  mapRef: React.MutableRefObject<any>;
  lat: number;
  lng: number;
  projectName: string;
  onClose: () => void;
  /** The Mapbox style URL that was active before Time Machine launched.
   *  If provided, it will be restored when Time Machine closes. */
  originalMapStyle?: string;
}

// ── Tile preloader ─────────────────────────────────────────────────────────
// No crossOrigin attr — Esri Wayback redirects strip CORS headers.
function preloadTileAndWait(
  tileUrl: string, z: number, lat: number, lng: number,
): Promise<void> {
  return new Promise(resolve => {
    const n = Math.pow(2, z);
    const x = Math.floor(((lng + 180) / 360) * n);
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
    );
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = tileUrl
      .replace('{z}', String(z))
      .replace('{y}', String(y))
      .replace('{x}', String(x));
    setTimeout(resolve, 4000); // max 4s wait
  });
}

function preloadSurrounding(tileUrl: string, z: number, lat: number, lng: number) {
  const n = Math.pow(2, z);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++) {
      const img = new Image();
      img.src = tileUrl
        .replace('{z}', String(z))
        .replace('{y}', String(y + dy))
        .replace('{x}', String(x + dx));
    }
}

// ── Constants ──────────────────────────────────────────────────────────────
const TARGET_PITCH = 60; // Always 3D
const ORBIT_SPEED = 0.1125; // °/frame — 25% slower than original 0.15

// Split 13 years into two rows for a compact yet readable dot timeline
const DOT_ROW_1 = waybackYears.slice(0, 7);  // 2014–2020
const DOT_ROW_2 = waybackYears.slice(7);     // 2021–2026

// ── Component ──────────────────────────────────────────────────────────────
const TimeMachine: React.FC<TimeMachineProps> = ({
  mapRef, lat, lng, projectName, onClose, originalMapStyle,
}) => {
  const [currentIndex, setCurrentIndex]   = useState(waybackYears.length - 1);
  const [isPlaying, setIsPlaying]         = useState(true);
  const [direction, setDirection]         = useState<'backward' | 'forward'>('backward');
  const [intervalSec, setIntervalSec]     = useState(5);
  const [showSettings, setShowSettings]   = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoadingTile, setIsLoadingTile] = useState(false);
  const [isRotating, setIsRotating]       = useState(true);

  const tickerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotationRef     = useRef<number | null>(null);
  const preloadedRef    = useRef<Set<number>>(new Set());
  const fadeTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const settingsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef    = useRef(true);
  /** Mirror of currentIndex for safe reads inside timer callbacks (no stale closure). */
  const currentIndexRef = useRef(waybackYears.length - 1);
  /** True only on the very first orbit start — uses a longer startup delay. */
  const isFirstOrbitRef = useRef(true);

  const currentYear = waybackYears[currentIndex];

  // Keep ref in sync with state
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  // ── Settings auto-fade ─────────────────────────────────────────────────
  useEffect(() => {
    if (showSettings) {
      if (settingsTimerRef.current) clearTimeout(settingsTimerRef.current);
      settingsTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) setShowSettings(false);
      }, 10_000);
    }
    return () => { if (settingsTimerRef.current) clearTimeout(settingsTimerRef.current); };
  }, [showSettings]);

  // ── Idle auto-close (15 s when paused) ────────────────────────────────
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!isPlaying) {
      idleTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) handleClose(); // eslint-disable-line react-hooks/exhaustive-deps
      }, 15_000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  useEffect(() => {
    resetIdleTimer();
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [resetIdleTimer]);

  // ── Broadcast active state (hides project sidebar in App.tsx) ─────────
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('time-machine-active', { detail: { active: isPlaying } }));
  }, [isPlaying]);

  // ── Broadcast open/close ───────────────────────────────────────────────
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('time-machine-open', { detail: { active: true } }));
    return () => {
      window.dispatchEvent(new CustomEvent('time-machine-open', { detail: { active: false } }));
      window.dispatchEvent(new CustomEvent('time-machine-rotation', { detail: { active: false } }));
    };
  }, []);

  // ── Rotation state dispatcher ──────────────────────────────────────────
  const dispatchRotate = useCallback((active: boolean) => {
    window.dispatchEvent(new CustomEvent('time-machine-rotation', { detail: { active } }));
  }, []);

  // ── External orbit toggle (from MapCommandCenter) ─────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const requested = (e as CustomEvent).detail?.active;
      setIsRotating(prev => typeof requested === 'boolean' ? requested : !prev);
      resetIdleTimer();
    };
    window.addEventListener('time-machine-toggle-rotation', handler);
    return () => window.removeEventListener('time-machine-toggle-rotation', handler);
  }, [resetIdleTimer]);

  // ── Camera orbit ───────────────────────────────────────────────────────
  // FIX: First orbit start waits 2500ms (for flyTo). Re-enables use 300ms.
  useEffect(() => {
    if (!isRotating) {
      if (rotationRef.current) { cancelAnimationFrame(rotationRef.current); rotationRef.current = null; }
      dispatchRotate(false);
      return;
    }

    const startDelay = isFirstOrbitRef.current ? 2500 : 300;
    isFirstOrbitRef.current = false;

    let retries = 0;
    const startupTimer = setTimeout(() => {
      const tryStart = () => {
        const map = mapRef.current?.getMap?.();
        if (!map) {
          if (retries++ < 20) setTimeout(tryStart, 150);
          return;
        }
        if (rotationRef.current) cancelAnimationFrame(rotationRef.current);
        let bearing = 0;
        try { bearing = map.getBearing(); } catch { /* */ }
        const rotate = () => {
          if (!isMountedRef.current) return;
          try {
            bearing = (bearing + ORBIT_SPEED) % 360;
            map.easeTo({ bearing, pitch: TARGET_PITCH, duration: 0 });
          } catch { /* keep loop alive */ }
          rotationRef.current = requestAnimationFrame(rotate);
        };
        rotationRef.current = requestAnimationFrame(rotate);
        dispatchRotate(true);
      };
      tryStart();
    }, startDelay);

    return () => {
      clearTimeout(startupTimer);
      if (rotationRef.current) { cancelAnimationFrame(rotationRef.current); rotationRef.current = null; }
      dispatchRotate(false);
    };
  }, [isRotating, mapRef, dispatchRotate]);

  // ── Apply wayback layer with crossfade ────────────────────────────────
  // FIX: After each fade, NEXT is properly promoted to CURR so the layer
  // names are always consistent. The original code left NEXT as "NEXT"
  // after a completed transition, causing the next applyYear call to
  // immediately delete the only visible layer (a blank-flash bug).
  const applyYear = useCallback((yearEntry: WaybackYear, animate = true) => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    if (!map.isStyleLoaded()) {
      map.once('style.load', () => applyYear(yearEntry, animate));
      return;
    }
    // Cancel any in-progress fade
    if (fadeTimerRef.current) { clearInterval(fadeTimerRef.current); fadeTimerRef.current = null; }

    const NEXT = 'wayback-next', CURR = 'wayback-current';
    const sym = () => map.getStyle()?.layers?.find((l: any) => l.type === 'symbol');

    // Remove lingering NEXT from any interrupted transition
    try { if (map.getLayer(NEXT)) map.removeLayer(NEXT); if (map.getSource(NEXT)) map.removeSource(NEXT); } catch { /**/ }
    // Add new NEXT at opacity 0
    try {
      map.addSource(NEXT, { type: 'raster', tiles: [yearEntry.tileUrl], tileSize: 256 });
      map.addLayer({ id: NEXT, type: 'raster', source: NEXT, paint: { 'raster-opacity': 0 } }, sym()?.id);
    } catch { return; }

    const promoteNextToCurr = () => {
      // Remove old CURR, create new CURR from same tiles as NEXT, then remove NEXT.
      // This keeps naming consistent: CURR always = what's currently visible.
      try { if (map.getLayer(CURR)) map.removeLayer(CURR); if (map.getSource(CURR)) map.removeSource(CURR); } catch { /**/ }
      try {
        map.addSource(CURR, { type: 'raster', tiles: [yearEntry.tileUrl], tileSize: 256 });
        map.addLayer({ id: CURR, type: 'raster', source: CURR, paint: { 'raster-opacity': 1 } }, sym()?.id);
      } catch { /**/ }
      try { if (map.getLayer(NEXT)) map.removeLayer(NEXT); if (map.getSource(NEXT)) map.removeSource(NEXT); } catch { /**/ }
    };

    if (!animate) {
      // Instant switch (no fade) — still promote properly
      try { map.setPaintProperty(NEXT, 'raster-opacity', 1); } catch { /**/ }
      promoteNextToCurr();
      return;
    }

    setIsTransitioning(true);
    let op = 0;
    fadeTimerRef.current = setInterval(() => {
      op = Math.min(op + 0.05, 1);
      try {
        map.setPaintProperty(NEXT, 'raster-opacity', op);
        if (map.getLayer(CURR)) map.setPaintProperty(CURR, 'raster-opacity', 1 - op);
      } catch { /**/ }

      if (op >= 1) {
        if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
        promoteNextToCurr();
        if (isMountedRef.current) setIsTransitioning(false);
      }
    }, 50);
  }, [mapRef]);

  // ── Initial flyTo + satellite style ───────────────────────────────────
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    map.flyTo({ center: [lng, lat], zoom: 16, pitch: TARGET_PITCH, bearing: map.getBearing(), duration: 2000 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef, lat, lng]);

  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    const sprite = map.getStyle()?.sprite;
    const isSat = sprite && String(sprite).includes('satellite');
    const init = () => { applyYear(currentYear, false); preloadAll(); };
    if (!isSat) {
      map.setStyle('mapbox://styles/mapbox/satellite-streets-v12');
      map.once('style.load', () => setTimeout(init, 300));
    } else {
      setTimeout(init, 300);
    }
    return () => { isMountedRef.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Background tile preload ────────────────────────────────────────────
  const preloadAll = useCallback(() => {
    const total = waybackYears.length;
    const start = total - 1;
    const order: number[] = [];
    for (let i = 0; i < total; i++) {
      if (start - i >= 0) order.push(start - i);
      if (i > 0 && start + i < total) order.push(start + i);
    }
    let loaded = 0;
    order.forEach((idx, i) => setTimeout(() => {
      const y = waybackYears[idx];
      if (!preloadedRef.current.has(y.year)) {
        preloadSurrounding(y.tileUrl, 16, lat, lng);
        preloadSurrounding(y.tileUrl, 15, lat, lng);
        preloadedRef.current.add(y.year);
      }
      loaded++;
    }, i * 300));
    void loaded;
  }, [lat, lng]);

  // ── Auto-advance ticker ────────────────────────────────────────────────
  // FIX: setCurrentIndex (badge) is now called AFTER the tile loads and
  // applyYear starts — so the displayed year always matches the visible imagery.
  useEffect(() => {
    if (tickerRef.current) clearTimeout(tickerRef.current);
    if (!isPlaying || isTransitioning || isLoadingTile) return;

    tickerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;

      // Read current index via ref — avoids stale closure without adding
      // currentIndex to effect deps (which would cause excessive reschedules).
      const prev = currentIndexRef.current;
      let next = direction === 'backward' ? prev - 1 : prev + 1;
      if (next < 0) { setDirection('forward'); next = 1; }
      else if (next >= waybackYears.length) { setDirection('backward'); next = waybackYears.length - 2; }

      const ny = waybackYears[next];
      setIsLoadingTile(true);

      preloadTileAndWait(ny.tileUrl, 16, lat, lng).then(() => {
        if (!isMountedRef.current) return;
        // Update badge and imagery together — no more desync.
        setCurrentIndex(next);
        setIsLoadingTile(false);
        applyYear(ny, true);
      });
    }, intervalSec * 1000);

    return () => { if (tickerRef.current) clearTimeout(tickerRef.current); };
  }, [isPlaying, direction, intervalSec, isTransitioning, isLoadingTile, applyYear, lat, lng]);

  // ── Close ──────────────────────────────────────────────────────────────
  const handleClose = () => {
    isMountedRef.current = false;
    window.dispatchEvent(new CustomEvent('time-machine-active', { detail: { active: false } }));
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setIsPlaying(false);
    setIsRotating(false);
    dispatchRotate(false);
    if (rotationRef.current) cancelAnimationFrame(rotationRef.current);
    if (tickerRef.current) clearTimeout(tickerRef.current);
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);

    const map = mapRef.current?.getMap?.();
    if (map) {
      // FIX: Restore the original map style if it was non-satellite.
      if (originalMapStyle) {
        try {
          map.setStyle(originalMapStyle);
          map.once('style.load', () => {
            try { map.easeTo({ pitch: 0, bearing: 0, duration: 1000 }); } catch { /**/ }
          });
        } catch { /**/ }
      } else {
        // Already satellite — just remove wayback layers and reset camera
        try {
          ['wayback-current', 'wayback-next'].forEach(id => {
            if (map.getLayer(id)) map.removeLayer(id);
            if (map.getSource(id)) map.removeSource(id);
          });
        } catch { /**/ }
        map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
      }
    }
    onClose();
  };

  // ── Directional play helpers ───────────────────────────────────────────
  const playDir = (dir: 'backward' | 'forward') => {
    setDirection(dir);
    setIsPlaying(true);
    resetIdleTimer();
  };

  // ── Tiny button component ──────────────────────────────────────────────
  const Btn = ({
    onClick, active, title, children,
  }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      title={title}
      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${
        active ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
      }`}
    >{children}</button>
  );

  // ── Dot helper (used in both rows) ────────────────────────────────────
  const Dot = ({ y, i }: { y: typeof waybackYears[0]; i: number }) => (
    <button
      key={y.year}
      onClick={() => {
        if (tickerRef.current) { clearTimeout(tickerRef.current); tickerRef.current = null; }
        setIsPlaying(false);
        setCurrentIndex(i);
        applyYear(y, true);
      }}
      className="flex flex-col items-center gap-0 group"
      title={String(y.year)}
    >
      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
        i === currentIndex
          ? 'bg-indigo-400 scale-125 shadow-lg shadow-indigo-400/50'
          : i < currentIndex ? 'bg-white/45' : 'bg-white/15'
      }`} />
      <span className={`text-[7px] font-bold leading-tight transition-colors ${
        i === currentIndex ? 'text-indigo-300' : 'text-white/30 group-hover:text-white/60'
      }`}>
        {y.year}
      </span>
    </button>
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed left-4 z-[6200] flex flex-col items-start gap-1 animate-in slide-in-from-bottom-2 duration-300"
      style={{ bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 12px) + 68px)' }}
    >
      {/* Settings panel */}
      {showSettings && (
        <div className="animate-in fade-in slide-in-from-bottom-1 duration-200">
          <div className="inline-flex items-center gap-3 bg-slate-900 rounded-xl px-3 py-2 border border-white/10 shadow-lg flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">Speed</span>
              {[3, 5, 7, 10].map(s => (
                <button key={s} onClick={() => setIntervalSec(s)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-all ${intervalSec === s ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
                >{s}s</button>
              ))}
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1">
              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">Dir</span>
              <button
                onClick={() => setDirection(d => d === 'backward' ? 'forward' : 'backward')}
                className="px-2 py-0.5 rounded text-[9px] font-black bg-white/10 text-white/70 hover:bg-white/20 transition-all"
              >
                {direction === 'backward' ? '2026→2014' : '2014→2026'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main widget */}
      <div className="bg-slate-900 rounded-xl border border-white/10 shadow-xl px-3 py-2 flex flex-col gap-1">

        {/* Controls row */}
        <div className="flex items-center gap-2">
          {/* ◀ Play back */}
          <button
            onClick={() => playDir('backward')}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-white transition-colors shrink-0 ${isPlaying && direction === 'backward' ? 'bg-indigo-600' : 'bg-white/10 hover:bg-white/20'}`}
            title="Play backwards"
          >
            <SkipBack className="w-3 h-3" />
          </button>

          {/* Year badge — shows spinner while loading */}
          <div className="bg-indigo-600 rounded-lg px-2 py-0.5 w-[58px] h-[22px] flex items-center justify-center shrink-0">
            {isLoadingTile ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="text-sm font-black text-white tracking-tight leading-none">
                {currentYear.year}
              </span>
            )}
          </div>

          {/* ▶ Play forward */}
          <button
            onClick={() => playDir('forward')}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-white transition-colors shrink-0 ${isPlaying && direction === 'forward' ? 'bg-indigo-600' : 'bg-white/10 hover:bg-white/20'}`}
            title="Play forwards"
          >
            <SkipForward className="w-3 h-3" />
          </button>

          <div className="w-px h-4 bg-white/15 shrink-0" />

          {/* ⏸ / ▶ Pause/Play */}
          <Btn
            onClick={() => {
              if (tickerRef.current) { clearTimeout(tickerRef.current); tickerRef.current = null; }
              setIsPlaying(p => !p);
            }}
            active={isPlaying}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-[1px]" />}
          </Btn>

          {/* 🔄 Orbit toggle */}
          <Btn onClick={() => setIsRotating(r => !r)} active={isRotating} title={isRotating ? 'Pause orbit' : 'Resume orbit'}>
            <RefreshCw className={`w-3 h-3 ${isRotating ? 'animate-spin' : ''}`} style={isRotating ? { animationDuration: '4s' } : undefined} />
          </Btn>

          {/* ⚙️ Settings */}
          <Btn onClick={() => setShowSettings(s => !s)} active={showSettings} title="Speed & direction">
            <Settings className="w-3 h-3" />
          </Btn>

          {/* ✕ Close */}
          <button
            onClick={handleClose}
            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-red-500/80 hover:text-white transition-colors shrink-0"
            title="Close Time Machine"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Dot timeline — two rows for compact width, clear year labels */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            {DOT_ROW_1.map((y, i) => <Dot key={y.year} y={y} i={i} />)}
          </div>
          <div className="flex items-center gap-1">
            {DOT_ROW_2.map((y, i) => <Dot key={y.year} y={y} i={i + DOT_ROW_1.length} />)}
          </div>
        </div>

        {/* Status line */}
        <span className="text-[6px] font-bold text-white/35 uppercase tracking-wider text-center leading-none">
          {isLoadingTile
            ? 'loading…'
            : isPlaying
            ? (direction === 'backward' ? '← back in time' : 'forward in time →')
            : currentYear.date}
        </span>

      </div>
    </div>
  );
};

export default TimeMachine;
