
import React from 'react';
import { LandmarkCategory } from '../types';

interface AmenityFilterBarProps {
  activeFilters: string[];
  onToggle: (category: string) => void;
  isDrawActive: boolean;
  onToggleDraw: () => void;
}

interface FilterOption {
  id: LandmarkCategory | 'draw';
  label: string;
  tooltip: string;
  icon: React.ReactNode;
}

const options: FilterOption[] = [
  {
    id: 'school',
    label: 'Schools',
    tooltip: 'Education & Schools',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    )
  },
  {
    id: 'hotel',
    label: 'Hotels',
    tooltip: 'Luxury Hotels & Resorts',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  {
    id: 'culture',
    label: 'Culture',
    tooltip: 'Museums & Cultural Landmarks',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
      </svg>
    )
  },
  {
    id: 'leisure',
    label: 'Leisure',
    tooltip: 'Leisure & Beach Clubs',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.921-.755 1.688-1.54 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.364-1.118L2.05 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    )
  },
  {
    id: 'retail',
    label: 'Retail',
    tooltip: 'High-end Retail & Shopping',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    )
  },
];

const AmenityFilterBar: React.FC<AmenityFilterBarProps> = ({ activeFilters, onToggle, isDrawActive, onToggleDraw }) => {
  return (
    <div className="max-w-[calc(100vw-32px)] flex bg-white/95 md:bg-white/80 backdrop-blur-xl p-1.5 rounded-full shadow-2xl border border-slate-200/60 items-center overflow-hidden">
      {/* Sticky Label Section */}
      <div className="hidden md:flex px-4 border-r border-slate-200 py-1 shrink-0">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neighborhood</span>
      </div>

      {/* Scrollable Button Container */}
      <div className="flex gap-2 px-2 overflow-x-auto whitespace-nowrap hide-scrollbar scroll-smooth items-center">
        {/* Draw Area Button */}
        <button
          onClick={onToggleDraw}
          title="Draw Area to Search"
          className={`
            flex items-center justify-center gap-2.5 transition-all duration-300 border shrink-0
            w-12 h-12 md:w-auto md:h-auto md:px-5 md:py-2.5 rounded-full
            ${isDrawActive
              ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200/50'
              : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'}
          `}
        >
          <div className="shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <span className="hidden md:inline text-[10px] font-black uppercase tracking-wider">
            Draw Area
          </span>
        </button>

        <div className="w-px h-6 bg-slate-200 mx-1 shrink-0"></div>

        {options.map((opt) => {
          const isActive = activeFilters.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => onToggle(opt.id)}
              title={opt.tooltip}
              className={`
                flex items-center justify-center gap-2.5 transition-all duration-300 border shrink-0
                w-12 h-12 md:w-auto md:h-auto md:px-5 md:py-2.5 rounded-full
                ${isActive
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200/50'
                  : 'bg-transparent text-slate-500 border-transparent hover:text-slate-900 hover:bg-slate-100/80'}
              `}
            >
              <div className="shrink-0">
                {opt.icon}
              </div>
              <span className="hidden md:inline text-[10px] font-black uppercase tracking-wider">
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AmenityFilterBar;
