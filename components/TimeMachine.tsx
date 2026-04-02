import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, Settings, RefreshCw } from 'lucide-react';
import { waybackYears, WaybackYear } from '../data/waybackYears';

interface TimeMachineProps {
  mapRef: React.MutableRefObject<any>;
  lat: number;
  lng: number;
  projectName: string;
  onClose: () => void;
}

// Tile preloader — no crossOrigin (Esri redirect drops CORS headers)
function preloadTileAndWait(tileUrl: string, z: number, lat: number, lng: number): Promise<void> {
  return new Promise(resolve => {
    const n = Math.pow(2, z);
    const x = Math.floor(((lng + 180) / 360) * n);
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = tileUrl.replace('{z}', String(z)).replace('{y}', String(y)).replace('{x}', String(x));
    setTimeout(resolve, 4000);
  });
}

function preloadSurrounding(tileUrl: string, z: number, lat: number, lng: number) {
  const n = Math.pow(2, z);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++) {
      const img = new Image();
      img.src = tileUrl.replace('{z}', String(z)).replace('{y}', String(y + dy)).replace('{x}', String(x + dx));
    }
}

const TimeMachine: React.FC<TimeMachineProps> = ({ mapRef, lat, lng, projectName, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(waybackYears.length - 1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [direction, setDirection] = useState<'backward' | 'forward'>('backward');
  const [intervalSec, setIntervalSec] = useState(5);
  const [showSettings, setShowSettings] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoadingTile, setIsLoadingTile] = useState(false);
  const [viewMode, setViewMode] = useState<'birdeye' | '3d'>('3d');
  const [isRotating, setIsRotating] = useState(true);

  const tickerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotationRef = useRef<number | null>(null);
  const preloadedRef = useRef<Set<number>>(new Set());
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settingsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const currentYear = waybackYears[currentIndex];
  const TARGET_PITCH = viewMode === '3d' ? 60 : 0;

  // Auto-fade settings after 10 seconds
  useEffect(() => {
    if (showSettings) {
      if (settingsTimerRef.current) clearTimeout(settingsTimerRef.current);
      settingsTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) setShowSettings(false);
      }, 10000);
    }
    return () => { if (settingsTimerRef.current) clearTimeout(settingsTimerRef.current); };
  }, [showSettings]);

  // Auto-hide after 15s idle when paused — reset on any interaction
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!isPlaying) {
      idleTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) handleClose();
      }, 15000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  useEffect(() => {
    resetIdleTimer();
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [resetIdleTimer]);

  // Dispatch time-machine-active for App.tsx to hide project sidebar
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('time-machine-active', { detail: { active: isPlaying } }));
  }, [isPlaying]);

  // Broadcast whether a Time Machine session is open so external orbit controls can target it.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('time-machine-open', { detail: { active: true } }));
    return () => {
      window.dispatchEvent(new CustomEvent('time-machine-open', { detail: { active: false } }));
      window.dispatchEvent(new CustomEvent('time-machine-rotation', { detail: { active: false } }));
    };
  }, []);

  // Notify MapCommandCenter of rotation state
  const dispatchRotate = useCallback((active: boolean) => {
    window.dispatchEvent(new CustomEvent('time-machine-rotation', { detail: { active } }));
  }, []);

  // Allow external orbit buttons to pause/resume the Time Machine orbit.
  useEffect(() => {
    const handleToggleRotation = (e: Event) => {
      const requestedState = (e as CustomEvent).detail?.active;
      setIsRotating(prev => typeof requestedState === 'boolean' ? requestedState : !prev);
      resetIdleTimer();
    };

    window.addEventListener('time-machine-toggle-rotation', handleToggleRotation);
    return () => window.removeEventListener('time-machine-toggle-rotation', handleToggleRotation);
  }, [resetIdleTimer]);

  // Camera rotation — auto-starts with Time Machine, but can be paused independently.
  useEffect(() => {
    if (!isRotating) {
      if (rotationRef.current) { cancelAnimationFrame(rotationRef.current); rotationRef.current = null; }
      dispatchRotate(false);
      return;
    }

    // Retry getting the map + delay so the initial flyTo (2s) finishes first
    let retries = 0;
    const startupDelay = setTimeout(() => {
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
          try { bearing = (bearing + 0.15) % 360; map.easeTo({ bearing, duration: 0 }); } catch { /* keep loop alive */ }
          rotationRef.current = requestAnimationFrame(rotate);
        };
        rotationRef.current = requestAnimationFrame(rotate);
        dispatchRotate(true);
      };
      tryStart();
    }, 2500); // Wait for flyTo animation to finish

    return () => {
      clearTimeout(startupDelay);
      if (rotationRef.current) { cancelAnimationFrame(rotationRef.current); rotationRef.current = null; }
      dispatchRotate(false);
    };
  }, [isRotating, mapRef, dispatchRotate]);

  // Apply wayback layer with crossfade — promotes NEXT→CURR after each transition
  const applyYear = useCallback((yearEntry: WaybackYear, animate = true) => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    if (!map.isStyleLoaded()) {
      map.once('style.load', () => applyYear(yearEntry, animate));
      return;
    }
    if (fadeTimerRef.current) { clearInterval(fadeTimerRef.current); fadeTimerRef.current = null; }
    const NEXT = 'wayback-next', CURR = 'wayback-current';
    // Clean up any lingering NEXT layer from a previous interrupted transition
    try { if (map.getLayer(NEXT)) map.removeLayer(NEXT); if (map.getSource(NEXT)) map.removeSource(NEXT); } catch { /**/ }
    try {
      map.addSource(NEXT, { type: 'raster', tiles: [yearEntry.tileUrl], tileSize: 256 });
      const sym = map.getStyle()?.layers?.find((l: any) => l.type === 'symbol');
      map.addLayer({ id: NEXT, type: 'raster', source: NEXT, paint: { 'raster-opacity': 0 } }, sym?.id);
    } catch { return; }
    if (!animate) {
      try { map.setPaintProperty(NEXT, 'raster-opacity', 1); } catch { /**/ }
      // Promote: remove old CURR, rename NEXT→CURR
      try { if (map.getLayer(CURR)) map.removeLayer(CURR); if (map.getSource(CURR)) map.removeSource(CURR); } catch { /**/ }
      return;
    }
    setIsTransitioning(true);
    let op = 0;
    fadeTimerRef.current = setInterval(() => {
      op += 0.05;
      if (op >= 1) {
        op = 1;
        if (fadeTimerRef.current) clearInterval(fadeTimerRef.current); fadeTimerRef.current = null;
        // Promote NEXT to CURR: remove old CURR first
        try { if (map.getLayer(CURR)) map.removeLayer(CURR); if (map.getSource(CURR)) map.removeSource(CURR); } catch { /**/ }
        if (isMountedRef.current) setIsTransitioning(false);
      }
      try {
        map.setPaintProperty(NEXT, 'raster-opacity', op);
        if (map.getLayer(CURR)) map.setPaintProperty(CURR, 'raster-opacity', 1 - op);
      } catch { /**/ }
    }, 50);
  }, [mapRef]);

  // Fly to project with correct pitch for current view mode
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    map.flyTo({ center: [lng, lat], zoom: 16, pitch: TARGET_PITCH, bearing: map.getBearing(), duration: 2000 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef, lat, lng]); // TARGET_PITCH intentionally excluded — handled by viewMode effect

  // Smoothly transition camera pitch when viewMode changes mid-session
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    try { map.easeTo({ pitch: TARGET_PITCH, duration: 1000 }); } catch { /* */ }
  }, [viewMode, TARGET_PITCH, mapRef]);

  // Init: set satellite, apply first year, start preload
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    const sprite = map.getStyle()?.sprite;
    const isSat = sprite && String(sprite).includes('satellite');
    const init = () => { applyYear(currentYear, false); preloadAll(); };
    if (!isSat) { map.setStyle('mapbox://styles/mapbox/satellite-streets-v12'); map.once('style.load', () => setTimeout(init, 300)); }
    else { setTimeout(init, 300); }
    return () => { isMountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Auto-advance with tile preload wait
  useEffect(() => {
    if (tickerRef.current) clearTimeout(tickerRef.current);
    if (!isPlaying || isTransitioning || isLoadingTile) return;
    tickerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setCurrentIndex(prev => {
        let next = direction === 'backward' ? prev - 1 : prev + 1;
        if (next < 0) { setDirection('forward'); next = 1; }
        else if (next >= waybackYears.length) { setDirection('backward'); next = waybackYears.length - 2; }
        const ny = waybackYears[next];
        setIsLoadingTile(true);
        preloadTileAndWait(ny.tileUrl, 16, lat, lng).then(() => {
          if (!isMountedRef.current) return;
          setIsLoadingTile(false);
          applyYear(ny, true);
        });
        return next;
      });
    }, intervalSec * 1000);
    return () => { if (tickerRef.current) clearTimeout(tickerRef.current); };
  }, [isPlaying, direction, intervalSec, isTransitioning, isLoadingTile, applyYear, lat, lng]);

  // Cleanup on close
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
      try { ['wayback-current', 'wayback-next'].forEach(id => { if (map.getLayer(id)) map.removeLayer(id); if (map.getSource(id)) map.removeSource(id); }); } catch { /**/ }
      map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
    }
    onClose();
  };

  // Arrows = continuous play in that direction; reset idle timer
  const playDir = (dir: 'backward' | 'forward') => {
    setDirection(dir);
    setIsPlaying(true);
    resetIdleTimer();
  };

  // Btn helper
  const Btn = ({ onClick, active, title, children }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      title={title}
      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${active ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
    >{children}</button>
  );

  return (
    /*
     * Anchored bottom-left — above the PSI logo / bottom toolbar
     * z-[6200] ensures it renders above all other UI
     */
    <div
      className="fixed left-4 z-[6200] flex flex-col items-start gap-1 animate-in slide-in-from-bottom-2 duration-300"
      style={{ bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 12px) + 68px)' }}
    >
      {/* ── Settings panel — opens above, auto-fades in 10s ── */}
      {showSettings && (
        <div className="animate-in fade-in slide-in-from-bottom-1 duration-200">
          <div className="inline-flex items-center gap-3 bg-slate-900/90 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 shadow-lg flex-wrap">
            {/* View mode: Bird's Eye / 3D */}
            <div className="flex items-center gap-1">
              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">View</span>
              <button onClick={() => setViewMode('birdeye')}
                className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-all ${viewMode === 'birdeye' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
              >Bird's Eye</button>
              <button onClick={() => setViewMode('3d')}
                className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-all ${viewMode === '3d' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
              >3D</button>
            </div>
            <div className="w-px h-4 bg-white/10" />
            {/* Speed */}
            <div className="flex items-center gap-1">
              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">Speed</span>
              {[3, 5, 7, 10].map(s => (
                <button key={s} onClick={() => { setIntervalSec(s); }}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-all ${intervalSec === s ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
                >{s}s</button>
              ))}
            </div>
            <div className="w-px h-4 bg-white/10" />
            {/* Direction */}
            <div className="flex items-center gap-1">
              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">Dir</span>
              <button onClick={() => setDirection(d => d === 'backward' ? 'forward' : 'backward')}
                className="px-2 py-0.5 rounded text-[9px] font-black bg-white/10 text-white/70 hover:bg-white/20 transition-all"
              >{direction === 'backward' ? '2026→2014' : '2014→2026'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main compact widget ── */}
      <div className="bg-slate-900/85 backdrop-blur-md rounded-xl border border-white/10 shadow-xl px-3 py-2 flex flex-col gap-1">

        {/* Row: arrows + year  |  play · settings · close */}
        <div className="flex items-center gap-2">
          {/* Arrows + year */}
          <button
            onClick={() => playDir('backward')}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-white transition-colors shrink-0 ${isPlaying && direction === 'backward' ? 'bg-indigo-600' : 'bg-white/10 hover:bg-white/20'}`}
            title="Play backwards"
          >
            <SkipBack className="w-3 h-3" />
          </button>

          <div className="bg-indigo-600 rounded-lg px-3 py-0.5 w-[62px] text-center shrink-0">
            <span className="text-sm font-black text-white tracking-tight leading-none">
              {currentYear.year}
            </span>
          </div>

          <button
            onClick={() => playDir('forward')}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-white transition-colors shrink-0 ${isPlaying && direction === 'forward' ? 'bg-indigo-600' : 'bg-white/10 hover:bg-white/20'}`}
            title="Play forwards"
          >
            <SkipForward className="w-3 h-3" />
          </button>

          {/* Separator */}
          <div className="w-px h-4 bg-white/15 shrink-0" />

          {/* Play/Pause · Settings · Close */}
          <Btn onClick={() => setIsPlaying(p => !p)} active={isPlaying} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
          </Btn>
          <Btn onClick={() => setIsRotating(r => !r)} active={isRotating} title={isRotating ? 'Pause Orbit' : 'Resume Orbit'}>
            <RefreshCw className={`w-3 h-3 ${isRotating ? 'animate-spin' : ''}`} style={isRotating ? { animationDuration: '4s' } : undefined} />
          </Btn>
          <Btn onClick={() => setShowSettings(s => !s)} active={showSettings} title="Speed & Direction">
            <Settings className="w-3 h-3" />
          </Btn>
          <button
            onClick={handleClose}
            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-red-500/80 hover:text-white transition-colors shrink-0"
            title="Close Time Machine"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Dot timeline */}
        <div className="flex items-center gap-0.5">
          {waybackYears.map((y, i) => (
            <button
              key={y.year}
              onClick={() => { setIsPlaying(false); setCurrentIndex(i); applyYear(y, true); }}
              className="flex flex-col items-center gap-0"
              title={String(y.year)}
            >
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? 'bg-indigo-400 scale-125 shadow-lg shadow-indigo-400/50'
                  : i < currentIndex ? 'bg-white/40' : 'bg-white/15'
              }`} />
              <span className={`text-[6px] font-bold leading-tight ${i === currentIndex ? 'text-indigo-300' : 'text-white/25'}`}>
                {y.year}
              </span>
            </button>
          ))}
        </div>

        {/* Direction hint */}
        <span className="text-[6px] font-bold text-white/35 uppercase tracking-wider text-center">
          {isPlaying
            ? direction === 'backward' ? '← back in time' : 'forward in time →'
            : currentYear.date}
        </span>
      </div>
    </div>
  );
};

export default TimeMachine;
