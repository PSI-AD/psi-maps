import React, { useState, useMemo } from 'react';
import { Source, Layer, Marker, Popup } from 'react-map-gl';
import { ROIZone } from '../types';
import { TrendingUp, Flame, Thermometer, Sprout, Shield, X } from 'lucide-react';

interface ROIHeatmapOverlayProps {
  zones: ROIZone[];
  isVisible: boolean;
  onClose?: () => void;
}

const ratingConfig: Record<string, { icon: React.ReactNode; bg: string; text: string; glow: string }> = {
  Hot: { icon: <Flame className="w-3 h-3" />, bg: 'bg-red-500', text: 'text-red-400', glow: 'shadow-red-500/40' },
  Warm: { icon: <Thermometer className="w-3 h-3" />, bg: 'bg-orange-500', text: 'text-orange-400', glow: 'shadow-orange-500/40' },
  Emerging: { icon: <Sprout className="w-3 h-3" />, bg: 'bg-yellow-500', text: 'text-yellow-400', glow: 'shadow-yellow-500/40' },
  Stable: { icon: <Shield className="w-3 h-3" />, bg: 'bg-green-500', text: 'text-green-400', glow: 'shadow-green-500/40' },
};

const ROIHeatmapOverlay: React.FC<ROIHeatmapOverlayProps> = ({ zones, isVisible, onClose }) => {
  const [selectedZone, setSelectedZone] = useState<ROIZone | null>(null);

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
      {/* ROI Zone Circles — size based on growth rate */}
      <Source id="roi-zones" type="geojson" data={geoJsonData}>
        {/* Outer glow ring */}
        <Layer
          id="roi-zone-glow"
          type="circle"
          paint={{
            'circle-color': ['get', 'color'],
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              8, ['*', ['get', 'growthRate'], 1.5],
              12, ['*', ['get', 'growthRate'], 3],
              16, ['*', ['get', 'growthRate'], 4.5],
            ],
            'circle-opacity': 0.1,
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
              8, ['*', ['get', 'growthRate'], 0.8],
              12, ['*', ['get', 'growthRate'], 2],
              16, ['*', ['get', 'growthRate'], 3],
            ],
            'circle-opacity': 0.2,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': ['get', 'color'],
            'circle-stroke-opacity': 0.5,
          }}
        />
      </Source>

      {/* Zone Labels — compact markers with centered content */}
      {zones.map((zone) => {
        const config = ratingConfig[zone.rating] || ratingConfig.Stable;

        return (
          <Marker
            key={zone.id}
            longitude={zone.center[0]}
            latitude={zone.center[1]}
            anchor="center"
          >
            <div
              className="cursor-pointer flex flex-col items-center"
              onClick={(e) => { e.stopPropagation(); setSelectedZone(zone); }}
            >
              {/* Percentage badge — compact, centered */}
              <div className={`px-2 py-1 rounded-lg ${config.bg} shadow-lg ${config.glow} border border-white/20 backdrop-blur-sm flex items-center gap-1 whitespace-nowrap`}>
                <TrendingUp className="w-3 h-3 text-white" />
                <span className="text-white text-sm font-black leading-none">
                  +{zone.growthRate}%
                </span>
              </div>
              {/* Zone name — capped width, centered */}
              <div className="mt-0.5 text-center">
                <span className="text-[11px] font-black text-white bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full inline-block max-w-[110px] truncate leading-tight">
                  {zone.name}
                </span>
              </div>
            </div>
          </Marker>
        );
      })}

      {/* Detail Popup */}
      {selectedZone && (
        <Popup
          longitude={selectedZone.center[0]}
          latitude={selectedZone.center[1]}
          closeButton={false}
          closeOnClick={false}
          anchor="bottom"
          offset={30}
          className="!p-0"
          maxWidth="240px"
        >
          <div className="bg-slate-900 rounded-xl border border-white/10 shadow-2xl p-3 min-w-[180px] -m-3 relative">
            <button
              onClick={() => setSelectedZone(null)}
              className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
            >
              <X className="w-3 h-3" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded-md ${ratingConfig[selectedZone.rating]?.bg} flex items-center justify-center`}>
                {ratingConfig[selectedZone.rating]?.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-white text-xs font-black truncate">{selectedZone.name}</h4>
                <span className={`text-[9px] font-black uppercase tracking-widest ${ratingConfig[selectedZone.rating]?.text}`}>
                  {selectedZone.rating}
                </span>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-2 mb-2">
              <div className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-0.5">Annual Growth</div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xl font-black text-emerald-400">+{selectedZone.growthRate}%</span>
              </div>
            </div>

            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(100, selectedZone.growthRate * 5)}%`,
                  backgroundColor: selectedZone.color,
                }}
              />
            </div>
          </div>
        </Popup>
      )}

      {/* Compact Legend — small corner badge */}
      <div className="fixed top-20 right-4 z-[5500] bg-slate-900/90 backdrop-blur-xl rounded-xl shadow-xl border border-white/10 p-3 w-[150px]">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-white text-[10px] font-black uppercase tracking-widest">ROI Zones</h4>
          {onClose && (
            <button onClick={onClose} className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="space-y-1">
          {Object.entries(ratingConfig).map(([rating, cfg]) => (
            <div key={rating} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${cfg.bg}`} />
              <span className="text-slate-300 text-[10px] font-bold flex-1">{rating}</span>
              <span className="text-slate-500 text-[9px]">
                {rating === 'Hot' && '>12%'}
                {rating === 'Warm' && '8-12%'}
                {rating === 'Emerging' && '5-8%'}
                {rating === 'Stable' && '<5%'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default ROIHeatmapOverlay;
