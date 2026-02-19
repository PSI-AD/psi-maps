import React, { useState } from 'react';
import { Project } from '../types';
import TopNavBar from './TopNavBar';
import AdminDashboard from './AdminDashboard';
import ProjectSidebar from './ProjectSidebar';
import FloatingMapTools from './FloatingMapTools';
import MapStyleSwitcher from './MapStyleSwitcher';
import SearchBar from './SearchBar';
import { Loader2 } from 'lucide-react';

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
  activeAmenities: string[];
  onToggleAmenity: (cat: string) => void;
  isDrawing: boolean;
  onToggleDraw: () => void;
  mapStyle: string;
  setMapStyle: (s: string) => void;
  children: React.ReactNode;
  onDiscoverNeighborhood: (lat: number, lng: number) => void;
  onFlyTo: (lat: number, lng: number) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  isAdminOpen, setIsAdminOpen,
  isAnalysisOpen, setIsAnalysisOpen, liveProjects, setLiveProjects,
  selectedProject, isRefreshing,
  onProjectClick, onCloseProject,
  activeAmenities, onToggleAmenity, isDrawing, onToggleDraw,
  mapStyle, setMapStyle, children, onDiscoverNeighborhood, onFlyTo
}) => {
  const [currentViewLocation, setCurrentViewLocation] = useState('UAE Overview');

  const handleSearchSelect = (project: Project) => {
    onFlyTo(project.latitude, project.longitude);
    setCurrentViewLocation(project.name);
    onProjectClick(project.id);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-900 font-sans">
      <TopNavBar onAdminClick={() => setIsAdminOpen(true)} />
      
      {isAdminOpen && (
        <AdminDashboard onClose={() => setIsAdminOpen(false)} liveProjects={liveProjects} setLiveProjects={setLiveProjects} />
      )}

      {/* Luxury Loading Screen */}
      {isRefreshing && (
        <div className="fixed inset-0 z-[6000] flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-xl transition-all duration-500">
          <Loader2 className="w-16 h-16 text-amber-500 animate-spin mb-6" />
          <h2 className="text-2xl font-black text-white tracking-widest uppercase">Initializing</h2>
          <p className="text-slate-300 mt-2 font-medium tracking-wide text-sm">Loading Premium Properties...</p>
        </div>
      )}

      {/* Main Map Container - Full Screen */}
      <div className="flex-1 w-full h-full relative mt-20">
        
        {/* The Map itself */}
        <div className="absolute inset-0 z-0">
          {children}
        </div>

        {/* Floating Search Bar (Top Left) */}
        <div className="absolute top-6 left-6 z-40 w-96 max-w-[calc(100vw-3rem)]">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-4 border border-slate-200/50">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Property Search</h3>
            <SearchBar projects={liveProjects} onSelectProject={handleSearchSelect} />
          </div>
        </div>

        {/* Floating Map Tools (Bottom Right) */}
        <div className="absolute bottom-10 right-6 z-40 flex flex-col items-end gap-4">
          <FloatingMapTools
            activeFilters={activeAmenities}
            onToggle={onToggleAmenity}
            isDrawActive={isDrawing}
            onToggleDraw={onToggleDraw}
          />
        </div>

        {/* Map Style Switcher (Bottom Left) */}
        <div className="absolute bottom-10 left-6 z-40">
          <MapStyleSwitcher currentStyle={mapStyle} onStyleChange={setMapStyle} />
        </div>

        {/* Luxury Project Sidebar */}
        {isAnalysisOpen && selectedProject && (
          <div className="fixed inset-0 z-[5000] md:absolute md:inset-auto md:right-0 md:top-0 md:bottom-0 md:w-[500px] shadow-2xl bg-white transition-transform transform translate-x-0">
            <ProjectSidebar 
              project={selectedProject} 
              onClose={() => {
                setIsAnalysisOpen(false);
                onCloseProject();
              }} 
              onDiscoverNeighborhood={onDiscoverNeighborhood} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MainLayout;