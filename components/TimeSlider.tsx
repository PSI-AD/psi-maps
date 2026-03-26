import React, { useState, useEffect, useCallback } from 'react';
import { Clock, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { waybackYears } from '../data/waybackYears';

interface TimelineBarProps {
  mapRef: React.MutableRefObject<any>;
  onClose: () => void;
}

/**
 * Horizontal year bar across the top of the map.
 * When a year is tapped, it overlays Esri Wayback satellite imagery for that year
 * using a raster tile source on the Mapbox map.
 */
const TimelineBar: React.FC<TimelineBarProps> = ({ mapRef, onClose }) => {
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  const applyWaybackLayer = useCallback((year: number | null) => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    // Remove existing wayback layer + source
    try {
      if (map.getLayer('wayback-layer')) map.removeLayer('wayback-layer');
      if (map.getSource('wayback-source')) map.removeSource('wayback-source');
    } catch { /* ignore */ }

    if (year === null) return; // no year selected — remove overlay

    const entry = waybackYears.find(w => w.year === year);
    if (!entry) return;

    // Add raster source for the selected year
    map.addSource('wayback-source', {
      type: 'raster',
      tiles: [entry.tileUrl],
      tileSize: 256,
      attribution: '© Esri Wayback Imagery',
    });

    // Insert below labels but above the base satellite
    const firstSymbolLayer = map.getStyle()?.layers?.find((l: any) => l.type === 'symbol');
    map.addLayer({
      id: 'wayback-layer',
      type: 'raster',
      source: 'wayback-source',
      paint: { 'raster-opacity': 1 },
    }, firstSymbolLayer?.id);
  }, [mapRef]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      const map = mapRef.current?.getMap?.();
      if (!map) return;
      try {
        if (map.getLayer('wayback-layer')) map.removeLayer('wayback-layer');
        if (map.getSource('wayback-source')) map.removeSource('wayback-source');
      } catch { /* ignore */ }
    };
  }, [mapRef]);

  const handleYearClick = (year: number) => {
    if (activeYear === year) {
      // Deselect — go back to current imagery
      setActiveYear(null);
      applyWaybackLayer(null);
    } else {
      setActiveYear(year);
      applyWaybackLayer(year);
    }
  };

  const handleClose = () => {
    applyWaybackLayer(null); // remove overlay
    onClose();
  };

  // Navigate years
  const goYear = (dir: 'prev' | 'next') => {
    if (!activeYear) {
      handleYearClick(waybackYears[waybackYears.length - 1].year);
      return;
    }
    const idx = waybackYears.findIndex(w => w.year === activeYear);
    const newIdx = dir === 'prev' ? Math.max(0, idx - 1) : Math.min(waybackYears.length - 1, idx + 1);
    handleYearClick(waybackYears[newIdx].year);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[5500] animate-in slide-in-from-top-2 duration-300">
      {/* Glass background strip */}
      <div className="bg-slate-900/90 backdrop-blur-xl border-b border-white/10 shadow-2xl">
        <div className="flex items-center gap-1 px-2 py-2 lg:px-4 lg:py-2.5 max-w-full">

          {/* Clock icon + label */}
          <div className="flex items-center gap-1.5 shrink-0 mr-1 lg:mr-3">
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white" />
            </div>
            {!isMobile && (
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                Timeline
              </span>
            )}
          </div>

          {/* Left arrow */}
          <button
            onClick={() => goYear('prev')}
            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 shrink-0"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Year dots/buttons */}
          <div className="flex-1 overflow-x-auto hide-scrollbar">
            <div className="flex items-center gap-0.5 lg:gap-1 min-w-max mx-auto justify-center">
              {waybackYears.map((entry) => {
                const isActive = activeYear === entry.year;
                return (
                  <button
                    key={entry.year}
                    onClick={() => handleYearClick(entry.year)}
                    className={`
                      flex flex-col items-center transition-all duration-200 rounded-lg px-1.5 py-1 lg:px-2.5 lg:py-1.5
                      ${isActive
                        ? 'bg-blue-600 scale-105 shadow-lg shadow-blue-600/30'
                        : 'hover:bg-white/10'
                      }
                    `}
                  >
                    {/* Dot */}
                    <div className={`w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full mb-0.5 transition-colors ${
                      isActive ? 'bg-white' : 'bg-white/40'
                    }`} />
                    {/* Year label */}
                    <span className={`text-[8px] lg:text-[10px] font-black leading-none transition-colors ${
                      isActive ? 'text-white' : 'text-white/60'
                    }`}>
                      {entry.year}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right arrow */}
          <button
            onClick={() => goYear('next')}
            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 shrink-0"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-red-500/80 transition-colors shrink-0 ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Active year indicator */}
        {activeYear && (
          <div className="text-center pb-1.5 -mt-0.5">
            <span className="text-[9px] font-bold text-blue-300 uppercase tracking-wider">
              Satellite imagery from {waybackYears.find(w => w.year === activeYear)?.date}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineBar;
