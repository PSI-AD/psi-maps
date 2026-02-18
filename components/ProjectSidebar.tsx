import React, { useState } from 'react';
import { Project } from '../types';

interface ProjectSidebarProps {
  project: Project | null;
  onClose: () => void;
  onDiscoverNeighborhood: (lat: number, lng: number) => Promise<void>;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ project, onClose, onDiscoverNeighborhood }) => {
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);

  if (!project) return null;

  const handleDiscovery = async () => {
    setIsDiscovering(true);
    await new Promise(r => setTimeout(r, 800)); // Cinematic delay
    await onDiscoverNeighborhood(project.latitude, project.longitude);
    setIsDiscovering(false);
  };

  const images = project.images && project.images.length > 0 ? project.images : [project.thumbnailUrl];
  const displayImage = activeImage || images[0] || project.thumbnailUrl;

  return (
    <div className="h-full flex flex-col bg-white text-slate-800 font-sans shadow-2xl relative">

      {/* 1. Hero Image Section */}
      <div className="relative h-72 w-full shrink-0 bg-slate-100 group">
        <img
          src={displayImage}
          alt={project.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-full transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="absolute bottom-4 left-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-blue-600/90 text-[10px] font-bold uppercase tracking-widest rounded-sm">{project.type}</span>
            <span className="px-2 py-0.5 bg-emerald-600/90 text-[10px] font-bold uppercase tracking-widest rounded-sm">{project.status}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight leading-none drop-shadow-md">{project.name}</h1>
        </div>
      </div>

      {/* 2. Horizontal Gallery */}
      {images.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto bg-slate-50 border-b border-slate-100 custom-scrollbar shrink-0">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveImage(img)}
              className={`relative w-24 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${activeImage === img ? 'border-blue-600 ring-2 ring-blue-100' : 'border-transparent opacity-80 hover:opacity-100'}`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

        {/* 3. Header & Location */}
        <div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-0.5">{project.developerName}</h2>
              <div className="flex items-center text-slate-400 text-xs font-medium">
                <span>{project.city}</span>
                <svg className="w-3 h-3 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                <span>{project.community}</span>
                {project.subCommunity && (
                  <>
                    <svg className="w-3 h-3 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    <span>{project.subCommunity}</span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 font-bold uppercase">Starting From</p>
              <p className="text-xl font-black text-blue-600">{project.priceRange ? project.priceRange.split('-')[0] : 'Enquire'}</p>
            </div>
          </div>
        </div>

        {/* 4. Data Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Bedrooms</p>
            <p className="font-bold text-slate-800">{project.bedrooms || 'Studio - 3'}</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Bathrooms</p>
            <p className="font-bold text-slate-800">{project.bathrooms || '1 - 4'}</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Completion</p>
            <p className="font-bold text-slate-800">{project.completionDate || 'Ready'}</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Built-up Area</p>
            <p className="font-bold text-slate-800">{project.builtupArea ? `${Number(project.builtupArea).toLocaleString()} sqft` : 'N/A'}</p>
          </div>
        </div>

        {/* 5. Description */}
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">About {project.name}</h3>
          <div
            className="text-sm text-slate-600 leading-relaxed space-y-2 prose-sm"
            dangerouslySetInnerHTML={{ __html: project.description || 'No description available.' }}
          />
        </div>

        {/* 6. Amenities */}
        {project.amenities && project.amenities.length > 0 && (
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {project.amenities.map((amenity, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-slate-50 text-slate-600 text-[11px] font-bold uppercase tracking-wider border border-slate-100 rounded-md">
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-white border-t border-slate-100 z-10 shrink-0 space-y-3">
        <button
          onClick={handleDiscovery}
          disabled={isDiscovering}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all hover:shadow-lg disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {isDiscovering ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span>Analyzing Location...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span>Explore Neighborhood</span>
            </>
          )}
        </button>
        <a href={project.projectUrl} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3 border border-slate-200 hover:border-slate-800 text-slate-800 font-bold text-xs uppercase tracking-widest rounded-xl transition-all">
          Register Interest
        </a>
      </div>
    </div>
  );
};

export default ProjectSidebar;
