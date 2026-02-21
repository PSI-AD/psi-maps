import React, { useState } from 'react';
import { Project, Landmark } from '../types';
import AdminDashboard from './AdminDashboard';
import ProjectSidebar from './ProjectSidebar';
import FloatingMapTools from './FloatingMapTools';
import MapStyleSwitcher from './MapStyleSwitcher';
import BottomControlBar from './BottomControlBar';
import FullscreenImageModal from './FullscreenImageModal';
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
  mapFeatures: { show3D: boolean; showAnalytics: boolean; showCommunityBorders: boolean };
  setMapFeatures: React.Dispatch<React.SetStateAction<{ show3D: boolean; showAnalytics: boolean; showCommunityBorders: boolean }>>;
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
  handleLocationSelect: (locationType: 'city' | 'community', locationName: string, projectsInLocation: Project[]) => void;
  onQuickFilter?: (type: 'community' | 'developer', value: string) => void;
  activeBoundary: any;
  handleGlobalReset: () => void;
  activeIsochrone: { mode: 'driving' | 'walking'; minutes: number } | null;
  setActiveIsochrone: (iso: { mode: 'driving' | 'walking'; minutes: number } | null) => void;
}

const MainLayout: React.FC<MainLayoutProps> = (props) => {
  const {
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
    handleLocationSelect,
    onQuickFilter,
    activeBoundary,
    handleGlobalReset,
    activeIsochrone,
    setActiveIsochrone,
  } = props;

  const [isNearbyToolsOpen, setIsNearbyToolsOpen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const handleSearchSelect = (project: Project) => {
    if (!project) return;

    // Sync breadcrumbs
    setSelectedCity(project.city || '');
    setSelectedCommunity(project.community || '');
    onProjectClick(project.id);
    setIsAnalysisOpen(true);

    // Fly directly to the property with cinematic tilt
    const lat = Number(project.latitude);
    const lng = Number(project.longitude);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      onFlyTo(lng, lat, 16);
    }
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


      {/* Breadcrumbs Navigation */}
      <div className="absolute top-6 left-6 z-[4000] flex items-center gap-2 text-slate-800 text-sm font-bold bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-slate-200">
        <button onClick={() => { props.setSelectedCity(''); props.setSelectedCommunity(''); props.onCloseProject(); props.handleLocationSelect('city', '', props.liveProjects); }} className="hover:text-blue-600 transition-colors">UAE</button>
        {props.selectedCity && (
          <>
            <span className="text-slate-400">/</span>
            <button onClick={() => { props.setSelectedCommunity(''); props.onCloseProject(); props.handleLocationSelect('city', props.selectedCity, props.liveProjects.filter(p => p.city === props.selectedCity)); }} className="hover:text-blue-600 transition-colors capitalize">{props.selectedCity}</button>
          </>
        )}
        {props.selectedCommunity && (
          <>
            <span className="text-slate-400">/</span>
            <button onClick={() => { props.onCloseProject(); props.handleLocationSelect('community', props.selectedCommunity, props.liveProjects.filter(p => p.community === props.selectedCommunity)); }} className="hover:text-blue-600 transition-colors capitalize">{props.selectedCommunity}</button>
          </>
        )}
        {props.selectedProject && (
          <>
            <span className="text-slate-400">/</span>
            <span className="text-blue-600 capitalize truncate max-w-[150px]">{props.selectedProject.name}</span>
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
        <div className="absolute top-0 right-0 bottom-0 w-full md:w-[380px] z-[5000] shadow-2xl bg-white transition-transform transform translate-x-0 border-l border-slate-200 overflow-y-auto">
          <ProjectSidebar
            project={selectedProject}
            onClose={() => {
              setIsAnalysisOpen(false);
              onCloseProject();
            }}
            onDiscoverNeighborhood={onDiscoverNeighborhood}
            onQuickFilter={onQuickFilter}
            setFullscreenImage={setFullscreenImage}
            activeIsochrone={activeIsochrone}
            setActiveIsochrone={setActiveIsochrone}
            nearbyLandmarks={liveLandmarks}
            onFlyTo={onFlyTo}
          />
        </div>
      )}

      {/* Active Filter Chips — floating above the bottom dock */}
      {(developerFilter !== 'All' && developerFilter !== '' || statusFilter !== 'All' && statusFilter !== '' || selectedCity || selectedCommunity) && (
        <div className="absolute bottom-[88px] left-1/2 -translate-x-1/2 z-[4500] flex flex-wrap gap-2 pointer-events-none justify-center px-4 w-full max-w-3xl">

          {/* Reset All chip */}
          <button
            className="pointer-events-auto flex items-center gap-1.5 bg-white text-blue-700 border border-blue-600 px-3 py-1.5 rounded-full shadow-lg text-xs font-black uppercase tracking-wide hover:bg-blue-50 transition-colors"
            onClick={() => {
              setDeveloperFilter('All');
              setStatusFilter('All');
              props.setSelectedCity('');
              props.setSelectedCommunity('');
              props.onCloseProject();
              props.handleLocationSelect('city', '', props.liveProjects);
            }}
          >
            ↺ Reset All
          </button>

          {/* Developer chip */}
          {developerFilter && developerFilter !== 'All' && (
            <div className="pointer-events-auto flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-black uppercase tracking-wide">
              <span>{developerFilter}</span>
              <button
                onClick={() => setDeveloperFilter('All')}
                className="w-4 h-4 flex items-center justify-center hover:bg-blue-700 rounded-full transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {/* Status chip — blue-800, not black */}
          {statusFilter && statusFilter !== 'All' && (
            <div className="pointer-events-auto flex items-center gap-1.5 bg-blue-800 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-black uppercase tracking-wide">
              <span>{statusFilter}</span>
              <button
                onClick={() => setStatusFilter('All')}
                className="w-4 h-4 flex items-center justify-center hover:bg-blue-900 rounded-full transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {/* City chip — cascade: dismissing falls back to full UAE bounds */}
          {selectedCity && (
            <div className="pointer-events-auto flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-black uppercase tracking-wide">
              <span className="capitalize">{selectedCity}</span>
              <button
                onClick={() => {
                  props.setSelectedCity('');
                  props.setSelectedCommunity('');
                  props.onCloseProject();
                  props.handleLocationSelect('city', '', props.liveProjects);
                }}
                className="w-4 h-4 flex items-center justify-center hover:bg-emerald-700 rounded-full transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {/* Community chip — cascade: dismissing falls back to selected city view */}
          {selectedCommunity && (
            <div className="pointer-events-auto flex items-center gap-1.5 bg-violet-600 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-black uppercase tracking-wide">
              <span className="capitalize">{selectedCommunity}</span>
              <button
                onClick={() => {
                  props.setSelectedCommunity('');
                  props.onCloseProject();
                  if (selectedCity) {
                    props.handleLocationSelect('city', selectedCity, props.liveProjects.filter(p => p.city === selectedCity));
                  } else {
                    props.handleLocationSelect('city', '', props.liveProjects);
                  }
                }}
                className="w-4 h-4 flex items-center justify-center hover:bg-violet-700 rounded-full transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
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
        mapFeatures={mapFeatures}
        setMapFeatures={setMapFeatures}
        onGlobalReset={handleGlobalReset}
      />

      {/* Fullscreen Image Lightbox — rendered at MainLayout level to cover full viewport */}
      {fullscreenImage && (
        <FullscreenImageModal imageUrl={fullscreenImage} onClose={() => setFullscreenImage(null)} />
      )}
    </div>
  );
};

export default MainLayout;
