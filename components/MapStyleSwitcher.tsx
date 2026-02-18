
import React, { useState } from 'react';

interface StyleOption {
  id: string;
  name: string;
  url: string;
}

interface MapStyleSwitcherProps {
  currentStyle: string;
  onStyleChange: (url: string) => void;
}

const styles: StyleOption[] = [
  { id: 'streets', name: 'Streets', url: 'mapbox://styles/mapbox/streets-v12' },
  { id: 'satellite', name: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  { id: 'dark', name: 'Night', url: 'mapbox://styles/mapbox/dark-v11' }
];

const MapStyleSwitcher: React.FC<MapStyleSwitcherProps> = ({ currentStyle, onStyleChange }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Expanded Options */}
      <div className={`
        absolute bottom-0 left-0 flex items-center bg-slate-100/90 backdrop-blur-md rounded-xl border border-slate-200/50 p-1 gap-1 transition-all duration-300 origin-left
        ${isHovered ? 'opacity-100 translate-x-12 scale-100 visible' : 'opacity-0 translate-x-0 scale-90 invisible'}
      `}>
        {styles.map((style) => (
          <button
            key={style.id}
            onClick={() => onStyleChange(style.url)}
            className={`
              whitespace-nowrap px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all
              ${currentStyle === style.url 
                ? 'bg-slate-800 text-slate-100 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'}
            `}
          >
            {style.name}
          </button>
        ))}
      </div>

      {/* Main Toggle Button */}
      <button className={`
        z-10 w-10 h-10 rounded-xl flex items-center justify-center transition-all border shadow-lg
        ${isHovered ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white/90 backdrop-blur-sm border-slate-200 text-slate-500'}
      `}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A2 2 0 013 15.487V6.513a2 2 0 011.553-1.943L9 2l5.447 2.724A2 2 0 0116 6.513v8.974a2 2 0 01-1.553 1.943L9 20z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 2v18M3 6.513l6 3L15 6.513M3 15.487l6 3 6-3" />
        </svg>
      </button>
    </div>
  );
};

export default MapStyleSwitcher;
