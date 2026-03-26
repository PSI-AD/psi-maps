import React, { useState, useMemo, useEffect } from 'react';
import { Source, Layer, Marker, Popup } from 'react-map-gl';
import { ROIZone } from '../types';
import { TrendingUp, X } from 'lucide-react';

interface ROIHeatmapOverlayProps {
  zones: ROIZone[];
  isVisible: boolean;
  onClose?: () => void;
}

/** Detect mobile (< 1024px = Tailwind lg breakpoint) */
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
};

const ratingColor: Record<string, string> = {
  Hot: '#ef4444',       // red
  Warm: '#f97316',      // orange
  Emerging: '#eab308',  // yellow
  Stable: '#22c55e',    // green
};

const ROIHeatmapOverlay: React.FC<ROIHeatmapOverlayProps> = ({ zones, isVisible, onClose }) => {
  const [selectedZone, setSelectedZone] = useState<ROIZone | null>(null);
  const isMobile = useIsMobile();

  // Build GeoJSON for the circle fills
  const geoJsonData = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: zones.map(zone => ({
      type: 'Feature' as const,
      properties: {
        id: zone.id,
        name: zone.name,
        growthRate: zone.growthRate,
        rating: zone.rating,
        color: zone.color,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: zone.center,
      },
    })),
  }), [zones]);

  if (!isVisible) return null;

  return (
    <>
      {/* Colored circles on the map — size based on growth rate */}
      <Source id="roi-zones" type="geojson" data={geoJsonData}>
        {/* Outer glow ring */}
        <Layer
          id="roi-zone-glow"
          type="circle"
          paint={{
            'circle-color': ['get', 'color'],
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              8, ['*', ['get', 'growthRate'], isMobile ? 1 : 1.5],
              12, ['*', ['get', 'growthRate'], isMobile ? 2 : 3],
              16, ['*', ['get', 'growthRate'], isMobile ? 3 : 4.5],
            ],
            'circle-opacity': 0.15,
            'circle-blur': 0.8,
          }}
        />
        {/* Core circle */}
        <Layer
          id="roi-zone-core"
          type="circle"
          paint={{
            'circle-color': ['get', 'color'],
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              8, ['*', ['get', 'growthRate'], isMobile ? 0.6 : 0.8],
              12, ['*', ['get', 'growthRate'], isMobile ? 1.2 : 2],
              16, ['*', ['get', 'growthRate'], isMobile ? 2 : 3],
            ],
            'circle-opacity': 0.25,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': ['get', 'color'],
            'circle-stroke-opacity': 0.6,
          }}
        />
      </Source>

      {/* ═══ MOBILE: Minimal — colored dot + percentage only ═══ */}
      {isMobile && zones.map((zone) => (
        <Marker
          key={zone.id}
          longitude={zone.center[0]}
          latitude={zone.center[1]}
          anchor="center"
        >
          <div
            className="cursor-pointer flex items-center gap-0.5"
            onClick={(e) => { e.stopPropagation(); setSelectedZone(selectedZone?.id === zone.id ? null : zone); }}
          >
            {/* Tiny colored dot */}
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: ratingColor[zone.rating] || '#22c55e' }}
            />
            {/* Percentage only */}
            <span
              className="text-[10px] font-black text-white leading-none"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
            >
              +{zone.growthRate}%
            </span>
          </div>
        </Marker>
      ))}

      {/* ═══ DESKTOP: Badge with percentage + truncated zone name ═══ */}
      {!isMobile && zones.map((zone) => (
        <Marker
          key={zone.id}
          longitude={zone.center[0]}
          latitude={zone.center[1]}
          anchor="center"
        >
          <div
            className="cursor-pointer flex flex-col items-center"
            onClick={(e) => { e.stopPropagation(); setSelectedZone(selectedZone?.id === zone.id ? null : zone); }}
          >
            {/* Percentage badge */}
            <div
              className="px-2 py-0.5 rounded-md shadow-md border border-white/20 flex items-center gap-1 whitespace-nowrap"
              style={{ backgroundColor: ratingColor[zone.rating] || '#22c55e' }}
            >
              <TrendingUp className="w-2.5 h-2.5 text-white" />
              <span className="text-white text-[11px] font-black leading-none">
                +{zone.growthRate}%
              </span>
            </div>
            {/* Zone name — compact */}
            <span
              className="mt-0.5 text-[9px] font-bold text-white bg-black/40 px-1.5 py-0.5 rounded-full max-w-[90px] truncate leading-tight"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
            >
              {zone.name}
            </span>
          </div>
        </Marker>
      ))}

      {/* ═══ MOBILE: Tap-to-show tiny bottom strip ═══ */}
      {isMobile && selectedZone && (
        <div className="fixed bottom-16 left-2 right-2 z-[5500] animate-in slide-in-from-bottom-2 duration-200">
          <div className="bg-slate-900/95 backdrop-blur-lg rounded-xl px-3 py-2 flex items-center justify-between shadow-lg border border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: ratingColor[selectedZone.rating] || '#22c55e' }}
              />
              <span className="text-white text-xs font-bold truncate">{selectedZone.name}</span>
              <span className="text-[10px] font-black text-emerald-400 shrink-0">+{selectedZone.growthRate}%</span>
              <span className="text-[9px] text-slate-400 uppercase font-bold shrink-0">{selectedZone.rating}</span>
            </div>
            <button
              onClick={() => setSelectedZone(null)}
              className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white ml-2 shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* ═══ DESKTOP: Small popup on click ═══ */}
      {!isMobile && selectedZone && (
        <Popup
          longitude={selectedZone.center[0]}
          latitude={selectedZone.center[1]}
          closeButton={false}
          closeOnClick={false}
          anchor="bottom"
          offset={20}
          className="!p-0"
          maxWidth="200px"
        >
          <div className="bg-slate-900 rounded-lg border border-white/10 shadow-xl p-2.5 min-w-[150px] -m-3 relative">
            <button
              onClick={() => setSelectedZone(null)}
              className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
            >
              <X className="w-2.5 h-2.5" />
            </button>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: ratingColor[selectedZone.rating] || '#22c55e' }}
              />
              <h4 className="text-white text-[11px] font-black truncate pr-4">{selectedZone.name}</h4>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 text-sm font-black">+{selectedZone.growthRate}%</span>
              <span className="text-[9px] text-slate-400 uppercase font-bold">{selectedZone.rating}</span>
            </div>
          </div>
        </Popup>
      )}

      {/* ═══ MOBILE: NO legend at all ═══ */}
      {/* ═══ DESKTOP: Tiny legend badge — top-right corner ═══ */}
      {!isMobile && (
        <div className="fixed top-20 right-4 z-[5500] bg-slate-900/90 backdrop-blur-xl rounded-lg shadow-lg border border-white/10 px-2.5 py-2 w-[130px]">
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-white text-[9px] font-black uppercase tracking-widest">ROI</h4>
            {onClose && (
              <button onClick={onClose} className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
          <div className="space-y-0.5">
            {Object.entries(ratingColor).map(([rating, color]) => (
              <div key={rating} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-slate-300 text-[9px] font-bold flex-1">{rating}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default ROIHeatmapOverlay;
