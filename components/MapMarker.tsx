
import React, { useState, useCallback, useMemo } from 'react';
import { Marker } from 'react-map-gl';
import { Project } from '../types';

interface MapMarkerProps {
  project: Project;
  selected: boolean;
  isDimmed?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const MapMarker: React.FC<MapMarkerProps> = ({
  project,
  selected,
  isDimmed = false,
  onClick,
  onMouseEnter,
  onMouseLeave
}) => {
  const [isPulsating, setIsPulsating] = useState(false);

  const handleClick = useCallback((e: any) => {
    if (e.originalEvent) e.originalEvent.stopPropagation();
    setIsPulsating(true);
    setTimeout(() => {
      setIsPulsating(false);
      onClick();
    }, 300);
  }, [onClick]);

  const displayPrice = useMemo(() => {
    if (!project.priceRange) return 'Enquire';
    const cleaned = project.priceRange.replace(/AED/gi, '').trim();
    const match = cleaned.match(/^([^\s-]+)/);
    return match ? match[1] : cleaned;
  }, [project.priceRange]);

  return (
    <Marker
      longitude={project.longitude}
      latitude={project.latitude}
      anchor="bottom"
    >
      <div
        onClick={handleClick}
        onTouchStart={(e) => { e.stopPropagation(); }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`
          relative flex flex-col items-center cursor-pointer pointer-events-auto touch-action-manipulation transition-all duration-500
          ${isDimmed ? 'opacity-40 scale-95' : 'opacity-100 scale-100'}
          ${selected ? 'z-[100] scale-125' : 'z-10'}
        `}
      >
        {/* Premium Pill Marker */}
        <div className={`
          relative flex items-center transition-all duration-300 ease-out
          rounded-full px-4 py-2 border shadow-lg
          ${selected
            ? 'bg-blue-600 border-blue-500 shadow-blue-500/40 text-white'
            : 'bg-white border-slate-100 text-slate-800 hover:shadow-xl hover:-translate-y-1'}
          ${isPulsating ? 'ring-4 ring-blue-100' : ''}
        `}>
          <div className="flex items-center space-x-1.5 whitespace-nowrap">
            <span className={`text-[10px] font-bold uppercase tracking-tighter ${selected ? 'text-blue-100' : 'text-slate-400'}`}>From</span>
            <span className={`text-[13px] font-black tracking-tight ${selected ? 'text-white' : 'text-slate-900'}`}>
              {displayPrice}
            </span>
          </div>
        </div>

        {/* Tail */}
        <div className={`
          w-2.5 h-2.5 -mt-1.5 rotate-45 border-r border-b transition-all duration-300
          ${selected ? 'bg-blue-600 border-blue-500' : 'bg-white border-slate-100'}
        `}></div>

        {/* Pulse Glow for Selected State */}
        {selected && (
          <div className="absolute -inset-2 bg-blue-600/20 blur-xl rounded-full animate-pulse -z-10"></div>
        )}
      </div>
    </Marker>
  );
};

export default MapMarker;
