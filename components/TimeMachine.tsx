import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, X, Play, Pause, SkipBack, SkipForward, Settings } from 'lucide-react';
import { waybackYears, WaybackYear } from '../data/waybackYears';

interface TimeMachineProps {
  mapRef: React.MutableRefObject<any>;
  lat: number;
  lng: number;
  projectName: string;
  onClose: () => void;
}

// Tile-ready checker — no crossOrigin (Esri redirect strips CORS headers)
function preloadTileAndWait(tileUrl: string, z: number, lat: number, lng: number): Promise<void> {
  return new Promise(resolve => {
    const n = Math.pow(2, z);
    const x = Math.floor(((lng + 180) / 360) * n);
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
    const url = tileUrl.replace('{z}', String(z)).replace('{y}', String(y)).replace('{x}', String(x));
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
    setTimeout(resolve, 4000);
  });
}

function preloadSurroundingTiles(tileUrl: string, z: number, lat: number, lng: number) {
  const n = Math.pow(2, z);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const img = new Image();
      img.src = tileUrl.replace('{z}', String(z)).replace('{y}', String(y + dy)).replace('{x}', String(x + dx));
    }
  }
}

const TimeMachine: React.FC<TimeMachineProps> = ({ mapRef, lat, lng, projectName, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(waybackYears.length - 1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [direction, setDirection] = useState<'backward' | 'forward'>('backward');
  const [intervalSec, setIntervalSec] = useState(5);
  const [showSettings, setShowSettings] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [isLoadingTile, setIsLoadingTile] = useState(false);

  const tickerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotationRef = useRef<number | null>(null);
  const preloadedRef = useRef<Set<number>>(new Set());
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  const currentYear = waybackYears[currentIndex];

  // ── Notify MapCommandCenter of rotation state ─────────────
  const dispatchRotate = useCallback((active: boolean) => {
    window.dispatchEvent(new CustomEvent('time-machine-rotation', { detail: { active } }));
  }, []);

  // ── Camera rotation ────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    if (isPlaying) {
      let bearing = 0;
      try { bearing = map.getBearing(); } catch { bearing = 0; }
      const rotate = () => {
        if (!isMountedRef.current) return;
        try { bearing = (bearing + 0.15) % 360; map.setBearing(bearing); } catch { return; }
        rotationRef.current = requestAnimationFrame(rotate);
      };
      rotationRef.current = requestAnimationFrame(rotate);
      dispatchRotate(true);
    } else {
      if (rotationRef.current) { cancelAnimationFrame(rotationRef.current); rotationRef.current = null; }
      dispatchRotate(false);
    }
    return () => { if (rotationRef.current) { cancelAnimationFrame(rotationRef.current); rotationRef.current = null; } };
  }, [isPlaying, mapRef, dispatchRotate]);

  // ── Apply wayback layer ────────────────────────────────────
  const applyYear = useCallback((yearEntry: WaybackYear, animate = true) => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    if (!map.isStyleLoaded()) { map.once('style.load', () => applyYear(yearEntry, animate)); return; }
    if (fadeTimerRef.current) { clearInterval(fadeTimerRef.current); fadeTimerRef.current = null; }
    const NEXT_ID = 'wayback-next', CURRENT_ID = 'wayback-current';
    try { if (map.getLayer(NEXT_ID)) map.removeLayer(NEXT_ID); if (map.getSource(NEXT_ID)) map.removeSource(NEXT_ID); } catch { /**/ }
    try {
      map.addSource(NEXT_ID, { type: 'raster', tiles: [yearEntry.tileUrl], tileSize: 256 });
      const firstSymbol = map.getStyle()?.layers?.find((l: any) => l.type === 'symbol');
      map.addLayer({ id: NEXT_ID, type: 'raster', source: NEXT_ID, paint: { 'raster-opacity': 0 } }, firstSymbol?.id);
    } catch (err) { console.warn('[TimeMachine] layer error:', err); return; }
    if (!animate) {
      try { map.setPaintProperty(NEXT_ID, 'raster-opacity', 1); } catch { /**/ }
      try { if (map.getLayer(CURRENT_ID)) map.removeLayer(CURRENT_ID); if (map.getSource(CURRENT_ID)) map.removeSource(CURRENT_ID); } catch { /**/ }
      return;
    }
    setIsTransitioning(true);
    let opacity = 0;
    fadeTimerRef.current = setInterval(() => {
      opacity += 0.05;
      if (opacity >= 1) {
        opacity = 1; if (fadeTimerRef.current) clearInterval(fadeTimerRef.current); fadeTimerRef.current = null;
        try { if (map.getLayer(CURRENT_ID)) map.removeLayer(CURRENT_ID); if (map.getSource(CURRENT_ID)) map.removeSource(CURRENT_ID); } catch { /**/ }
        if (isMountedRef.current) setIsTransitioning(false);
      }
      try { map.setPaintProperty(NEXT_ID, 'raster-opacity', opacity); if (map.getLayer(CURRENT_ID)) map.setPaintProperty(CURRENT_ID, 'raster-opacity', 1 - opacity); } catch { /**/ }
    }, 50);
  }, [mapRef]);

  // ── Fly to project ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    map.flyTo({ center: [lng, lat], zoom: 16, pitch: 60, bearing: map.getBearing(), duration: 2000 });
  }, [mapRef, lat, lng]);

  // ── Init ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    const sprite = map.getStyle()?.sprite;
    const alreadySatellite = sprite && String(sprite).includes('satellite');
    const init = () => { applyYear(currentYear, false); preloadBackgroundAll(); };
    if (!alreadySatellite) { map.setStyle('mapbox://styles/mapbox/satellite-streets-v12'); map.once('style.load', () => setTimeout(init, 300)); }
    else { setTimeout(init, 300); }
    return () => { isMountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Background preload all years ───────────────────────────
  const preloadBackgroundAll = useCallback(() => {
    const totalYears = waybackYears.length;
    const startIdx = waybackYears.length - 1;
    const loadOrder: number[] = [];
    for (let offset = 0; offset < totalYears; offset++) {
      if (startIdx - offset >= 0) loadOrder.push(startIdx - offset);
      if (offset > 0 && startIdx + offset < totalYears) loadOrder.push(startIdx + offset);
    }
    let loaded = 0;
    loadOrder.forEach((idx, i) => {
      setTimeout(() => {
        const y = waybackYears[idx];
        if (!preloadedRef.current.has(y.year)) {
          preloadSurroundingTiles(y.tileUrl, 16, lat, lng);
          preloadSurroundingTiles(y.tileUrl, 15, lat, lng);
          preloadedRef.current.add(y.year);
        }
        loaded++;
        if (isMountedRef.current) setPreloadProgress(Math.round((loaded / totalYears) * 100));
      }, i * 300);
    });
  }, [lat, lng]);

  // ── Auto-advance — waits for tile before showing ───────────
  useEffect(() => {
    if (tickerRef.current) clearTimeout(tickerRef.current);
    if (!isPlaying || isTransitioning || isLoadingTile) return;
    tickerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setCurrentIndex(prev => {
        let next = direction === 'backward' ? prev - 1 : prev + 1;
        if (next < 0) { setDirection('forward'); next = 1; }
        else if (next >= waybackYears.length) { setDirection('backward'); next = waybackYears.length - 2; }
        const nextYear = waybackYears[next];
        setIsLoadingTile(true);
        preloadTileAndWait(nextYear.tileUrl, 16, lat, lng).then(() => {
          if (!isMountedRef.current) return;
          setIsLoadingTile(false);
          applyYear(nextYear, true);
        });
        return next;
      });
    }, intervalSec * 1000);
    return () => { if (tickerRef.current) clearTimeout(tickerRef.current); };
  }, [isPlaying, direction, intervalSec, isTransitioning, isLoadingTile, applyYear, lat, lng]);

  // ── Cleanup ────────────────────────────────────────────────
  const handleClose = () => {
    isMountedRef.current = false;
    setIsPlaying(false);
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

  // ── Arrows = continuous play in that direction ─────────────
  const playInDirection = (dir: 'backward' | 'forward') => {
    setDirection(dir);
    setIsPlaying(true);
  };

  return (
    // ── Fixed ABOVE the bottom nav bar — same compact style as before ──
    <div
      className="fixed left-0 right-0 z-[6200] animate-in slide-in-from-bottom-2 duration-300"
      style={{ bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 12px) + 68px)' }}
    >
      {/* ── Settings panel — renders above the bar ─── */}
      {showSettings && (
        <div className="flex justify-center px-3 pb-1">
          <div className="inline-flex items-center gap-4 bg-slate-900/85 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5">
              <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">Speed</span>
              {[3, 5, 7, 10].map(s => (
                <button key={s} onClick={() => setIntervalSec(s)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-all ${intervalSec === s ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
                >{s}s</button>
              ))}
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">Dir</span>
              <button onClick={() => setDirection(d => d === 'backward' ? 'forward' : 'backward')}
                className="px-2 py-0.5 rounded text-[9px] font-black bg-white/10 text-white/70 hover:bg-white/20 transition-all"
              >{direction === 'backward' ? '2026→2014' : '2014→2026'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Timeline area — compact dark frame ────────────── */}
      <div className="flex justify-center px-3 py-1.5">
        <div className="inline-flex flex-col items-center gap-1 bg-slate-900/85 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10 shadow-lg">
          {/* Year + arrows (continuous play in direction) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => playInDirection('backward')}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors ${isPlaying && direction === 'backward' ? 'bg-indigo-600' : 'bg-white/10'}`}
              title="Play backwards"
            >
              <SkipBack className="w-3 h-3" />
            </button>
            <div className="bg-indigo-600 rounded-lg px-3 py-0.5 min-w-[60px] text-center">
              <span className="text-base font-black text-white tracking-tight">
                {currentYear.year}
                {isLoadingTile && <span className="ml-1 inline-block w-1.5 h-1.5 bg-white/60 rounded-full animate-pulse" />}
              </span>
            </div>
            <button
              onClick={() => playInDirection('forward')}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors ${isPlaying && direction === 'forward' ? 'bg-indigo-600' : 'bg-white/10'}`}
              title="Play forwards"
            >
              <SkipForward className="w-3 h-3" />
            </button>
          </div>

          {/* Dot timeline */}
          <div className="flex items-center gap-0.5">
            {waybackYears.map((y, i) => (
              <button
                key={y.year}
                onClick={() => { setIsPlaying(false); setCurrentIndex(i); applyYear(y, true); }}
                className="flex flex-col items-center gap-0"
              >
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === currentIndex ? 'bg-indigo-400 scale-125 shadow-lg shadow-indigo-400/50' :
                  i < currentIndex ? 'bg-white/40' : 'bg-white/15'
                }`} />
                <span className={`text-[6px] font-bold transition-colors leading-tight ${
                  i === currentIndex ? 'text-indigo-300' : 'text-white/25'
                }`}>{y.year}</span>
              </button>
            ))}
          </div>

          {/* Direction hint */}
          <span className="text-[7px] font-bold text-white/40 uppercase tracking-wider">
            {isPlaying
              ? direction === 'backward' ? '← back in time' : 'forward in time →'
              : currentYear.date}
          </span>
        </div>
      </div>

      {/* ── Slim bar: Clock + name + preload + play/pause + settings + X ── */}
      <div className="flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 bg-slate-900/80 backdrop-blur-md">
        {/* Clock */}
        <div className="w-6 h-6 rounded-full bg-indigo-600/80 flex items-center justify-center shrink-0">
          <Clock className="w-3 h-3 text-white" />
        </div>
        {/* Name */}
        <div className="min-w-0 mr-auto">
          <p className="text-[7px] font-black uppercase tracking-[0.12em] text-indigo-400/80">Time Machine</p>
          <p className="text-[10px] font-bold text-white/90 truncate">{projectName}</p>
        </div>

        {/* Preload progress */}
        {preloadProgress < 100 && (
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${preloadProgress}%` }} />
            </div>
            <span className="text-[7px] font-bold text-white/30">{preloadProgress}%</span>
          </div>
        )}

        {/* Play / Pause */}
        <button
          onClick={() => setIsPlaying(p => !p)}
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${isPlaying ? 'bg-amber-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
        </button>

        {/* Settings */}
        <button
          onClick={() => setShowSettings(s => !s)}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:bg-white/20 shrink-0 ${showSettings ? 'bg-white/20' : 'bg-white/10'}`}
        >
          <Settings className="w-3 h-3" />
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-red-500/80 transition-colors shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default TimeMachine;
