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
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);

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
              8, ['*', ['get', 'growthRate'], 2],
              12, ['*', ['get', 'growthRate'], 4],
              16, ['*', ['get', 'growthRate'], 6],
            ],
            'circle-opacity': 0.12,
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
              8, ['*', ['get', 'growthRate'], 1],
              12, ['*', ['get', 'growthRate'], 2.5],
              16, ['*', ['get', 'growthRate'], 4],
            ],
            'circle-opacity': 0.25,
            'circle-stroke-width': 2,
            'circle-stroke-color': ['get', 'color'],
            'circle-stroke-opacity': 0.6,
          }}
        />
      </Source>

      {/* Zone Labels — floating markers with growth data */}
      {zones.map((zone) => {
        const config = ratingConfig[zone.rating] || ratingConfig.Stable;
        const isHovered = hoveredZoneId === zone.id;

        return (
          <Marker
            key={zone.id}
            longitude={zone.center[0]}
            latitude={zone.center[1]}
            anchor="center"
          >
            <div
              className={`cursor-pointer transition-all duration-300 ${isHovered ? 'scale-110' : 'scale-100'}`}
              onClick={(e) => { e.stopPropagation(); setSelectedZone(zone); }}
              onMouseEnter={() => setHoveredZoneId(zone.id)}
              onMouseLeave={() => setHoveredZoneId(null)}
            >
              <div className={`px-2.5 py-1.5 rounded-xl ${config.bg} shadow-xl ${config.glow} border border-white/20 backdrop-blur-sm flex items-center gap-1.5 whitespace-nowrap`}>
                <TrendingUp className="w-3 h-3 text-white" />
                <span className="text-white text-[11px] font-black">
                  +{zone.growthRate}%
                </span>
              </div>
              {/* Zone name — visible at higher zoom */}
              <div className="text-center mt-1">
                <span className="text-[9px] font-black text-white bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
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
          maxWidth="280px"
        >
          <div className="bg-slate-900 rounded-2xl border border-white/10 shadow-2xl p-4 min-w-[220px] -m-3 relative">
            <button
              onClick={() => setSelectedZone(null)}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
            >
              <X className="w-3 h-3" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-lg ${ratingConfig[selectedZone.rating]?.bg} flex items-center justify-center shadow-lg`}>
                {ratingConfig[selectedZone.rating]?.icon}
                <span className="text-white ml-0.5 text-[10px]">{/* icon placeholder */}</span>
              </div>
              <div>
                <h4 className="text-white text-sm font-black">{selectedZone.name}</h4>
                <span className={`text-[10px] font-black uppercase tracking-widest ${ratingConfig[selectedZone.rating]?.text}`}>
                  {selectedZone.rating} Zone
                </span>
              </div>
            </div>

            {/* Growth Stat */}
            <div className="bg-white/5 rounded-xl p-3 mb-2">
              <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Annual Growth Rate</div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span className="text-2xl font-black text-emerald-400">+{selectedZone.growthRate}%</span>
              </div>
            </div>

            {/* Growth Bar */}
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
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

      {/* Legend Panel */}
      <div className="fixed top-20 right-4 z-[5500] bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-4 w-[200px]">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-white text-xs font-black uppercase tracking-widest">ROI Heatmap</h4>
          {onClose && (
            <button onClick={onClose} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="space-y-2">
          {Object.entries(ratingConfig).map(([rating, cfg]) => (
            <div key={rating} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${cfg.bg}`} />
              <span className="text-slate-300 text-xs font-bold">{rating}</span>
              <span className="text-slate-500 text-[10px] ml-auto">
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
