import React from 'react';
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

  const handleSearchSelect = (project: Project) => {
    onFlyTo(project.latitude, project.longitude);
    onProjectClick(project.id);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-900 font-sans relative">
      <TopNavBar onAdminClick={() => setIsAdminOpen(true)} />

      {isAdminOpen && (
        <AdminDashboard onClose={() => setIsAdminOpen(false)} liveProjects={liveProjects} setLiveProjects={setLiveProjects} />
      )}

      {isRefreshing && (
        <div className="absolute inset-0 z-[6000] flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-xl">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
          <h2 className="text-2xl font-black text-white tracking-widest uppercase">Initializing</h2>
          <p className="text-slate-300 mt-2 font-medium tracking-wide text-sm">Loading Premium Properties...</p>
        </div>
      )}

      <div className="absolute inset-0 top-20 z-0">
        {children}
      </div>

      {/* Floating Search Bar (Top Center for better symmetry) */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-[400px] px-4">
        <SearchBar projects={liveProjects} onSelectProject={handleSearchSelect} />
      </div>

      {/* Control Center Dock (Bottom Center) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <FloatingMapTools
            activeFilters={activeAmenities}
            onToggle={onToggleAmenity}
            isDrawActive={isDrawing}
            onToggleDraw={onToggleDraw}
          />
        </div>
      </div>

      {/* Map Style Switcher (Bottom Left) */}
      <div className="absolute bottom-8 left-6 z-40 hidden sm:block">
        <MapStyleSwitcher currentStyle={mapStyle} onStyleChange={setMapStyle} />
      </div>

      {/* Slimmed Down Project Sidebar (w-[380px] on desktop, full width on mobile) */}
      {isAnalysisOpen && selectedProject && (
        <div className="absolute top-20 right-0 bottom-0 w-full md:w-[380px] z-[5000] shadow-2xl bg-white transition-transform transform translate-x-0 border-l border-slate-200">
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
  );
};

export default MainLayout;
