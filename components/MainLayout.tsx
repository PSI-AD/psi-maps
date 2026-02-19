import React, { useState } from 'react';
import { Project } from '../types';
import { Loader2 } from 'lucide-react';
import TopNavBar from './TopNavBar';
import AdminDashboard from './AdminDashboard';
import ProjectListSidebar from './ProjectListSidebar';
import ProjectSidebar from './ProjectSidebar';
import ProjectBottomCard from './ProjectBottomCard';
import FloatingMapTools from './FloatingMapTools';
import MapStyleSwitcher from './MapStyleSwitcher';
import SearchBar from './SearchBar';

interface MainLayoutProps {
  viewMode: 'map' | 'list';
  setViewMode: (mode: 'map' | 'list') => void;
  isAdminOpen: boolean;
  setIsAdminOpen: (isOpen: boolean) => void;
  isAnalysisOpen: boolean;
  setIsAnalysisOpen: (isOpen: boolean) => void;
  liveProjects: Project[];
  setLiveProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  selectedProject: Project | null;
  filteredProjects: Project[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onProjectClick: (id: string) => void;
  onCloseProject: () => void;
  filterPolygon: any;
  // Map props
  activeAmenities: string[];
  onToggleAmenity: (cat: string) => void;
  isDrawing: boolean;
  onToggleDraw: () => void;
  mapStyle: string;
  setMapStyle: (s: string) => void;
  children: React.ReactNode; // For MapCanvas
  // Sidebar extras
  onDiscoverNeighborhood: (lat: number, lng: number) => void;
  onFlyTo: (lat: number, lng: number) => void;
  mapFeatures: { show3D: boolean; showAnalytics: boolean };
  setMapFeatures: React.Dispatch<React.SetStateAction<{ show3D: boolean; showAnalytics: boolean }>>;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  viewMode, setViewMode, isAdminOpen, setIsAdminOpen,
  isAnalysisOpen, setIsAnalysisOpen, liveProjects, setLiveProjects,
  selectedProject, filteredProjects, isRefreshing, onRefresh,
  onProjectClick, onCloseProject, filterPolygon,
  activeAmenities, onToggleAmenity, isDrawing, onToggleDraw,
  mapStyle, setMapStyle, children, onDiscoverNeighborhood, onFlyTo,
  mapFeatures, setMapFeatures
}) => {
  const [currentViewLocation, setCurrentViewLocation] = useState('UAE Overview');

  const handleImageError = (e: any) => {
    e.currentTarget.src = 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80';
  };

  const handleSearchSelect = (project: Project) => {
    onFlyTo(project.latitude, project.longitude);
    setCurrentViewLocation(project.name);
    // Optional: Open sidebar or just focus map
    onProjectClick(project.id);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white font-sans">
      <TopNavBar onAdminClick={() => setIsAdminOpen(true)} />

      {/* Loading Screen Overlay */}
      {isRefreshing && (
        <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center transition-all duration-500">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
          <p className="text-slate-900 font-black uppercase tracking-[0.2em] text-sm animate-pulse">Loading Premium Assets...</p>
        </div>
      )}

      {isAdminOpen && (
        <AdminDashboard
          onClose={() => setIsAdminOpen(false)}
          liveProjects={liveProjects}
          setLiveProjects={setLiveProjects}
          mapFeatures={mapFeatures}
          setMapFeatures={setMapFeatures}
        />
      )}

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden mt-20 relative">
        <div className={`${viewMode === 'list' ? 'flex' : 'hidden md:flex'} w-full md:w-[400px] h-full overflow-y-auto bg-slate-50 z-10 md:z-0 border-r border-slate-200 flex-col relative custom-scrollbar`}>
          {selectedProject && !isAnalysisOpen ? (
            <ProjectListSidebar project={selectedProject} onClose={onCloseProject} onOpenAnalysis={() => setIsAnalysisOpen(true)} isInline={true} />
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-slate-200 bg-white sticky top-0 z-20">
                <div className="mb-6">
                  <SearchBar projects={liveProjects} onSelectProject={handleSearchSelect} />
                </div>
                <div className="flex justify-between items-end mb-1">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{currentViewLocation}</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{filterPolygon ? `${filteredProjects.length} Filtered Listings` : `${filteredProjects.length} Luxury Listings`}</p>
                  </div>
                  <button onClick={onRefresh} disabled={isRefreshing} className={`p-2 rounded-xl border border-slate-100 transition-all ${isRefreshing ? 'bg-blue-50 text-blue-600' : 'bg-white hover:bg-slate-50 text-slate-400'}`}>
                    <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 p-5 flex flex-col">
                {filteredProjects.map(project => (
                  <div key={project.id} onClick={() => { onProjectClick(project.id); setViewMode('map'); }} className="flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-5 transition-shadow hover:shadow-md cursor-pointer group">
                    <div className="w-full h-56 relative bg-slate-200"><img className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src={project.thumbnailUrl} alt={project.name} onError={handleImageError} /></div>
                    <div className="p-4 flex flex-col gap-1">
                      <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">{project.type}</span>
                      <p className="text-xl font-extrabold text-slate-800 mt-1">{project.priceRange ? project.priceRange.split('-')[0].trim() : 'Enquire'}</p>
                      <h3 className="text-lg font-bold text-slate-700 leading-tight">{project.name}</h3>
                      <p className="text-sm text-slate-500 mb-3">{project.developerName}</p>
                      <button className="bg-blue-700 hover:bg-blue-800 text-white w-full py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-[0.15em] transition-all shadow-lg shadow-blue-50 active:scale-[0.98]">View Details</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={`${viewMode === 'map' ? 'flex' : 'hidden md:flex'} flex-1 w-full h-full relative bg-slate-100`}>
          {children}

          {/* Floating Tools: Bottom-Center on Mobile, Bottom-Right on Desktop */}
          <div className="absolute bottom-24 right-4 md:bottom-10 md:right-10 z-[2000] flex flex-col items-end pointer-events-none">
            <div className="pointer-events-auto">
              <FloatingMapTools
                activeFilters={activeAmenities}
                onToggle={onToggleAmenity}
                isDrawActive={isDrawing}
                onToggleDraw={onToggleDraw}
              />
            </div>
          </div>

          <div className="md:hidden"><ProjectBottomCard project={selectedProject} onClose={onCloseProject} onViewDetails={() => setIsAnalysisOpen(true)} /></div>
          <div className="absolute bottom-20 md:bottom-6 left-6 z-[2000]"><MapStyleSwitcher currentStyle={mapStyle} onStyleChange={setMapStyle} /></div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[6000] md:hidden">
            <button onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')} className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest border border-blue-500 transition-all active:scale-95">
              {viewMode === 'map' ? <>Show List</> : <>Show Map</>}
            </button>
          </div>
        </div>

        {/* Analysis Sidebar (Overlay) */}
        {isAnalysisOpen && selectedProject && (
          <div className="fixed inset-0 z-[5000] md:z-[100] md:absolute md:inset-auto md:right-0 md:top-20 md:bottom-0 md:w-[600px] shadow-2xl">
            <ProjectSidebar project={selectedProject} onClose={() => setIsAnalysisOpen(false)} onDiscoverNeighborhood={onDiscoverNeighborhood} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MainLayout;
