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

/**
 * Time Machine — Compact satellite timelapse UI.
 * Dark background only wraps the timeline area, keeping the top bar slim.
 */
const TimeMachine: React.FC<TimeMachineProps> = ({ mapRef, lat, lng, projectName, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(waybackYears.length - 1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [direction, setDirection] = useState<'backward' | 'forward'>('backward');
  const [intervalSec, setIntervalSec] = useState(5);
  const [showSettings, setShowSettings] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);

  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rotationRef = useRef<number | null>(null);
  const preloadedRef = useRef<Set<number>>(new Set());
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentYear = waybackYears[currentIndex];

  // ── Preload ALL years ──────────────────────────────────────
  const preloadAllYears = useCallback(() => {
    const zoomLevels = [14, 15, 16];
    const loadForYear = (yearEntry: WaybackYear) => {
      if (preloadedRef.current.has(yearEntry.year)) return;
      zoomLevels.forEach(z => {
        const n = Math.pow(2, z);
        const x = Math.floor(((lng + 180) / 360) * n);
        const latRad = (lat * Math.PI) / 180;
        const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -2; dy <= 2; dy++) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = yearEntry.tileUrl.replace('{z}', String(z)).replace('{y}', String(y + dy)).replace('{x}', String(x + dx));
          }
        }
      });
      preloadedRef.current.add(yearEntry.year);
    };
    const totalYears = waybackYears.length;
    let loaded = 0;
    const loadOrder: number[] = [];
    const startIdx = waybackYears.length - 1;
    for (let offset = 0; offset < totalYears; offset++) {
      if (startIdx - offset >= 0) loadOrder.push(startIdx - offset);
      if (offset > 0 && startIdx + offset < totalYears) loadOrder.push(startIdx + offset);
    }
    loadOrder.forEach((idx, delay) => {
      setTimeout(() => {
        loadForYear(waybackYears[idx]);
        loaded++;
        setPreloadProgress(Math.round((loaded / totalYears) * 100));
      }, delay * 200);
    });
  }, [lat, lng]);

  // ── Fly to project ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    map.flyTo({ center: [lng, lat], zoom: 16, pitch: 60, bearing: map.getBearing(), duration: 2000 });
  }, [mapRef, lat, lng]);

  // ── Camera rotation ────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    if (isPlaying) {
      let bearing = map.getBearing();
      const rotate = () => { bearing = (bearing + 0.15) % 360; map.setBearing(bearing); rotationRef.current = requestAnimationFrame(rotate); };
      rotationRef.current = requestAnimationFrame(rotate);
    } else {
      if (rotationRef.current) { cancelAnimationFrame(rotationRef.current); rotationRef.current = null; }
    }
    return () => { if (rotationRef.current) { cancelAnimationFrame(rotationRef.current); rotationRef.current = null; } };
  }, [mapRef, isPlaying]);

  // ── Apply wayback layer ────────────────────────────────────
  const applyYear = useCallback((yearEntry: WaybackYear, animate = true) => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    if (fadeTimerRef.current) { clearInterval(fadeTimerRef.current); fadeTimerRef.current = null; }
    const NEXT_ID = 'wayback-next', CURRENT_ID = 'wayback-current';
    try { if (map.getLayer(NEXT_ID)) map.removeLayer(NEXT_ID); if (map.getSource(NEXT_ID)) map.removeSource(NEXT_ID); } catch { /**/ }
    map.addSource(NEXT_ID, { type: 'raster', tiles: [yearEntry.tileUrl], tileSize: 256 });
    const firstSymbol = map.getStyle()?.layers?.find((l: any) => l.type === 'symbol');
    map.addLayer({ id: NEXT_ID, type: 'raster', source: NEXT_ID, paint: { 'raster-opacity': 0 } }, firstSymbol?.id);
    if (!animate) {
      map.setPaintProperty(NEXT_ID, 'raster-opacity', 1);
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
        setIsTransitioning(false);
      }
      try { map.setPaintProperty(NEXT_ID, 'raster-opacity', opacity); if (map.getLayer(CURRENT_ID)) map.setPaintProperty(CURRENT_ID, 'raster-opacity', 1 - opacity); } catch { /**/ }
    }, 50);
  }, [mapRef]);

  // ── Init ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    const style = map.getStyle()?.sprite;
    if (style && !String(style).includes('satellite')) {
      map.setStyle('mapbox://styles/mapbox/satellite-streets-v12');
      map.once('style.load', () => { applyYear(currentYear, false); preloadAllYears(); });
    } else {
      setTimeout(() => { applyYear(currentYear, false); preloadAllYears(); }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Ping-pong auto-play ────────────────────────────────────
  useEffect(() => {
    if (tickerRef.current) clearInterval(tickerRef.current);
    if (isPlaying && !isTransitioning) {
      tickerRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          let next = direction === 'backward' ? prev - 1 : prev + 1;
          if (next < 0) { setDirection('forward'); next = 1; }
          else if (next >= waybackYears.length) { setDirection('backward'); next = waybackYears.length - 2; }
          applyYear(waybackYears[next], true);
          return next;
        });
      }, intervalSec * 1000);
    }
    return () => { if (tickerRef.current) clearInterval(tickerRef.current); };
  }, [isPlaying, direction, intervalSec, isTransitioning, applyYear]);

  // ── Cleanup ────────────────────────────────────────────────
  const handleClose = () => {
    setIsPlaying(false);
    if (rotationRef.current) cancelAnimationFrame(rotationRef.current);
    if (tickerRef.current) clearInterval(tickerRef.current);
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
    const map = mapRef.current?.getMap?.();
    if (map) {
      try { ['wayback-current', 'wayback-next'].forEach(id => { if (map.getLayer(id)) map.removeLayer(id); if (map.getSource(id)) map.removeSource(id); }); } catch { /**/ }
      map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
    }
    onClose();
  };

  const step = (dir: 'prev' | 'next') => {
    setIsPlaying(false);
    const nextIdx = dir === 'prev' ? Math.max(0, currentIndex - 1) : Math.min(waybackYears.length - 1, currentIndex + 1);
    if (nextIdx !== currentIndex) { setCurrentIndex(nextIdx); applyYear(waybackYears[nextIdx], true); }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[5500] animate-in slide-in-from-top-2 duration-300">
      {/* ── Slim top bar: project name + controls ──────────── */}
      <div className="flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 bg-slate-900/80 backdrop-blur-md">
        {/* Left: Clock + name */}
        <div className="w-6 h-6 rounded-full bg-indigo-600/80 flex items-center justify-center shrink-0">
          <Clock className="w-3 h-3 text-white" />
        </div>
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

        {/* Controls */}
        <button onClick={() => setIsPlaying(!isPlaying)} className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${isPlaying ? 'bg-amber-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`} title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
        </button>
        <button onClick={() => setShowSettings(!showSettings)} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 shrink-0">
          <Settings className="w-3 h-3" />
        </button>
        <button onClick={handleClose} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-red-500/80 transition-colors shrink-0">
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* ── Timeline area — compact dark frame ────────────── */}
      <div className="flex justify-center px-3 py-1.5">
        <div className="inline-flex flex-col items-center gap-1 bg-slate-900/85 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10 shadow-lg">
          {/* Year + prev/next */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => step('prev')} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
              <SkipBack className="w-3 h-3" />
            </button>
            <div className="bg-indigo-600 rounded-lg px-3 py-0.5 min-w-[60px] text-center">
              <span className="text-base font-black text-white tracking-tight">{currentYear.year}</span>
            </div>
            <button onClick={() => step('next')} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
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

      {/* ── Settings panel (only if open) ─────────────────── */}
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
              <button onClick={() => setDirection(direction === 'backward' ? 'forward' : 'backward')}
                className="px-2 py-0.5 rounded text-[9px] font-black bg-white/10 text-white/70 hover:bg-white/20 transition-all"
              >{direction === 'backward' ? '2026→2014' : '2014→2026'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeMachine;
