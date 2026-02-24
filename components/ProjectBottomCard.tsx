
import React from 'react';
import { Project } from '../types';

interface ProjectBottomCardProps {
  project: Project | null;
  onViewDetails: () => void;
  onClose: () => void;
}

const ProjectBottomCard: React.FC<ProjectBottomCardProps> = ({ project, onViewDetails, onClose }) => {
  if (!project) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full md:bottom-6 md:left-auto md:right-6 md:w-[420px] z-[5000] animate-in slide-in-from-bottom-full duration-300">
      {/* Container - Reduced height on mobile to 30vh / max 220px */}
      <div className="bg-white md:rounded-2xl rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] md:shadow-2xl border-t md:border border-slate-100 overflow-hidden flex flex-col h-[30vh] max-h-[220px] md:h-auto md:max-h-none">

        {/* Swipe Handle Indicator (Mobile Only) */}
        <div className="flex justify-center pt-2 pb-1 md:hidden">
          <div className="w-8 h-1 bg-slate-200 rounded-full"></div>
        </div>

        {/* Close Button - More compact on mobile */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 md:top-4 md:right-4 z-10 p-1.5 md:p-2 bg-slate-50/90 hover:bg-slate-100 text-slate-500 rounded-full transition-colors backdrop-blur-sm border border-slate-100"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-row flex-1 p-3 md:p-5 gap-3 md:gap-4 min-h-0">
          {/* Thumbnail - Small & Sleek on mobile */}
          <div className="w-20 h-20 md:w-32 md:h-32 shrink-0 overflow-hidden rounded-lg bg-slate-100">
            <img
              src={project.thumbnailUrl}
              alt={project.name}
              className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
            />
          </div>

          {/* Content - High Density Icon Grid */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div className="pr-6"> {/* Space for close button */}
              <h2 className="text-sm md:text-xl font-black text-slate-900 tracking-tight leading-tight truncate">
                {project.name}
              </h2>
              <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest truncate">
                {project.developerName}
              </p>

              {/* Tight Icon Grid for Details */}
              <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1.5 md:gap-4">
                {/* Price Item */}
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="text-[10px] md:text-xs font-black text-slate-800 truncate">
                    {(() => {
                      const raw = project.priceRange?.split('-')[0].trim().replace(/[^0-9.]/g, '');
                      const num = Number(raw);
                      return raw && !isNaN(num) && num > 0
                        ? `AED ${num.toLocaleString()}`
                        : <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Price on Request</span>;
                    })()}
                  </span>
                </div>
                {/* Bed Item */}
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="text-[10px] md:text-xs font-black text-slate-800 truncate">
                    {project.type === 'villa' ? '4-6 Bed' : '1-3 Bed'}
                  </span>
                </div>
                {/* Size Item */}
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  <span className="text-[10px] md:text-xs font-black text-slate-800 truncate">
                    ~{project.type === 'villa' ? '4,500' : '1,200'} sqft
                  </span>
                </div>
                {/* Yield Item (Bonus) */}
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="text-[10px] md:text-xs font-black text-emerald-600 truncate">
                    ~8.5% ROI
                  </span>
                </div>
              </div>
            </div>

            {/* Actions - Snug & Compact */}
            <div className="mt-auto flex items-center gap-2">
              <button
                onClick={onViewDetails}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-2 rounded-lg text-[9px] uppercase tracking-widest transition-all shadow-md shadow-blue-100 active:scale-95"
              >
                AI Insights
              </button>
              <button
                className="px-3 py-2 border border-slate-900 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-900 hover:bg-slate-900 hover:text-white transition-all shrink-0 active:scale-95"
              >
                Contact
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectBottomCard;
