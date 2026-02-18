
import React from 'react';
import { LandmarkCategory } from '../types';

interface FilterOption {
  id: LandmarkCategory;
  label: string;
  icon: React.ReactNode;
}

interface NearbyFilterBarProps {
  activeFilters: Set<LandmarkCategory>;
  onToggleFilter: (id: LandmarkCategory) => void;
}

const filters: FilterOption[] = [
  {
    id: 'school',
    label: 'Schools',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
  },
  {
    id: 'leisure',
    label: 'Leisure',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
      </svg>
    ),
  },
  {
    id: 'culture',
    label: 'Culture',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: 'hotel',
    label: 'Hotels',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: 'retail',
    label: 'Retail',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
];

const NearbyFilterBar: React.FC<NearbyFilterBarProps> = ({ activeFilters, onToggleFilter }) => {
  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[2000] flex bg-white/90 backdrop-blur-md px-2 py-1.5 rounded-full shadow-2xl border border-white/50 space-x-1 items-center">
      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-3 pr-2 border-r border-gray-200">
        Nearby
      </span>
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onToggleFilter(filter.id)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
            activeFilters.has(filter.id)
              ? 'bg-indigo-600 text-white shadow-lg scale-105'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          {filter.icon}
          <span className="text-[10px] font-black uppercase tracking-widest">{filter.label}</span>
        </button>
      ))}
    </div>
  );
};

export default NearbyFilterBar;
