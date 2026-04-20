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
// Rotation increment per RAF frame (~60fps). Original was 0.15°/frame. Reduced by 25% → 0.1125°/frame.
const ORBIT_SPEED = 0.1125;

// ── Map interaction lock helpers ─────────────────────────────────────────────
function lockMap(map: any) {
  try { map.scrollZoom.disable(); } catch { /**/ }
  try { map.dragPan.disable(); } catch { /**/ }
  try { map.dragRotate.disable(); } catch { /**/ }
  try { map.touchZoomRotate.disable(); } catch { /**/ }
  try { map.keyboard.disable(); } catch { /**/ }
  try { map.doubleClickZoom.disable(); } catch { /**/ }
}

function unlockMap(map: any) {
  try { map.scrollZoom.enable(); } catch { /**/ }
  try { map.dragPan.enable(); } catch { /**/ }
  try { map.dragRotate.enable(); } catch { /**/ }
  try { map.touchZoomRotate.enable(); } catch { /**/ }
  try { map.keyboard.enable(); } catch { /**/ }
  try { map.doubleClickZoom.enable(); } catch { /**/ }
}

const TimeMachine: React.FC<TimeMachineProps> = ({ mapRef, lat, lng, projectName, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(waybackYears.length - 1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [direction, setDirection] = useState<'backward' | 'forward'>('backward');
  const [intervalSec, setIntervalSec] = useState(5);
  const [showSettings, setShowSettings] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoadingTile, setIsLoadingTile] = useState(false);
  // Orbit is independent from slideshow playback
  const [isOrbitActive, setIsOrbitActive] = useState(true);

  // Refs for timers & RAF
  const tickerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotationRef = useRef<number | null>(null);
  const preloadedRef = useRef<Set<number>>(new Set());
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settingsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const activeOverlayRef = useRef<{ layerId: string | null; sourceId: string | null }>({ layerId: null, sourceId: null });
  const overlaySerialRef = useRef(0);
  // Live refs so rotation RAF reads current values without stale closures
  const isOrbitActiveRef = useRef(true);
  const isPlayingRef = useRef(true);
  const mapLockedRef = useRef(false);

  const currentYear = waybackYears[currentIndex];

  // ── Sync live refs ────────────────────────────────────────────────────────
  useEffect(() => { isOrbitActiveRef.current = isOrbitActive; }, [isOrbitActive]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // ── Map lock/unlock while playing ─────────────────────────────────────────
  useEffect(() => {
    const rawMap = mapRef.current?.getMap?.();
    if (!rawMap) return;
    if (isPlaying && !mapLockedRef.current) {
      lockMap(rawMap);
      mapLockedRef.current = true;
    } else if (!isPlaying && mapLockedRef.current) {
      unlockMap(rawMap);
      mapLockedRef.current = false;
    }
  }, [isPlaying, mapRef]);

  const dispatchRotate = useCallback((active: boolean) => {
    window.dispatchEvent(new CustomEvent('time-machine-rotation', { detail: { active } }));
  }, []);

  const removeOverlay = useCallback((map: any, layerId?: string | null, sourceId?: string | null) => {
    if (!map) return;
    try { if (layerId && map.getLayer(layerId)) map.removeLayer(layerId); } catch { /**/ }
    try { if (sourceId && map.getSource(sourceId)) map.removeSource(sourceId); } catch { /**/ }
  }, []);

  const cleanupWaybackArtifacts = useCallback((map: any) => {
    if (!map?.getStyle) return;
    const style = map.getStyle();
    const layerIds = (style?.layers ?? []).map((l: any) => l.id).filter((id: string) => id.startsWith(WAYBACK_PREFIX));
    const sourceIds = Object.keys(style?.sources ?? {}).filter(id => id.startsWith(WAYBACK_PREFIX));
    layerIds.forEach((id: string) => { try { if (map.getLayer(id)) map.removeLayer(id); } catch { /**/ } });
    sourceIds.forEach((id: string) => { try { if (map.getSource(id)) map.removeSource(id); } catch { /**/ } });
    activeOverlayRef.current = { layerId: null, sourceId: null };
  }, []);

  const applyYear = useCallback((yearEntry: WaybackYear, animate = true) => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    if (!map.isStyleLoaded()) {
      map.once('style.load', () => applyYear(yearEntry, animate));
      return;
    }

    if (fadeTimerRef.current) { clearInterval(fadeTimerRef.current); fadeTimerRef.current = null; }

    const previousOverlay = activeOverlayRef.current;
    const overlayKey = `${yearEntry.year}-${++overlaySerialRef.current}`;
    const sourceId = `${WAYBACK_PREFIX}source-${overlayKey}`;
    const layerId = `${WAYBACK_PREFIX}layer-${overlayKey}`;
    const symbolLayerId = map.getStyle()?.layers?.find((l: any) => l.type === 'symbol')?.id;

    try {
      map.addSource(sourceId, { type: 'raster', tiles: [`${yearEntry.tileUrl}?release=${yearEntry.releaseNum}`], tileSize: 256 });
      map.addLayer({ id: layerId, type: 'raster', source: sourceId, paint: { 'raster-opacity': animate && previousOverlay.layerId ? 0 : 1 } }, symbolLayerId);
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
      if (fadeTimerRef.current) { clearInterval(fadeTimerRef.current); fadeTimerRef.current = null; }
      removeOverlay(map, previousOverlay.layerId, previousOverlay.sourceId);
      if (isMountedRef.current) setIsTransitioning(false);
    }, 40);
  }, [mapRef, removeOverlay]);

  const stopTicker = useCallback(() => {
    if (tickerRef.current) { clearTimeout(tickerRef.current); tickerRef.current = null; }
  }, []);

  const handleClose = useCallback(() => {
    isMountedRef.current = false;
    window.dispatchEvent(new CustomEvent('time-machine-active', { detail: { active: false } }));
    window.dispatchEvent(new CustomEvent('time-machine-open', { detail: { active: false } }));
    dispatchRotate(false);

    stopTicker();
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
    if (rotationRef.current) { cancelAnimationFrame(rotationRef.current); rotationRef.current = null; }

    const mapView = mapRef.current;
    const rawMap = mapView?.getMap?.();
    if (rawMap) {
      unlockMap(rawMap);
      mapLockedRef.current = false;
      cleanupWaybackArtifacts(rawMap);
      try { mapView.easeTo({ pitch: 0, bearing: 0, duration: 1000, essential: true }); } catch { /**/ }
    }

    onClose();
  }, [cleanupWaybackArtifacts, dispatchRotate, mapRef, onClose, stopTicker]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!isPlaying) {
      idleTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) handleClose();
      }, 15000);
    }
  }, [handleClose, isPlaying]);

  // Settings auto-close (15s, reset on interaction)
  useEffect(() => {
    if (!showSettings) return;
    if (settingsTimerRef.current) clearTimeout(settingsTimerRef.current);
    settingsTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) setShowSettings(false);
    }, 15000);
    return () => { if (settingsTimerRef.current) clearTimeout(settingsTimerRef.current); };
  }, [showSettings]);

  useEffect(() => {
    resetIdleTimer();
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
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

  // External rotation toggle support
  useEffect(() => {
    const handle = (e: Event) => {
      const requested = (e as CustomEvent).detail?.active;
      setIsOrbitActive(prev => typeof requested === 'boolean' ? requested : !prev);
    };
    window.addEventListener('time-machine-toggle-rotation', handle);
    return () => window.removeEventListener('time-machine-toggle-rotation', handle);
  }, []);

  // ── 3D Orbit loop — independent from slideshow ────────────────────────────
  useEffect(() => {
    if (!isOrbitActive) {
      if (rotationRef.current) { cancelAnimationFrame(rotationRef.current); rotationRef.current = null; }
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
          if (!isMountedRef.current || !isOrbitActiveRef.current) {
            rotationRef.current = null;
            dispatchRotate(false);
            return;
          }
          try {
            bearing = (bearing + ORBIT_SPEED) % 360;
            // Always enforce 3D pitch while orbiting
            mapView.easeTo({ bearing, pitch: TARGET_PITCH, duration: 0, essential: true });
          } catch { /**/ }
          rotationRef.current = requestAnimationFrame(rotate);
        };

        rotationRef.current = requestAnimationFrame(rotate);
        dispatchRotate(true);
      };
      tryStart();
    }, 800);

    return () => {
      clearTimeout(startupDelay);
      if (rotationRef.current) { cancelAnimationFrame(rotationRef.current); rotationRef.current = null; }
      dispatchRotate(false);
    };
  // Run when orbit active state changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOrbitActive]);

  // ── Initial 3D fly-to ─────────────────────────────────────────────────────
  useEffect(() => {
    const mapView = mapRef.current;
    const rawMap = mapView?.getMap?.();
    if (!mapView || !rawMap) return;
    mapView.flyTo({ center: [lng, lat], zoom: 16, pitch: TARGET_PITCH, bearing: rawMap.getBearing(), duration: 2000, essential: true });
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

  // Switch to satellite + apply initial year
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    const sprite = map.getStyle()?.sprite;
    const isSatellite = sprite && String(sprite).includes('satellite');
    const init = () => { cleanupWaybackArtifacts(map); applyYear(currentYear, false); preloadAll(); };
    if (!isSatellite) {
      map.setStyle('mapbox://styles/mapbox/satellite-streets-v12');
      map.once('style.load', () => setTimeout(init, 300));
    } else {
      setTimeout(init, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectYear = useCallback((nextIndex: number, fromTicker = false) => {
    const nextYear = waybackYears[nextIndex];
    setCurrentIndex(nextIndex);
    setIsLoadingTile(true);
    // When called from ticker, keep playing. When called by clicking a dot, pause.
    if (!fromTicker) {
      stopTicker();
      setIsPlaying(false);
    }
    applyYear(nextYear, true);
    preloadTileAndWait(nextYear.tileUrl, 16, lat, lng).finally(() => {
      if (!isMountedRef.current) return;
      setIsLoadingTile(false);
    });
  }, [applyYear, lat, lng, stopTicker]);

  // ── Year slideshow ticker ─────────────────────────────────────────────────
  useEffect(() => {
    stopTicker();
    if (!isPlaying || isTransitioning || isLoadingTile) return;

    tickerRef.current = setTimeout(() => {
      if (!isMountedRef.current || !isPlayingRef.current) return;

      let next = direction === 'backward' ? currentIndex - 1 : currentIndex + 1;
      if (next < 0) { setDirection('forward'); next = 1; }
      else if (next >= waybackYears.length) { setDirection('backward'); next = waybackYears.length - 2; }

      setCurrentIndex(next);
      setIsLoadingTile(true);
      applyYear(waybackYears[next], true);
      preloadTileAndWait(waybackYears[next].tileUrl, 16, lat, lng).finally(() => {
        if (!isMountedRef.current) return;
        setIsLoadingTile(false);
      });
    }, intervalSec * 1000);

    return stopTicker;
  }, [currentIndex, direction, intervalSec, isLoadingTile, isPlaying, isTransitioning, applyYear, lat, lng, stopTicker]);

  // ── Button handlers ───────────────────────────────────────────────────────
  const playDir = (dir: 'backward' | 'forward') => {
    setDirection(dir);
    setIsPlaying(true);
    setIsOrbitActive(true); // orbit is always on with playback
    resetIdleTimer();
  };

  const handlePause = () => {
    stopTicker(); // immediately cancel any pending tick
    setIsPlaying(false);
    resetIdleTimer();
  };

  const handleResume = () => {
    setIsPlaying(true);
    resetIdleTimer();
  };

  const handleOrbitToggle = () => {
    setIsOrbitActive(prev => {
      const next = !prev;
      if (next) {
        // Snap back to 3D when enabling orbit
        try { mapRef.current?.easeTo({ pitch: TARGET_PITCH, duration: 500, essential: true }); } catch { /**/ }
      }
      return next;
    });
    resetIdleTimer();
  };

  // Compact icon button
  const Btn = ({
    onClick, active, title, children, danger,
  }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode; danger?: boolean }) => (
    <button
      onClick={onClick}
      title={title}
      className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all ${
        danger
          ? 'bg-white/10 text-white/60 hover:bg-red-500/80 hover:text-white'
          : active
          ? 'bg-indigo-600 text-white shadow-md'
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
      {/* ── Settings panel ─────────────────────────────────────────────── */}
      {showSettings && (
        <div
          className="w-[320px] max-w-[calc(100vw-24px)] animate-in fade-in slide-in-from-bottom-1 duration-200"
          onMouseMove={() => {
            if (settingsTimerRef.current) clearTimeout(settingsTimerRef.current);
            settingsTimerRef.current = setTimeout(() => { if (isMountedRef.current) setShowSettings(false); }, 15000);
          }}
        >
          {/* Fully opaque background */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-2.5 py-2 shadow-lg">
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Speed</span>
            {[3, 5, 7, 10].map(s => (
              <button
                key={s}
                onClick={() => setIntervalSec(s)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-black transition-all ${
                  intervalSec === s ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/55 hover:bg-white/20'
                }`}
              >
                {s}s
              </button>
            ))}
            <div className="h-4 w-px bg-white/10" />
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Dir</span>
            <button
              onClick={() => setDirection(prev => prev === 'backward' ? 'forward' : 'backward')}
              className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-black text-white/70 hover:bg-white/20"
            >
              {direction === 'backward' ? '2026→2014' : '2014→2026'}
            </button>
          </div>
        </div>
      )}

      {/* ── Main control bar ───────────────────────────────────────────── */}
      <div
        className="w-[320px] max-w-[calc(100vw-24px)] rounded-xl border border-white/10 bg-slate-900 px-2.5 py-2 shadow-xl"
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
            onClick={isPlaying ? handlePause : handleResume}
            active={isPlaying}
            title={isPlaying ? 'Pause slideshow (unlocks map)' : 'Resume slideshow'}
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
          </Btn>

          {/* Orbit toggle */}
          <Btn
            onClick={handleOrbitToggle}
            active={isOrbitActive}
            title={isOrbitActive ? 'Stop 3D rotation' : 'Start 3D rotation'}
          >
            <RotateCcw className="h-3 w-3" />
          </Btn>

          {/* Settings */}
          <Btn
            onClick={() => setShowSettings(prev => !prev)}
            active={showSettings}
            title="Speed & direction settings"
          >
            <Settings className="h-3 w-3" />
          </Btn>

          {/* Close */}
          <Btn onClick={handleClose} title={`Close Time Machine`} danger>
            <X className="h-3 w-3" />
          </Btn>
        </div>

        {/* Year dots */}
        <div className="mt-2 flex items-center justify-center gap-1">
          {waybackYears.map((yearEntry, index) => (
            <button
              key={yearEntry.year}
              onClick={() => { selectYear(index, false); resetIdleTimer(); }}
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
            {isPlaying
              ? (direction === 'backward' ? '← back in time' : 'forward in time →')
              : isOrbitActive
                ? `3D · ${currentYear.date}`
                : currentYear.date}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TimeMachine;
