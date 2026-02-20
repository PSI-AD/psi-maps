import React, { useState } from 'react';
import { Project, Landmark } from '../types';
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
  liveLandmarks: Landmark[];
  setLiveLandmarks: React.Dispatch<React.SetStateAction<Landmark[]>>;
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
  propertyType: string;
  setPropertyType: (type: string) => void;
  developerFilter: string;
  setDeveloperFilter: (dev: string) => void;
  statusFilter: string;
  setStatusFilter: (stat: string) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  selectedCommunity: string;
  setSelectedCommunity: (comm: string) => void;
  handleFitBounds: (projects: Project[]) => void;
  handleLocationSelect: (locationName: string) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  isAdminOpen, setIsAdminOpen,
  isAnalysisOpen, setIsAnalysisOpen, liveProjects, setLiveProjects,
  liveLandmarks, setLiveLandmarks,
  selectedProject, isRefreshing,
  onProjectClick, onCloseProject,
  activeAmenities, onToggleAmenity, isDrawing, onToggleDraw,
  mapStyle, setMapStyle, children, onDiscoverNeighborhood, onFlyTo,
  mapFeatures, setMapFeatures,
  propertyType, setPropertyType,
  developerFilter, setDeveloperFilter,
  statusFilter, setStatusFilter,
  selectedCity, setSelectedCity,
  selectedCommunity, setSelectedCommunity,
  handleFitBounds,
  handleLocationSelect
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
          liveLandmarks={liveLandmarks}
          setLiveLandmarks={setLiveLandmarks}
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
      <div className="absolute inset-0 z-0 bg-slate-100">
        {children}
      </div>

      {/* Top Gradient Overlay */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-slate-900/80 to-transparent pointer-events-none z-40"></div>

      {/* Breadcrumbs Navigation */}
      <div className="absolute top-6 left-6 z-50 pointer-events-auto flex items-center gap-2 text-white text-sm font-bold drop-shadow-md">
        <button onClick={() => { setSelectedCity(''); setSelectedCommunity(''); onCloseProject(); handleLocationSelect(''); }} className="hover:text-blue-400 transition-colors">UAE</button>

        {selectedCity && (
          <>
            <span className="text-slate-400">/</span>
            <button onClick={() => { setSelectedCommunity(''); onCloseProject(); handleLocationSelect(selectedCity); }} className="hover:text-blue-400 transition-colors capitalize">{selectedCity}</button>
          </>
        )}

        {selectedCommunity && (
          <>
            <span className="text-slate-400">/</span>
            <button onClick={() => { onCloseProject(); handleLocationSelect(selectedCommunity); }} className="hover:text-blue-400 transition-colors capitalize">{selectedCommunity}</button>
          </>
        )}

        {selectedProject && (
          <>
            <span className="text-slate-400">/</span>
            <span className="text-blue-400 capitalize">{selectedProject.name}</span>
          </>
        )}
      </div>

      <FloatingMapTools
        activeFilters={activeAmenities}
        onToggle={onToggleAmenity}
        isDrawActive={isDrawing}
        onToggleDraw={onToggleDraw}
        isOpen={isNearbyToolsOpen}
        onToggleOpen={() => setIsNearbyToolsOpen(!isNearbyToolsOpen)}
      />

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
        propertyType={propertyType}
        setPropertyType={setPropertyType}
        developerFilter={developerFilter}
        setDeveloperFilter={setDeveloperFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        selectedCommunity={selectedCommunity}
        setSelectedCommunity={setSelectedCommunity}
        handleFitBounds={handleFitBounds}
        isDrawing={isDrawing}
        onToggleDraw={onToggleDraw}
        handleLocationSelect={handleLocationSelect}
      />
    </div>
  );
};

export default MainLayout;
