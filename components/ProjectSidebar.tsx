import React, { useState } from 'react';
import { Project } from '../types';
import { X, MapPin, BedDouble, Bath, Square, Calendar, ArrowRight, Activity, Building, LayoutTemplate } from 'lucide-react';
import { getOptimizedImageUrl } from '../utils/imageHelpers';

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
    <div className="h-full flex flex-col bg-white text-slate-800 font-sans shadow-2xl relative border-l border-slate-200">

      {/* 1. Hero Image Section */}
      <div className="relative h-80 w-full shrink-0 bg-slate-100 group">
        <img
          src={getOptimizedImageUrl(displayImage, 1200, 800)}
          alt={project.name}
          className="w-full h-full object-cover transition-transform duration-1000 ease-in-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-2 rounded-full transition-all border border-white/20 hover:border-white/50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="absolute bottom-6 left-6 right-6 text-white text-shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-blue-600/90 text-[10px] font-bold uppercase tracking-widest rounded-sm shadow-sm backdrop-blur-sm">{project.status}</span>
            {project.type && <span className="px-3 py-1 bg-slate-800/80 text-[10px] font-bold uppercase tracking-widest rounded-sm shadow-sm backdrop-blur-sm border border-slate-700">{project.type}</span>}
          </div>
          <h1 className="text-3xl font-black tracking-tight leading-tight mb-1">{project.name}</h1>
          <p className="text-slate-300 font-medium text-sm tracking-wide">{project.developerName}</p>
        </div>
      </div>

      {/* 2. Horizontal Gallery */}
      {images.length > 1 && (
        <div className="flex gap-3 p-4 overflow-x-auto bg-slate-50 border-b border-slate-200 custom-scrollbar shrink-0">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveImage(img)}
              className={`relative w-28 h-20 shrink-0 rounded-lg overflow-hidden border-2 transition-all shadow-sm ${activeImage === img ? 'border-blue-600 ring-2 ring-blue-100 opacity-100' : 'border-transparent opacity-70 hover:opacity-100 hover:border-slate-300'}`}
            >
              <img src={getOptimizedImageUrl(img, 200, 150)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 custom-scrollbar bg-white">

        {/* 3. Header & Location */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-6">
          <div className="flex-1">
            <div className="flex items-center text-blue-600 text-xs font-bold uppercase tracking-widest mb-1.5">
              <MapPin className="w-3.5 h-3.5 mr-1.5" />
              <span>{project.community}</span>
              {project.city && (
                <>
                  <span className="mx-2 text-slate-300">/</span>
                  <span className="text-slate-500">{project.city}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 4. Data Grid (Vector Icons) - Strictly Conditional */}
        <div className="grid grid-cols-2 gap-4">

          {/* Price - Only show if valid */}
          {project.priceRange && project.priceRange !== '0' && project.priceRange !== '0.00' && (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3 hover:border-slate-200 transition-colors col-span-2">
              <Building className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Starting Price</p>
                <p className="font-bold text-slate-900 text-lg">AED {project.priceRange.split('-')[0].trim()}</p>
              </div>
            </div>
          )}

          {project.bedrooms && project.bedrooms !== 'N/A' && (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3 hover:border-slate-200 transition-colors">
              <BedDouble className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Bedrooms</p>
                <p className="font-bold text-slate-800 text-sm">{project.bedrooms}</p>
              </div>
            </div>
          )}

          {project.bathrooms && project.bathrooms !== 'N/A' && project.bathrooms !== '0' && (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3 hover:border-slate-200 transition-colors">
              <Bath className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Bathrooms</p>
                <p className="font-bold text-slate-800 text-sm">{project.bathrooms}</p>
              </div>
            </div>
          )}

          {project.completionDate && (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3 hover:border-slate-200 transition-colors">
              <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Completion</p>
                <p className="font-bold text-slate-800 text-sm">{project.completionDate}</p>
              </div>
            </div>
          )}

          {project.builtupArea && project.builtupArea !== 0 && (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3 hover:border-slate-200 transition-colors">
              <Square className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Built-up Area</p>
                <p className="font-bold text-slate-800 text-sm">{Number(project.builtupArea).toLocaleString()} sqft</p>
              </div>
            </div>
          )}
        </div>

        {/* 5. Description */}
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center">
            <Activity className="w-4 h-4 mr-2 text-blue-600" />
            About The Project
          </h3>
          <div
            className="text-sm text-slate-600 leading-relaxed space-y-4 prose-sm prose-p:mb-2 prose-strong:text-slate-900"
            dangerouslySetInnerHTML={{ __html: project.description || 'No detailed description available.' }}
          />
        </div>

        {/* 6. Amenities */}
        {project.amenities && project.amenities.length > 0 && (
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center">
              <LayoutTemplate className="w-4 h-4 mr-2 text-blue-600" />
              Lifestyle Amenities
            </h3>
            <div className="flex flex-wrap gap-2">
              {project.amenities.map((amenity, idx) => (
                <div key={idx} className="px-3 py-2 bg-white text-slate-600 text-[11px] font-bold uppercase tracking-wider border border-slate-200 rounded-lg shadow-sm flex items-center gap-2 hover:border-blue-200 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {amenity}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Footer Actions */}
      <div className="p-6 bg-white border-t border-slate-100 z-10 shrink-0 space-y-3 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
        <button
          onClick={handleDiscovery}
          disabled={isDiscovering}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all hover:shadow-xl hover:shadow-slate-200 active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-3"
        >
          {isDiscovering ? (
            <>
              <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span className="text-blue-50">Analyzing Location...</span>
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 text-blue-500" />
              <span>Explore Neighborhood</span>
            </>
          )}
        </button>
        <a href={project.projectUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full py-4 border border-slate-200 hover:border-blue-600 text-slate-800 hover:text-blue-700 bg-slate-50 hover:bg-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all gap-2 group">
          <span>Request Floor Plans</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </a>
      </div>
    </div>
  );
};

export default ProjectSidebar;
