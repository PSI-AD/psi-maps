import React, { useRef, useState, useMemo } from 'react';
import { Marker } from 'react-map-gl';
import { Project } from '../types';

interface ProjectMarkerProps {
  project: Project;
  selected: boolean;
  isDimmed?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const ProjectMarker: React.FC<ProjectMarkerProps> = ({ 
  project, 
  selected, 
  isDimmed = false, 
  onClick,
  onMouseEnter,
  onMouseLeave
}) => {
  const [isPulsating, setIsPulsating] = useState(false);
  const touchPos = useRef<{x: number, y: number} | null>(null);

  const displayPrice = useMemo(() => {
    if (!project.priceRange) return 'Enquire';
    const cleaned = project.priceRange.replace(/AED/gi, '').trim();
    const match = cleaned.match(/^([^\s-]+)/);
    return match ? match[1] : cleaned;
  }, [project.priceRange]);

  const handleTap = () => {
    setIsPulsating(true);
    onClick();
    setTimeout(() => setIsPulsating(false), 300);
  };

  return (
    <Marker 
      longitude={Number(project.longitude)} 
      latitude={Number(project.latitude)} 
      anchor="bottom"
    >
      <button 
        type="button"
        onClick={(e) => { e.stopPropagation(); handleTap(); }}
        onTouchStart={(e) => {
            e.stopPropagation();
            touchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
            e.stopPropagation();
            if (!touchPos.current) return;
            const dx = e.changedTouches[0].clientX - touchPos.current.x;
            const dy = e.changedTouches[0].clientY - touchPos.current.y;
            // If thumb moved less than 10 pixels, it's a tap, not a drag!
            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
                e.preventDefault(); // Stop ghost double-clicks
                handleTap(); 
            }
            touchPos.current = null;
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`
          relative group flex flex-col items-center cursor-pointer pointer-events-auto touch-action-manipulation 
          transition-transform duration-300 border-none bg-transparent p-0 m-0 outline-none
          ${isDimmed ? 'opacity-40 scale-95' : 'opacity-100 scale-100'}
          ${selected ? 'scale-110 z-50' : 'hover:scale-105 z-40'}
        `}
        style={{ transform: `translate(-50%, -50%) scale(${selected ? 1.1 : 1})` }}
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
      </button>
    </Marker>
  );
};

export default ProjectMarker;
