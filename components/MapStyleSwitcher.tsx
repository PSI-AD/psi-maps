
import React, { useState } from 'react';

import { Map } from 'lucide-react';

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
        absolute bottom-0 left-0 flex items-center bg-white/95 backdrop-blur-md rounded-full border border-slate-200/50 p-1 gap-1 transition-all duration-300 origin-left
        ${isHovered ? 'opacity-100 translate-x-14 scale-100 visible' : 'opacity-0 translate-x-0 scale-90 invisible'}
      `}>
        {styles.map((style) => (
          <button
            key={style.id}
            onClick={() => onStyleChange(style.url)}
            className={`
              whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all
              ${currentStyle === style.url
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'}
            `}
          >
            {style.name}
          </button>
        ))}
      </div>

      {/* Main Toggle Button */}
      <button className={`
        z-10 w-12 h-12 bg-white text-blue-600 rounded-full shadow-xl flex items-center justify-center border border-slate-100 hover:bg-slate-50 transition-all
      `}>
        <Map className="w-6 h-6" />
      </button>
    </div>
  );
};

export default MapStyleSwitcher;
