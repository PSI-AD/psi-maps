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
 * Time Machine — Auto-playing satellite imagery timelapse.
 * Preloads next year's tiles, fades smoothly between them,
 * and rotates the camera 360° around the selected project.
 */
const TimeMachine: React.FC<TimeMachineProps> = ({ mapRef, lat, lng, projectName, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(waybackYears.length - 1); // start from newest
  const [isPlaying, setIsPlaying] = useState(true);
  const [direction, setDirection] = useState<'backward' | 'forward'>('backward'); // default: go back in time
  const [intervalSec, setIntervalSec] = useState(5);
  const [showSettings, setShowSettings] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rotationRef = useRef<number | null>(null);
  const preloadedRef = useRef<Set<number>>(new Set());

  const currentYear = waybackYears[currentIndex];

  // ── Fly to project + enable 3D + start rotation ───────────
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    // Fly to the project location with 3D tilt
    map.flyTo({
      center: [lng, lat],
      zoom: 16,
      pitch: 60,
      bearing: map.getBearing(),
      duration: 2000,
    });

    // Start slow 360° rotation
    let bearing = map.getBearing();
    const rotate = () => {
      bearing = (bearing + 0.15) % 360;
      map.setBearing(bearing);
      rotationRef.current = requestAnimationFrame(rotate);
    };
    // slight delay so flyTo completes first
    setTimeout(() => {
      rotationRef.current = requestAnimationFrame(rotate);
    }, 2500);

    return () => {
      if (rotationRef.current) cancelAnimationFrame(rotationRef.current);
    };
  }, [mapRef, lat, lng]);

  // ── Apply wayback layer with smooth fade transition ───────────
  const applyYear = useCallback((yearEntry: WaybackYear, animate = true) => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    const NEXT_ID = 'wayback-next';
    const CURRENT_ID = 'wayback-current';

    // Remove old "next" if leftover
    try {
      if (map.getLayer(NEXT_ID)) map.removeLayer(NEXT_ID);
      if (map.getSource(NEXT_ID)) map.removeSource(NEXT_ID);
    } catch { /* */ }

    // Add new year as "next" layer with opacity 0
    map.addSource(NEXT_ID, {
      type: 'raster',
      tiles: [yearEntry.tileUrl],
      tileSize: 256,
    });

    const firstSymbol = map.getStyle()?.layers?.find((l: any) => l.type === 'symbol');
    map.addLayer({
      id: NEXT_ID,
      type: 'raster',
      source: NEXT_ID,
      paint: { 'raster-opacity': 0 },
    }, firstSymbol?.id);

    if (!animate) {
      // Instant swap (no animation)
      map.setPaintProperty(NEXT_ID, 'raster-opacity', 1);
      try {
        if (map.getLayer(CURRENT_ID)) map.removeLayer(CURRENT_ID);
        if (map.getSource(CURRENT_ID)) map.removeSource(CURRENT_ID);
      } catch { /* */ }
      // Rename next → current
      // Mapbox GL doesn't support renaming, so we just leave it as "next"
      // and handle it on the next call
      return;
    }

    // Fade in the new layer over 1.5 seconds
    setIsTransitioning(true);
    let opacity = 0;
    const fadeInterval = setInterval(() => {
      opacity += 0.05;
      if (opacity >= 1) {
        opacity = 1;
        clearInterval(fadeInterval);
        // Remove old current layer
        try {
          if (map.getLayer(CURRENT_ID)) map.removeLayer(CURRENT_ID);
          if (map.getSource(CURRENT_ID)) map.removeSource(CURRENT_ID);
        } catch { /* */ }
        setIsTransitioning(false);
      }
      try {
        map.setPaintProperty(NEXT_ID, 'raster-opacity', opacity);
        // Fade out old current simultaneously
        if (map.getLayer(CURRENT_ID)) {
          map.setPaintProperty(CURRENT_ID, 'raster-opacity', 1 - opacity);
        }
      } catch { /* */ }
    }, 75); // 20 steps × 75ms ≈ 1.5s
  }, [mapRef]);

  // ── Preload tiles for adjacent years ──────────────────────
  const preloadYear = useCallback((yearEntry: WaybackYear) => {
    if (preloadedRef.current.has(yearEntry.year)) return;
    // Create a hidden image tag to trigger tile caching
    const zoomLevels = [14, 15, 16];
    const tileX = Math.floor((lng + 180) / 360 * Math.pow(2, 15));
    const tileY = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, 15));

    zoomLevels.forEach(z => {
      const scale = Math.pow(2, z - 15);
      const x = Math.floor(tileX * scale);
      const y = Math.floor(tileY * scale);
      // Preload center tile + 4 neighbors
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const img = new Image();
          img.src = yearEntry.tileUrl
            .replace('{z}', String(z))
            .replace('{y}', String(y + dy))
            .replace('{x}', String(x + dx));
        }
      }
    });
    preloadedRef.current.add(yearEntry.year);
  }, [lat, lng]);

  // ── Apply initial year ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    // Switch to satellite style if not already
    const style = map.getStyle()?.sprite;
    if (style && !String(style).includes('satellite')) {
      map.setStyle('mapbox://styles/mapbox/satellite-streets-v12');
      map.once('style.load', () => applyYear(currentYear, false));
    } else {
      // Wait a tick for map to be ready
      setTimeout(() => applyYear(currentYear, false), 500);
    }

    // Preload adjacent years
    const prevIdx = Math.max(0, waybackYears.length - 2);
    preloadYear(waybackYears[prevIdx]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-play timer ───────────────────────────────────────
  useEffect(() => {
    if (tickerRef.current) clearInterval(tickerRef.current);

    if (isPlaying && !isTransitioning) {
      tickerRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          const next = direction === 'backward'
            ? prev - 1
            : prev + 1;

          // Bounds check
          if (next < 0 || next >= waybackYears.length) {
            setIsPlaying(false);
            return prev;
          }

          // Apply the new year
          const yearEntry = waybackYears[next];
          applyYear(yearEntry, true);

          // Preload the year after next
          const preloadIdx = direction === 'backward' ? next - 1 : next + 1;
          if (preloadIdx >= 0 && preloadIdx < waybackYears.length) {
            preloadYear(waybackYears[preloadIdx]);
          }

          return next;
        });
      }, intervalSec * 1000);
    }

    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [isPlaying, direction, intervalSec, isTransitioning, applyYear, preloadYear]);

  // ── Cleanup on close ──────────────────────────────────────
  const handleClose = () => {
    setIsPlaying(false);
    if (rotationRef.current) cancelAnimationFrame(rotationRef.current);
    if (tickerRef.current) clearInterval(tickerRef.current);

    // Remove wayback layers
    const map = mapRef.current?.getMap?.();
    if (map) {
      try {
        ['wayback-current', 'wayback-next'].forEach(id => {
          if (map.getLayer(id)) map.removeLayer(id);
          if (map.getSource(id)) map.removeSource(id);
        });
      } catch { /* */ }
      // Reset pitch/bearing gently
      map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
    }
    onClose();
  };

  // Manual step
  const step = (dir: 'prev' | 'next') => {
    setIsPlaying(false);
    const nextIdx = dir === 'prev'
      ? Math.max(0, currentIndex - 1)
      : Math.min(waybackYears.length - 1, currentIndex + 1);
    if (nextIdx !== currentIndex) {
      setCurrentIndex(nextIdx);
      applyYear(waybackYears[nextIdx], true);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[5500] animate-in slide-in-from-top-2 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-xl border-b border-white/10 shadow-2xl">
        {/* Main bar */}
        <div className="flex items-center gap-2 px-3 py-2 lg:px-5 lg:py-3">
          {/* Clock icon */}
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-white" />
          </div>

          {/* Project name */}
          <div className="min-w-0 mr-1">
            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-indigo-400">Time Machine</p>
            <p className="text-[11px] font-bold text-white truncate">{projectName}</p>
          </div>

          {/* Year display */}
          <div className="flex items-center gap-1 mx-auto">
            <button onClick={() => step('prev')} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <div className="bg-indigo-600 rounded-xl px-4 py-1.5 min-w-[80px] text-center">
              <span className="text-xl font-black text-white tracking-tight">{currentYear.year}</span>
            </div>

            <button onClick={() => step('next')} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isPlaying ? 'bg-amber-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-red-500/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Year dots visualization */}
        <div className="flex items-center justify-center gap-1 pb-2 px-3">
          {waybackYears.map((y, i) => (
            <button
              key={y.year}
              onClick={() => {
                setIsPlaying(false);
                setCurrentIndex(i);
                applyYear(y, true);
              }}
              className="flex flex-col items-center gap-0.5"
            >
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === currentIndex ? 'bg-indigo-400 scale-125 shadow-lg shadow-indigo-400/50' :
                i < currentIndex ? 'bg-white/50' : 'bg-white/20'
              }`} />
              <span className={`text-[7px] font-bold transition-colors ${
                i === currentIndex ? 'text-indigo-300' : 'text-white/30'
              }`}>{y.year}</span>
            </button>
          ))}
        </div>

        {/* Date subtitle */}
        <div className="text-center pb-2">
          <span className="text-[9px] font-bold text-indigo-300/80 uppercase tracking-wider">
            {isTransitioning ? 'Loading...' : `Imagery from ${currentYear.date}`}
          </span>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="border-t border-white/10 px-4 py-3 flex items-center justify-center gap-6 animate-in fade-in duration-200">
            {/* Speed */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Speed</span>
              {[3, 5, 7, 10].map(s => (
                <button
                  key={s}
                  onClick={() => setIntervalSec(s)}
                  className={`px-2 py-1 rounded-md text-[10px] font-black transition-all ${
                    intervalSec === s
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  {s}s
                </button>
              ))}
            </div>

            {/* Direction */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Direction</span>
              <button
                onClick={() => setDirection(direction === 'backward' ? 'forward' : 'backward')}
                className="px-3 py-1 rounded-md text-[10px] font-black bg-white/10 text-white/80 hover:bg-white/20 transition-all"
              >
                {direction === 'backward' ? '2026 → 2014' : '2014 → 2026'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeMachine;
