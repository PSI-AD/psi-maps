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
 *
 * Key features:
 *  1. Aggressive preloading: ALL years + surrounding tiles loaded upfront
 *  2. Ping-pong playback: bounces between oldest ↔ newest continuously
 *  3. Auto-rotates the camera 360° while playing
 *  4. Smooth cross-fade between years
 *  5. Centred year + nav controls above the timeline dots
 */
const TimeMachine: React.FC<TimeMachineProps> = ({ mapRef, lat, lng, projectName, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(waybackYears.length - 1); // start newest
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

  // ── Aggressive preloading: ALL years, all visible tiles ────────────────
  const preloadAllYears = useCallback(() => {
    // For each zoom level we care about, compute the tile x/y for the project centre
    const zoomLevels = [14, 15, 16];

    const loadForYear = (yearEntry: WaybackYear) => {
      if (preloadedRef.current.has(yearEntry.year)) return;

      zoomLevels.forEach(z => {
        const n = Math.pow(2, z);
        const x = Math.floor(((lng + 180) / 360) * n);
        const latRad = (lat * Math.PI) / 180;
        const y = Math.floor(
          ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
        );

        // Preload a 5×5 grid around centre (25 tiles per zoom = 75 tiles/year)
        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -2; dy <= 2; dy++) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = yearEntry.tileUrl
              .replace('{z}', String(z))
              .replace('{y}', String(y + dy))
              .replace('{x}', String(x + dx));
          }
        }
      });

      preloadedRef.current.add(yearEntry.year);
    };

    // Load ALL years in a staggered fashion (closest years first, then outward)
    const totalYears = waybackYears.length;
    let loaded = 0;

    // Start from current index and work outward
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
      }, delay * 200); // stagger 200ms apart to avoid overwhelming network
    });
  }, [lat, lng]);

  // ── Fly to project + enable 3D ─────────────────────────────
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    map.flyTo({
      center: [lng, lat],
      zoom: 16,
      pitch: 60,
      bearing: map.getBearing(),
      duration: 2000,
    });
  }, [mapRef, lat, lng]);

  // ── Camera rotation (runs when isPlaying) ──────────────────
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    if (isPlaying) {
      let bearing = map.getBearing();
      const rotate = () => {
        bearing = (bearing + 0.15) % 360;
        map.setBearing(bearing);
        rotationRef.current = requestAnimationFrame(rotate);
      };
      rotationRef.current = requestAnimationFrame(rotate);
    } else {
      if (rotationRef.current) {
        cancelAnimationFrame(rotationRef.current);
        rotationRef.current = null;
      }
    }

    return () => {
      if (rotationRef.current) {
        cancelAnimationFrame(rotationRef.current);
        rotationRef.current = null;
      }
    };
  }, [mapRef, isPlaying]);

  // ── Apply wayback layer with smooth cross-fade ─────────────
  const applyYear = useCallback(
    (yearEntry: WaybackYear, animate = true) => {
      const map = mapRef.current?.getMap?.();
      if (!map) return;

      // Clear any ongoing fade
      if (fadeTimerRef.current) {
        clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }

      const NEXT_ID = 'wayback-next';
      const CURRENT_ID = 'wayback-current';

      // Remove stale "next" layer
      try {
        if (map.getLayer(NEXT_ID)) map.removeLayer(NEXT_ID);
        if (map.getSource(NEXT_ID)) map.removeSource(NEXT_ID);
      } catch {
        /* */
      }

      // Add new year
      map.addSource(NEXT_ID, {
        type: 'raster',
        tiles: [yearEntry.tileUrl],
        tileSize: 256,
      });

      const firstSymbol = map.getStyle()?.layers?.find((l: any) => l.type === 'symbol');
      map.addLayer(
        { id: NEXT_ID, type: 'raster', source: NEXT_ID, paint: { 'raster-opacity': 0 } },
        firstSymbol?.id
      );

      if (!animate) {
        map.setPaintProperty(NEXT_ID, 'raster-opacity', 1);
        try {
          if (map.getLayer(CURRENT_ID)) map.removeLayer(CURRENT_ID);
          if (map.getSource(CURRENT_ID)) map.removeSource(CURRENT_ID);
        } catch {
          /* */
        }
        return;
      }

      // Cross-fade: 20 steps × 50ms = 1s total
      setIsTransitioning(true);
      let opacity = 0;
      fadeTimerRef.current = setInterval(() => {
        opacity += 0.05;
        if (opacity >= 1) {
          opacity = 1;
          if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
          fadeTimerRef.current = null;
          try {
            if (map.getLayer(CURRENT_ID)) map.removeLayer(CURRENT_ID);
            if (map.getSource(CURRENT_ID)) map.removeSource(CURRENT_ID);
          } catch {
            /* */
          }
          setIsTransitioning(false);
        }
        try {
          map.setPaintProperty(NEXT_ID, 'raster-opacity', opacity);
          if (map.getLayer(CURRENT_ID)) {
            map.setPaintProperty(CURRENT_ID, 'raster-opacity', 1 - opacity);
          }
        } catch {
          /* */
        }
      }, 50);
    },
    [mapRef]
  );

  // ── Apply initial year + start preloading ALL ──────────────
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    const style = map.getStyle()?.sprite;
    if (style && !String(style).includes('satellite')) {
      map.setStyle('mapbox://styles/mapbox/satellite-streets-v12');
      map.once('style.load', () => {
        applyYear(currentYear, false);
        preloadAllYears();
      });
    } else {
      setTimeout(() => {
        applyYear(currentYear, false);
        preloadAllYears();
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-play timer with PING-PONG bounce ──────────────────
  useEffect(() => {
    if (tickerRef.current) clearInterval(tickerRef.current);

    if (isPlaying && !isTransitioning) {
      tickerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          let next = direction === 'backward' ? prev - 1 : prev + 1;

          // Ping-pong: reverse at boundaries
          if (next < 0) {
            setDirection('forward');
            next = 1; // bounce forward from index 0
          } else if (next >= waybackYears.length) {
            setDirection('backward');
            next = waybackYears.length - 2; // bounce backward from last
          }

          applyYear(waybackYears[next], true);
          return next;
        });
      }, intervalSec * 1000);
    }

    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [isPlaying, direction, intervalSec, isTransitioning, applyYear]);

  // ── Cleanup on close ───────────────────────────────────────
  const handleClose = () => {
    setIsPlaying(false);
    if (rotationRef.current) cancelAnimationFrame(rotationRef.current);
    if (tickerRef.current) clearInterval(tickerRef.current);
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);

    const map = mapRef.current?.getMap?.();
    if (map) {
      try {
        ['wayback-current', 'wayback-next'].forEach((id) => {
          if (map.getLayer(id)) map.removeLayer(id);
          if (map.getSource(id)) map.removeSource(id);
        });
      } catch {
        /* */
      }
      map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
    }
    onClose();
  };

  // Manual step
  const step = (dir: 'prev' | 'next') => {
    setIsPlaying(false);
    const nextIdx = dir === 'prev' ? Math.max(0, currentIndex - 1) : Math.min(waybackYears.length - 1, currentIndex + 1);
    if (nextIdx !== currentIndex) {
      setCurrentIndex(nextIdx);
      applyYear(waybackYears[nextIdx], true);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[5500] animate-in slide-in-from-top-2 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-xl border-b border-white/10 shadow-2xl">
        {/* Main bar — project name + status left, controls right */}
        <div className="flex items-center gap-2 px-3 py-2 lg:px-5 lg:py-3">
          {/* Clock icon */}
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-white" />
          </div>

          {/* Project name */}
          <div className="min-w-0 mr-auto">
            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-indigo-400">Time Machine</p>
            <p className="text-[11px] font-bold text-white truncate">{projectName}</p>
          </div>

          {/* Preload progress indicator */}
          {preloadProgress < 100 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${preloadProgress}%` }}
                />
              </div>
              <span className="text-[8px] font-bold text-white/40">{preloadProgress}%</span>
            </div>
          )}

          {/* Play / Settings / Close */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isPlaying ? 'bg-amber-500 text-white animate-pulse' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title={isPlaying ? 'Pause' : 'Play'}
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

        {/* ── Centred year + prev/next buttons ──────────────────── */}
        <div className="flex flex-col items-center gap-1.5 pb-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => step('prev')}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <div className="bg-indigo-600 rounded-xl px-5 py-1.5 min-w-[90px] text-center shadow-lg shadow-indigo-600/30">
              <span className="text-2xl font-black text-white tracking-tight">{currentYear.year}</span>
            </div>

            <button
              onClick={() => step('next')}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Direction indicator */}
          <span className="text-[8px] font-bold text-indigo-300/60 uppercase tracking-wider">
            {isPlaying
              ? direction === 'backward'
                ? '← Going back in time'
                : 'Going forward in time →'
              : `Imagery from ${currentYear.date}`}
          </span>
        </div>

        {/* ── Year dots timeline — centred below buttons ──────── */}
        <div className="flex items-center justify-center gap-1 pb-2.5 px-3">
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
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? 'bg-indigo-400 scale-125 shadow-lg shadow-indigo-400/50'
                    : i < currentIndex
                    ? 'bg-white/50'
                    : 'bg-white/20'
                }`}
              />
              <span
                className={`text-[7px] font-bold transition-colors ${
                  i === currentIndex ? 'text-indigo-300' : 'text-white/30'
                }`}
              >
                {y.year}
              </span>
            </button>
          ))}
        </div>

        {/* ── Settings panel ──────────────────────────────────── */}
        {showSettings && (
          <div className="border-t border-white/10 px-4 py-3 flex items-center justify-center gap-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Speed</span>
              {[3, 5, 7, 10].map((s) => (
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
