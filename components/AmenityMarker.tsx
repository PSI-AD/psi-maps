
import React from 'react';
import { Marker } from 'react-map-gl';
import { Landmark, LandmarkCategory } from '../types';

interface AmenityMarkerProps {
  amenity: Landmark;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const categoryConfig: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  school: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500',
    text: 'text-emerald-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M12 14l9-5-9-5-9 5 9 5z" strokeWidth="2" />
        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" strokeWidth="2" />
      </svg>
    ),
  },
  hotel: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500',
    text: 'text-blue-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeWidth="2" />
      </svg>
    ),
  },
  culture: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500',
    text: 'text-purple-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" strokeWidth="2" />
      </svg>
    ),
  },
  leisure: {
    bg: 'bg-teal-500/10',
    border: 'border-teal-500',
    text: 'text-teal-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2" />
      </svg>
    ),
  },
  retail: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500',
    text: 'text-rose-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeWidth="2" />
      </svg>
    ),
  },
  hospital: {
    bg: 'bg-red-500/10',
    border: 'border-red-500',
    text: 'text-red-600',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 12h4m-2-2v4" />
      </svg>
    ),
  },
  airport: {
    bg: 'bg-sky-500/10',
    border: 'border-sky-500',
    text: 'text-sky-600',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-.5-.5-2.5 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.6L3 8l6 4.5-3 3-2.5-.5L2 16l4 2 2 4 1-1.5-.5-2.5 3-3 4.5 6 1.2-.7c.4-.2.7-.6.6-1.1z" />
      </svg>
    ),
  },
  port: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500',
    text: 'text-cyan-600',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M2 21h20" />
        <path d="M3 15h18v2a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-2z" />
        <path d="M9 7v6" />
        <path d="M15 7v6" />
        <path d="M6 9h12" />
        <path d="M12 3v12" />
      </svg>
    ),
  },
};

const AmenityMarker: React.FC<AmenityMarkerProps> = ({ amenity, onClick, onMouseEnter, onMouseLeave }) => {
  const config = categoryConfig[amenity.category?.toLowerCase()] || categoryConfig['school'];

  return (
    <Marker longitude={amenity.longitude} latitude={amenity.latitude} anchor="center" onClick={onClick}>
      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="group relative flex items-center justify-center cursor-pointer transition-all duration-300 z-0"
      >
        {/* Elegant Badge Marker */}
        <div className={`
          w-12 h-12 rounded-full ${config.bg} ${config.text} ${config.border} border-2 shadow-sm
          backdrop-blur-sm flex items-center justify-center transition-all duration-300
          group-hover:shadow-lg group-hover:scale-110 group-hover:bg-white/90
        `}>
          {config.icon}
        </div>
      </div>
    </Marker>
  );
};

export default AmenityMarker;
