import React, { useState } from 'react';
import { Project } from '../types';
import AdminDashboard from './AdminDashboard';
import ProjectSidebar from './ProjectSidebar';
import FloatingMapTools from './FloatingMapTools';
import MapStyleSwitcher from './MapStyleSwitcher';
import BottomControlBar from './BottomControlBar';
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
  onFlyTo: (lng: number, lat: number, zoom?: number) => void;
  mapFeatures: { show3D: boolean; showAnalytics: boolean };
  setMapFeatures: React.Dispatch<React.SetStateAction<{ show3D: boolean; showAnalytics: boolean }>>;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  isAdminOpen, setIsAdminOpen,
  isAnalysisOpen, setIsAnalysisOpen, liveProjects, setLiveProjects,
  selectedProject, isRefreshing,
  onProjectClick, onCloseProject,
  activeAmenities, onToggleAmenity, isDrawing, onToggleDraw,
  mapStyle, setMapStyle, children, onDiscoverNeighborhood, onFlyTo,
  mapFeatures, setMapFeatures
}) => {
  const [isNearbyToolsOpen, setIsNearbyToolsOpen] = useState(false);

  const handleSearchSelect = (project: Project) => {
    onFlyTo(project.longitude, project.latitude, 16);
    onProjectClick(project.id);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-900 font-sans relative">

      {isAdminOpen && (
        <AdminDashboard
          onClose={() => setIsAdminOpen(false)}
          liveProjects={liveProjects}
          setLiveProjects={setLiveProjects}
          mapFeatures={mapFeatures}
          setMapFeatures={setMapFeatures}
        />
      )}

      {isRefreshing && (
        <div className="absolute inset-0 z-[7000] flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-xl">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
          <h2 className="text-2xl font-black text-white tracking-widest uppercase">Initializing</h2>
          <p className="text-slate-300 mt-2 font-medium tracking-wide text-sm">Loading Premium Properties...</p>
        </div>
      )}

      {/* Main Map Container - completely flush with the bottom */}
      <div className="absolute inset-0 top-20 z-0 bg-slate-100">
        {children}
      </div>

      {/* Floating Tools sitting above the bottom bar */}
      <div className="absolute bottom-28 right-6 z-40 pointer-events-none">
        <div className="pointer-events-auto">
          <FloatingMapTools
            activeFilters={activeAmenities}
            onToggle={onToggleAmenity}
            isDrawActive={isDrawing}
            onToggleDraw={onToggleDraw}
            isOpen={isNearbyToolsOpen}
            onToggleOpen={() => setIsNearbyToolsOpen(!isNearbyToolsOpen)}
          />
        </div>
      </div>

      {/* Map Style Switcher (Bottom Left, above dock) */}
      <div className="absolute bottom-28 left-6 z-40 hidden sm:block">
        <MapStyleSwitcher currentStyle={mapStyle} onStyleChange={setMapStyle} />
      </div>

      {/* Analysis Sidebar */}
      {isAnalysisOpen && selectedProject && (
        <div className="absolute top-0 right-0 bottom-24 w-full md:w-[380px] z-[5000] shadow-2xl bg-white transition-transform transform translate-x-0 border-l border-slate-200 overflow-y-auto">
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

      {/* The New Bottom Dock */}
      <BottomControlBar
        projects={liveProjects}
        onSelectProject={handleSearchSelect}
        onAdminClick={() => setIsAdminOpen(true)}
        onFlyTo={onFlyTo}
        onToggleNearby={() => setIsNearbyToolsOpen(!isNearbyToolsOpen)}
        onToggleFilters={() => { }} // Could be wired later
      />
    </div>
  );
};

export default MainLayout;
