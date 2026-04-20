import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, Settings, Loader2, RotateCcw } from 'lucide-react';
import { waybackYears, WaybackYear } from '../data/waybackYears';

interface TimeMachineProps {
  mapRef: React.MutableRefObject<any>;
  lat: number;
  lng: number;
  projectName: string;
  onClose: () => void;
}

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
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const img = new Image();
      img.src = tileUrl.replace('{z}', String(z)).replace('{y}', String(y + dy)).replace('{x}', String(x + dx));
    }
  }
}

const WAYBACK_PREFIX = 'wayback-';
const TARGET_PITCH = 60;

// Rotation increments per RAF frame (≈60fps).
// Original was 0.15°/frame. Reduced by 25% → 0.1125°/frame.
// Orbit speed levels: slow, normal, fast (all 25% lower than before)
const ORBIT_SPEEDS: Record<string, number> = {
  slow:   0.0563,  // ~50% of original
  normal: 0.1125,  // 75% of original (−25%)
  fast:   0.1688,  // 112.5% of original but still 25% less than "double"
};

const TimeMachine: React.FC<TimeMachineProps> = ({ mapRef, lat, lng, projectName, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(waybackYears.length - 1);
  // isPlaying controls the year slideshow ticker
  const [isPlaying, setIsPlaying] = useState(true);
  const [direction, setDirection] = useState<'backward' | 'forward'>('backward');
  const [intervalSec, setIntervalSec] = useState(5);
  const [showSettings, setShowSettings] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoadingTile, setIsLoadingTile] = useState(false);
  // isOrbitActive controls the 3D rotation — fully independent from isPlaying
  const [isOrbitActive, setIsOrbitActive] = useState(true);
  const [orbitSpeed, setOrbitSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');

  // Track whether user explicitly paused to prevent ticker from overriding it
  const userPausedRef = useRef(false);

  const tickerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotationRef = useRef<number | null>(null);
  const preloadedRef = useRef<Set<number>>(new Set());
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settingsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const activeOverlayRef = useRef<{ layerId: string | null; sourceId: string | null }>({ layerId: null, sourceId: null });
  const overlaySerialRef = useRef(0);
  // Keep a live ref of isOrbitActive so the rotation loop can read it without stale closure
  const isOrbitActiveRef = useRef(true);
  const orbitSpeedRef = useRef<'slow' | 'normal' | 'fast'>('normal');

  const currentYear = waybackYears[currentIndex];

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Keep refs in sync with state
  useEffect(() => { isOrbitActiveRef.current = isOrbitActive; }, [isOrbitActive]);
  useEffect(() => { orbitSpeedRef.current = orbitSpeed; }, [orbitSpeed]);

  const dispatchRotate = useCallback((active: boolean) => {
    window.dispatchEvent(new CustomEvent('time-machine-rotation', { detail: { active } }));
  }, []);

  const removeOverlay = useCallback((map: any, layerId?: string | null, sourceId?: string | null) => {
    if (!map) return;
    try {
      if (layerId && map.getLayer(layerId)) map.removeLayer(layerId);
    } catch { /**/ }
    try {
      if (sourceId && map.getSource(sourceId)) map.removeSource(sourceId);
    } catch { /**/ }
  }, []);

  const cleanupWaybackArtifacts = useCallback((map: any) => {
    if (!map?.getStyle) return;
    const style = map.getStyle();
    const layerIds = (style?.layers ?? [])
      .map((layer: any) => layer.id)
      .filter((id: string) => id.startsWith(WAYBACK_PREFIX));
    const sourceIds = Object.keys(style?.sources ?? {}).filter(id => id.startsWith(WAYBACK_PREFIX));

    layerIds.forEach((id: string) => {
      try { if (map.getLayer(id)) map.removeLayer(id); } catch { /**/ }
    });
    sourceIds.forEach((id: string) => {
      try { if (map.getSource(id)) map.removeSource(id); } catch { /**/ }
    });
    activeOverlayRef.current = { layerId: null, sourceId: null };
  }, []);

  const applyYear = useCallback((yearEntry: WaybackYear, animate = true) => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    if (!map.isStyleLoaded()) {
      map.once('style.load', () => applyYear(yearEntry, animate));
      return;
    }

    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }

    const previousOverlay = activeOverlayRef.current;
    const overlayKey = `${yearEntry.year}-${++overlaySerialRef.current}`;
    const sourceId = `${WAYBACK_PREFIX}source-${overlayKey}`;
    const layerId = `${WAYBACK_PREFIX}layer-${overlayKey}`;
    const symbolLayerId = map.getStyle()?.layers?.find((layer: any) => layer.type === 'symbol')?.id;

    try {
      map.addSource(sourceId, {
        type: 'raster',
        tiles: [`${yearEntry.tileUrl}?release=${yearEntry.releaseNum}`],
        tileSize: 256,
      });
      map.addLayer(
        {
          id: layerId,
          type: 'raster',
          source: sourceId,
          paint: { 'raster-opacity': animate && previousOverlay.layerId ? 0 : 1 },
        },
        symbolLayerId,
      );
    } catch {
      removeOverlay(map, layerId, sourceId);
      return;
    }

    activeOverlayRef.current = { layerId, sourceId };

    if (!animate || !previousOverlay.layerId) {
      removeOverlay(map, previousOverlay.layerId, previousOverlay.sourceId);
      if (isMountedRef.current) setIsTransitioning(false);
      return;
    }

    setIsTransitioning(true);
    let opacity = 0;
    fadeTimerRef.current = setInterval(() => {
      opacity += 0.08;

      try {
        map.setPaintProperty(layerId, 'raster-opacity', Math.min(opacity, 1));
        if (previousOverlay.layerId && map.getLayer(previousOverlay.layerId)) {
          map.setPaintProperty(previousOverlay.layerId, 'raster-opacity', Math.max(1 - opacity, 0));
        }
      } catch { /**/ }

      if (opacity < 1) return;

      if (fadeTimerRef.current) {
        clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
      removeOverlay(map, previousOverlay.layerId, previousOverlay.sourceId);
      if (isMountedRef.current) setIsTransitioning(false);
    }, 40);
  }, [mapRef, removeOverlay]);

  const handleClose = useCallback(() => {
    isMountedRef.current = false;
    window.dispatchEvent(new CustomEvent('time-machine-active', { detail: { active: false } }));
    window.dispatchEvent(new CustomEvent('time-machine-open', { detail: { active: false } }));
    dispatchRotate(false);

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (tickerRef.current) clearTimeout(tickerRef.current);
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
    if (rotationRef.current) cancelAnimationFrame(rotationRef.current);

    const mapView = mapRef.current;
    const rawMap = mapView?.getMap?.();
    if (rawMap) {
      cleanupWaybackArtifacts(rawMap);
      try {
        mapView.easeTo({ pitch: 0, bearing: 0, duration: 1000, essential: true });
      } catch { /**/ }
    }

    onClose();
  }, [cleanupWaybackArtifacts, dispatchRotate, mapRef, onClose]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!isPlaying) {
      idleTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) handleClose();
      }, 15000);
    }
  }, [handleClose, isPlaying]);

  // Settings auto-close after 15s (extended from 10s), reset on any interaction
  const resetSettingsTimer = useCallback(() => {
    if (settingsTimerRef.current) clearTimeout(settingsTimerRef.current);
    if (showSettings) {
      settingsTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) setShowSettings(false);
      }, 15000);
    }
  }, [showSettings]);

  useEffect(() => {
    resetSettingsTimer();
    return () => {
      if (settingsTimerRef.current) clearTimeout(settingsTimerRef.current);
    };
  }, [resetSettingsTimer]);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('time-machine-active', { detail: { active: isPlaying } }));
  }, [isPlaying]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('time-machine-open', { detail: { active: true } }));
    return () => {
      window.dispatchEvent(new CustomEvent('time-machine-open', { detail: { active: false } }));
      window.dispatchEvent(new CustomEvent('time-machine-rotation', { detail: { active: false } }));
    };
  }, []);

  // External toggle-rotation event support
  useEffect(() => {
    const handleToggleRotation = (e: Event) => {
      const requestedState = (e as CustomEvent).detail?.active;
      setIsOrbitActive(prev => typeof requestedState === 'boolean' ? requestedState : !prev);
      resetIdleTimer();
    };

    window.addEventListener('time-machine-toggle-rotation', handleToggleRotation);
    return () => window.removeEventListener('time-machine-toggle-rotation', handleToggleRotation);
  }, [resetIdleTimer]);

  // ── Orbit / 3D rotation loop ──────────────────────────────────────────────
  // The orbit is INDEPENDENT of isPlaying (year slideshow).
  // It ALWAYS enforces TARGET_PITCH (3D) while active.
  useEffect(() => {
    if (!isOrbitActive) {
      if (rotationRef.current) {
        cancelAnimationFrame(rotationRef.current);
        rotationRef.current = null;
      }
      dispatchRotate(false);
      return;
    }

    let retries = 0;
    const startupDelay = setTimeout(() => {
      const tryStart = () => {
        const mapView = mapRef.current;
        const rawMap = mapView?.getMap?.();
        if (!mapView || !rawMap) {
          if (retries++ < 20) setTimeout(tryStart, 150);
          return;
        }

        if (rotationRef.current) cancelAnimationFrame(rotationRef.current);

        let bearing = 0;
        try { bearing = rawMap.getBearing(); } catch { /**/ }

        const rotate = () => {
          if (!isMountedRef.current) return;
          // If orbit was toggled off, stop
          if (!isOrbitActiveRef.current) {
            rotationRef.current = null;
            dispatchRotate(false);
            return;
          }
          try {
            const increment = ORBIT_SPEEDS[orbitSpeedRef.current] ?? ORBIT_SPEEDS.normal;
            bearing = (bearing + increment) % 360;
            // Always keep pitch at TARGET_PITCH while orbiting (enforces 3D)
            mapView.easeTo({ bearing, pitch: TARGET_PITCH, duration: 0, essential: true });
          } catch { /**/ }
          rotationRef.current = requestAnimationFrame(rotate);
        };

        rotationRef.current = requestAnimationFrame(rotate);
        dispatchRotate(true);
      };

      tryStart();
    }, 1500); // reduced from 2500ms for faster startup

    return () => {
      clearTimeout(startupDelay);
      if (rotationRef.current) {
        cancelAnimationFrame(rotationRef.current);
        rotationRef.current = null;
      }
      dispatchRotate(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOrbitActive, dispatchRotate, mapRef]);

  // ── Initial 3D fly-to on mount ────────────────────────────────────────────
  useEffect(() => {
    const mapView = mapRef.current;
    const rawMap = mapView?.getMap?.();
    if (!mapView || !rawMap) return;
    mapView.flyTo({
      center: [lng, lat],
      zoom: 16,
      pitch: TARGET_PITCH,   // always start in 3D
      bearing: rawMap.getBearing(),
      duration: 2000,
      essential: true,
    });
  // Run once on mount
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

    order.forEach((idx, i) => {
      setTimeout(() => {
        const yearEntry = waybackYears[idx];
        if (!preloadedRef.current.has(yearEntry.year)) {
          preloadSurrounding(yearEntry.tileUrl, 16, lat, lng);
          preloadSurrounding(yearEntry.tileUrl, 15, lat, lng);
          preloadedRef.current.add(yearEntry.year);
        }
      }, i * 300);
    });
  }, [lat, lng]);

  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    const sprite = map.getStyle()?.sprite;
    const isSatellite = sprite && String(sprite).includes('satellite');
    const init = () => {
      cleanupWaybackArtifacts(map);
      applyYear(currentYear, false);
      preloadAll();
    };

    if (!isSatellite) {
      map.setStyle('mapbox://styles/mapbox/satellite-streets-v12');
      map.once('style.load', () => setTimeout(init, 300));
      return;
    }

    setTimeout(init, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectYear = useCallback((nextIndex: number, keepPlaying = false) => {
    const nextYear = waybackYears[nextIndex];
    setCurrentIndex(nextIndex);
    setIsLoadingTile(true);
    // Only resume playing from ticker if user hasn't manually paused
    if (keepPlaying && !userPausedRef.current) {
      setIsPlaying(true);
    } else if (!keepPlaying) {
      setIsPlaying(false);
    }
    applyYear(nextYear, true);
    preloadTileAndWait(nextYear.tileUrl, 16, lat, lng).finally(() => {
      if (!isMountedRef.current) return;
      setIsLoadingTile(false);
    });
  }, [applyYear, lat, lng]);

  // ── Year ticker ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (tickerRef.current) clearTimeout(tickerRef.current);
    if (!isPlaying || isTransitioning || isLoadingTile) return;

    tickerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      // If user paused while timeout was pending, respect it
      if (userPausedRef.current) return;

      let next = direction === 'backward' ? currentIndex - 1 : currentIndex + 1;
      if (next < 0) {
        setDirection('forward');
        next = 1;
      } else if (next >= waybackYears.length) {
        setDirection('backward');
        next = waybackYears.length - 2;
      }

      selectYear(next, true);
    }, intervalSec * 1000);

    return () => {
      if (tickerRef.current) clearTimeout(tickerRef.current);
    };
  }, [currentIndex, direction, intervalSec, isLoadingTile, isPlaying, isTransitioning, selectYear]);

  const playDir = (dir: 'backward' | 'forward') => {
    userPausedRef.current = false;
    setDirection(dir);
    setIsPlaying(true);
    resetIdleTimer();
  };

  const togglePlayPause = () => {
    const next = !isPlaying;
    userPausedRef.current = !next; // if pausing → mark as user-paused
    if (tickerRef.current) {
      clearTimeout(tickerRef.current);
      tickerRef.current = null;
    }
    setIsPlaying(next);
    resetIdleTimer();
  };

  const toggleOrbit = () => {
    setIsOrbitActive(prev => {
      const next = !prev;
      // When turning orbit on, ensure we snap back to 3D
      if (next) {
        const mapView = mapRef.current;
        try {
          mapView?.easeTo({ pitch: TARGET_PITCH, duration: 500, essential: true });
        } catch { /**/ }
      }
      return next;
    });
    resetIdleTimer();
    resetSettingsTimer();
  };

  const handleSettingsClick = () => {
    setShowSettings(prev => !prev);
    resetIdleTimer();
  };

  // Small reusable icon button
  const Btn = ({
    onClick,
    active,
    title,
    children,
    danger,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
    danger?: boolean;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all ${
        danger
          ? 'bg-white/10 text-white/60 hover:bg-red-500/80 hover:text-white'
          : active
          ? 'bg-indigo-600 text-white'
          : 'bg-white/10 text-white/70 hover:bg-white/20'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div
      className="fixed left-3 z-[6200] flex flex-col items-start gap-1.5 animate-in slide-in-from-bottom-2 duration-300"
      style={{ bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 12px) + 68px)' }}
    >
      {/* ── Settings Panel ───────────────────────────────────────────────── */}
      {showSettings && (
        <div
          className="w-[320px] max-w-[calc(100vw-24px)] animate-in fade-in slide-in-from-bottom-1 duration-200"
          onMouseMove={resetSettingsTimer}
          onClick={resetSettingsTimer}
        >
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-900/92 px-3 py-2.5 shadow-lg backdrop-blur-md">
            {/* Slideshow speed */}
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Slide</span>
            {[3, 5, 7, 10].map(seconds => (
              <button
                key={seconds}
                onClick={() => { setIntervalSec(seconds); resetSettingsTimer(); }}
                className={`rounded px-1.5 py-0.5 text-[10px] font-black transition-all ${
                  intervalSec === seconds ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/55 hover:bg-white/20'
                }`}
              >
                {seconds}s
              </button>
            ))}

            <div className="h-4 w-px bg-white/10" />

            {/* Direction */}
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Dir</span>
            <button
              onClick={() => { setDirection(prev => prev === 'backward' ? 'forward' : 'backward'); resetSettingsTimer(); }}
              className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-black text-white/70 transition-all hover:bg-white/20"
            >
              {direction === 'backward' ? '2026→2014' : '2014→2026'}
            </button>

            {/* Full-width divider */}
            <div className="w-full h-px bg-white/10 my-0.5" />

            {/* Orbit speed */}
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Rotate</span>
            {(['slow', 'normal', 'fast'] as const).map(speed => (
              <button
                key={speed}
                onClick={() => { setOrbitSpeed(speed); resetSettingsTimer(); }}
                className={`rounded px-1.5 py-0.5 text-[10px] font-black capitalize transition-all ${
                  orbitSpeed === speed ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/55 hover:bg-white/20'
                }`}
              >
                {speed}
              </button>
            ))}

            <div className="h-4 w-px bg-white/10" />

            {/* 3D pitch label */}
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">View</span>
            <button
              onClick={() => {
                // Snap map back to 3D pitch
                const mapView = mapRef.current;
                try { mapView?.easeTo({ pitch: TARGET_PITCH, duration: 500, essential: true }); } catch { /**/ }
                resetSettingsTimer();
              }}
              className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-black text-white/70 transition-all hover:bg-white/20"
            >
              3D ({TARGET_PITCH}°)
            </button>
          </div>
        </div>
      )}

      {/* ── Main Control Bar ─────────────────────────────────────────────── */}
      <div
        className="w-[320px] max-w-[calc(100vw-24px)] rounded-xl border border-white/10 bg-slate-900/88 px-2.5 py-2 shadow-xl backdrop-blur-md"
        onMouseMove={resetIdleTimer}
      >
        <div className="flex items-center gap-1.5">
          {/* Play backwards */}
          <button
            onClick={() => playDir('backward')}
            className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-white transition-colors ${
              isPlaying && direction === 'backward' ? 'bg-indigo-600' : 'bg-white/10 hover:bg-white/20'
            }`}
            title="Play backwards (2026 → 2014)"
          >
            <SkipBack className="h-3 w-3" />
          </button>

          {/* Year badge */}
          <div className="relative min-w-[58px] shrink-0 rounded-lg bg-indigo-600 px-2.5 py-1 text-center">
            <span className="text-sm font-black leading-none tracking-tight text-white">{currentYear.year}</span>
            {isLoadingTile && (
              <Loader2 className="absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-white/85" />
            )}
          </div>

          {/* Play forwards */}
          <button
            onClick={() => playDir('forward')}
            className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-white transition-colors ${
              isPlaying && direction === 'forward' ? 'bg-indigo-600' : 'bg-white/10 hover:bg-white/20'
            }`}
            title="Play forwards (2014 → 2026)"
          >
            <SkipForward className="h-3 w-3" />
          </button>

          <div className="h-4 w-px shrink-0 bg-white/15" />

          {/* Play / Pause slideshow */}
          <Btn
            onClick={togglePlayPause}
            active={isPlaying}
            title={isPlaying ? 'Pause slideshow' : 'Resume slideshow'}
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
          </Btn>

          {/* Orbit / Rotation toggle */}
          <Btn
            onClick={toggleOrbit}
            active={isOrbitActive}
            title={isOrbitActive ? 'Stop 3D rotation' : 'Start 3D rotation'}
          >
            <RotateCcw className="h-3 w-3" />
          </Btn>

          {/* Settings */}
          <Btn onClick={handleSettingsClick} active={showSettings} title="Speed & Direction settings">
            <Settings className="h-3 w-3" />
          </Btn>

          {/* Close */}
          <Btn onClick={handleClose} title={`Close Time Machine for ${projectName}`} danger>
            <X className="h-3 w-3" />
          </Btn>
        </div>

        {/* Year dots timeline */}
        <div className="mt-2 flex items-center justify-center gap-1">
          {waybackYears.map((yearEntry, index) => (
            <button
              key={yearEntry.year}
              onClick={() => {
                userPausedRef.current = false;
                selectYear(index, false);
                resetIdleTimer();
              }}
              className="flex h-4 w-4 items-center justify-center"
              title={String(yearEntry.year)}
            >
              <div
                className={`rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'h-2.5 w-2.5 bg-indigo-400 shadow-lg shadow-indigo-400/40'
                    : index < currentIndex
                      ? 'h-1.5 w-1.5 bg-white/45'
                      : 'h-1.5 w-1.5 bg-white/18'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Status label */}
        <div className="mt-1 text-center">
          <span className="text-[6px] font-bold uppercase tracking-[0.18em] text-white/35">
            {isOrbitActive
              ? isPlaying
                ? `3D · ${direction === 'backward' ? 'back in time' : 'forward in time'}`
                : `3D rotation · ${currentYear.date}`
              : isPlaying
                ? direction === 'backward' ? 'back in time' : 'forward in time'
                : currentYear.date}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TimeMachine;
