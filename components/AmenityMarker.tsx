import React from 'react';
import { Marker } from 'react-map-gl';
import { Landmark } from '../types';
import { GraduationCap, Hotel, Landmark as CultureIcon, ShoppingBag, Stethoscope, Plane, Anchor, FerrisWheel } from 'lucide-react';

interface AmenityMarkerProps {
  amenity: Landmark;
  isSelected?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const categoryConfig: Record<string, { bg: string; border: string; icon: React.ReactNode }> = {
  school: { bg: 'bg-emerald-600', border: 'border-emerald-600', icon: <GraduationCap className="w-5 h-5 text-white" /> },
  hotel: { bg: 'bg-blue-600', border: 'border-blue-600', icon: <Hotel className="w-5 h-5 text-white" /> },
  culture: { bg: 'bg-purple-600', border: 'border-purple-600', icon: <CultureIcon className="w-5 h-5 text-white" /> },
  leisure: { bg: 'bg-teal-600', border: 'border-teal-600', icon: <FerrisWheel className="w-5 h-5 text-white" /> },
  retail: { bg: 'bg-rose-600', border: 'border-rose-600', icon: <ShoppingBag className="w-5 h-5 text-white" /> },
  hospital: { bg: 'bg-red-600', border: 'border-red-600', icon: <Stethoscope className="w-5 h-5 text-white" /> },
  airport: { bg: 'bg-sky-600', border: 'border-sky-600', icon: <Plane className="w-5 h-5 text-white" /> },
  port: { bg: 'bg-cyan-600', border: 'border-cyan-600', icon: <Anchor className="w-5 h-5 text-white" /> },
};

const defaultConfig = { bg: 'bg-slate-600', border: 'border-slate-600', icon: <CultureIcon className="w-5 h-5 text-white" /> };

const AmenityMarker: React.FC<AmenityMarkerProps> = ({ amenity, isSelected = false, onClick, onMouseEnter, onMouseLeave }) => {
  const config = categoryConfig[amenity.category?.toLowerCase()] ?? defaultConfig;

  return (
    <Marker
      longitude={Number(amenity.longitude)}
      latitude={Number(amenity.latitude)}
      anchor="bottom"
      onClick={onClick}
    >
      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`group relative flex flex-col items-center cursor-pointer transition-all duration-300 ${isSelected ? 'z-[100] scale-110' : 'z-20'}`}
      >
        {/* Solid pin circle */}
        <div className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-transform duration-200 ${config.bg} ${isSelected ? 'border-[3px] border-orange-500 ring-4 ring-orange-500/30' : 'border-2 border-white group-hover:scale-110'}`}>
          {config.icon}
        </div>

        {/* Diamond tail */}
        <div className={`w-2.5 h-2.5 -mt-1.5 rotate-45 ${config.bg} border-r-2 border-b-2 ${isSelected ? 'border-orange-500' : 'border-white'}`} />

        {/* Name label — white background, black text, coloured border */}
        <div className={`mt-1 px-3 py-1 bg-white text-black text-[11px] font-black rounded-lg shadow-md whitespace-nowrap border-2 ${isSelected ? 'border-orange-500' : config.border} opacity-90 group-hover:opacity-100 transition-opacity max-w-[160px] truncate`}>
          {amenity.name}
        </div>
      </div>
    </Marker>
  );
};

export default AmenityMarker;
