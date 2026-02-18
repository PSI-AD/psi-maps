
import React, { useState, useEffect, useMemo } from 'react';
import { Project } from '../types';

interface ProjectListSidebarProps {
  project: Project | null;
  onClose: () => void;
  onOpenAnalysis: () => void;
  isInline?: boolean;
}

const ProjectListSidebar: React.FC<ProjectListSidebarProps> = ({ project, onClose, onOpenAnalysis, isInline = false }) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const galleryImages = useMemo(() => {
    if (!project) return [];
    const themes = ['architecture', 'luxury-interior', 'modern-building', 'penthouse', 'swimming-pool'];
    return [
      project.thumbnailUrl,
      ...themes.map(theme => `https://images.unsplash.com/photo-${
        project.id === 'saad-1' ? '1600607687969-b6139b5f40bb' : 
        project.id === 'saad-2' ? '1512917774080-9991f1c4c750' :
        '1613490493576-7fde63acd811'
      }?auto=format&fit=crop&w=800&q=80&sig=${project.id}-${theme}`)
    ].slice(0, 5);
  }, [project]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [project]);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  if (!project) return null;

  const containerClasses = isInline 
    ? "flex flex-col h-full w-full bg-white overflow-hidden"
    : "fixed top-20 right-0 h-[calc(100vh-80px)] bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.05)] transition-transform duration-500 ease-out z-[3500] w-full sm:w-[450px] flex flex-col border-l border-gray-100 translate-x-0";

  return (
    <div className={containerClasses}>
      {/* Sidebar Header - Reduced Padding */}
      <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
        <button 
          onClick={onClose} 
          className="flex items-center space-x-2 text-slate-400 hover:text-slate-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-widest">Back to list</span>
        </button>
        <h2 className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Asset Details</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Premium Image Gallery - Sleek & Edge-to-edge */}
        <div className="relative w-full h-64 bg-slate-900 group overflow-hidden shrink-0">
          <div 
            className="flex transition-transform duration-700 cubic-bezier(0.4, 0, 0.2, 1) h-full" 
            style={{ transform: `translateX(-${activeImageIndex * 100}%)` }}
          >
            {galleryImages.map((img, idx) => (
              <img 
                key={idx} 
                src={img} 
                className="w-full h-full object-cover shrink-0 select-none" 
                alt={`${project.name} view ${idx + 1}`} 
              />
            ))}
          </div>
          
          <button 
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 bg-black/10 hover:bg-black/30 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button 
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-black/10 hover:bg-black/30 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-md text-white px-2.5 py-0.5 rounded-full text-[8px] font-black tracking-widest">
            {activeImageIndex + 1} / {galleryImages.length}
          </div>
        </div>

        {/* Content Section - High Density Grid */}
        <div className="px-5 py-4 space-y-5">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-wider rounded">
                {project.type}
              </span>
              <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Saadiyat Island</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
              {project.name}
            </h1>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
              {project.developerName}
            </p>
          </div>

          {/* Key Specifications Grid - Dense Info */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-4 border-y border-slate-50">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 text-slate-300">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Starting Price</p>
                <p className="text-xs font-black text-slate-800">{project.priceRange?.split('-')[0].trim() || 'POA'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5 text-slate-300">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Asset Class</p>
                <p className="text-xs font-black text-slate-800 capitalize">{project.type}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5 text-slate-300">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Configurations</p>
                <p className="text-xs font-black text-slate-800">{project.type === 'villa' ? '4 - 6 Bed' : 'Studio - 3 Bed'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5 text-slate-300">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Handover</p>
                <p className="text-xs font-black text-slate-800">Q4 2026 (Est.)</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Project Summary</h3>
            <p className="text-slate-500 text-[11px] leading-relaxed font-medium">
              {project.description || "Premium high-yield residential asset positioned within Saadiyat's flagship growth corridor."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-y-3 gap-x-4">
            {['Private Pool', 'Gymnasium', 'Beach Access', '24/7 Security'].map((feature) => (
              <div key={feature} className="flex items-center space-x-2 group">
                <div className="w-5 h-5 rounded bg-blue-50 flex items-center justify-center transition-colors group-hover:bg-blue-600">
                  <svg className="w-2.5 h-2.5 text-blue-600 transition-colors group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight group-hover:text-slate-900 transition-colors">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Actions - Streamlined */}
      <div className="p-4 bg-slate-50 border-t border-gray-100 flex flex-col gap-2 shrink-0">
        <button 
          onClick={onOpenAnalysis}
          className="w-full bg-white hover:bg-slate-100 text-blue-700 py-3 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-200 shadow-sm"
        >
          Detailed ROI Analysis
        </button>
        <button 
          className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md"
        >
          Register Interest
        </button>
      </div>
    </div>
  );
};

export default ProjectListSidebar;
