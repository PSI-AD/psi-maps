import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Project, Landmark, ClientPresentation } from '../types';
const AdminDashboard = React.lazy(() => import('./AdminDashboard'));
const ProjectSidebar = React.lazy(() => import('./ProjectSidebar'));
import BottomControlBar from './BottomControlBar';
import FullscreenImageModal from './FullscreenImageModal';
import NearbyPanel from './NearbyPanel';
import FilteredProjectsCarousel from './FilteredProjectsCarousel';
import AIChatAssistant from './AIChatAssistant';
import FavoritesPanel, { ComparePanel } from './FavoritesPanel';
import { useFavoritesContext } from '../hooks/useFavorites';
import { Loader2, Building, LayoutGrid, X } from 'lucide-react';
import { PullToRefreshIndicator } from './NativeTransition';
import { SidebarSkeleton, AdminSkeleton, AppLoadingSkeleton } from './SkeletonUI';
import haptic from '../utils/haptics';
import { useNativeGestures } from '../hooks/useNativeGestures';
import { prefetchComponent, saveAppState, loadAppState, logWebVitals } from '../utils/performanceEngine';
import { useNavigationStack, type ScreenId } from '../hooks/useNavigationStack';

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
  startCinematicTour?: (stops: { lng: number; lat: number; name?: string }[], zoom?: number) => void;
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
  showNearbyPanel: boolean;
  setShowNearbyPanel: (v: boolean) => void;
  projectSpecificLandmarks: Landmark[];
  showWelcomeBanner: boolean;
  hoveredProjectId: string | null;
  setHoveredProjectId: (id: string | null) => void;
  cameraDuration: number;
  activePresentation?: ClientPresentation | null;
  presentationProjects?: Project[] | null;
  onLaunchPresentation: (pres: ClientPresentation) => void;
  onExitPresentation: () => void;
  onSelectLandmark?: (landmark: Landmark) => void;
  /** Landmark currently selected via map click (for AI chat landmark trigger) */
  selectedLandmarkForSearch?: Landmark | null;
  mapRef?: React.MutableRefObject<any>;
  activeRouteGeometry?: any | null;
  onRouteReady?: (geometry: any | null) => void;
  // Advanced / Experimental toggles (passed through to AdminDashboard)
  enableHeatmap?: boolean;
  setEnableHeatmap?: (v: boolean) => void;
  enableSunlight?: boolean;
  setEnableSunlight?: (v: boolean) => void;
  enableIsochrone?: boolean;
  setEnableIsochrone?: (v: boolean) => void;
  enableLasso?: boolean;
  setEnableLasso?: (v: boolean) => void;
  mobileFooterTheme?: string;
  bannerSettings?: { duration: number; position: { top: number; left: number }; positionMobile: { top: number; left: number }; mobileFooterTheme: string };
  // Coordinate Review Tool
  showCoordReview?: boolean;
  setShowCoordReview?: (v: boolean) => void;
  onAuditProjectChange?: (project: any) => void;
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
    showNearbyPanel,
    setShowNearbyPanel,
    projectSpecificLandmarks,
    showWelcomeBanner,
    hoveredProjectId,
    setHoveredProjectId,
    cameraDuration,
  } = props;

  const [isNearbyToolsOpen, setIsNearbyToolsOpen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const favCtx = useFavoritesContext();

  // ── Performance: Prefetch lazy components during idle time ─────────────
  useEffect(() => {
    // Delay prefetch so it doesn't compete with the critical render path.
    // After 5s the user is likely idle — prefetch heavy chunks in background.
    const timer = setTimeout(() => {
      prefetchComponent(() => import('./ProjectSidebar'), 'ProjectSidebar');
      prefetchComponent(() => import('./AdminDashboard'), 'AdminDashboard');
    }, 5000);
    logWebVitals();
    return () => clearTimeout(timer);
  }, []);

  // ── Navigation Stack — native iOS/Android-style history management ─────
  const [navState, nav] = useNavigationStack('map');

  // Sync external state changes → nav stack
  // When isAnalysisOpen turns on via App.tsx (marker click), push 'project' screen
  useEffect(() => {
    if (isAnalysisOpen && selectedProject && navState.current.screen !== 'project') {
      nav.push('project', { projectId: selectedProject.id });
    } else if (!isAnalysisOpen && navState.current.screen === 'project') {
      // If sidebar closed externally, pop from stack
      nav.pop();
    }
  }, [isAnalysisOpen, selectedProject?.id]);

  // Sync admin state
  useEffect(() => {
    if (isAdminOpen && navState.current.screen !== 'admin') {
      nav.push('admin');
    } else if (!isAdminOpen && navState.current.screen === 'admin') {
      nav.pop();
    }
  }, [isAdminOpen]);

  // Sync nav stack → external state (for back navigation via swipe/browser button)
  useEffect(() => {
    const screen = navState.current.screen;
    // If we popped back from project, close the sidebar
    if (screen !== 'project' && isAnalysisOpen) {
      setIsAnalysisOpen(false);
      onCloseProject();
    }
    // If we popped back from admin, close admin
    if (screen !== 'admin' && isAdminOpen) {
      setIsAdminOpen(false);
    }
    // Sync overlay panels
    if (screen !== 'favorites') setIsFavoritesOpen(false);
    if (screen !== 'compare') setIsCompareOpen(false);
    if (screen !== 'chat') setIsAiChatOpen(false);
    if (screen !== 'nearby') setShowNearbyPanel(false);
  }, [navState.current.screen]);

  // Override panel togglers to go through nav stack
  const openFavorites = () => { setIsFavoritesOpen(true); nav.push('favorites'); };
  const openCompare = () => { setIsCompareOpen(true); nav.push('compare'); };
  const openChat = () => { setIsAiChatOpen(true); nav.push('chat'); };
  const openNearby = () => { if (props.setShowNearbyPanel) props.setShowNearbyPanel(true); nav.push('nearby'); };
  const closePanelViaBack = () => { nav.pop(); haptic.nav(); };

  // ── Performance: Save app state for instant restore ────────────────────
  useEffect(() => {
    saveAppState({
      selectedProjectId: selectedProject?.id || null,
      selectedCity,
      selectedCommunity,
      propertyType,
      developerFilter,
      statusFilter,
      isAnalysisOpen,
    });
  }, [selectedProject, selectedCity, selectedCommunity, propertyType, developerFilter, statusFilter, isAnalysisOpen]);

  // ── Native Gesture Support ────────────────────────────────────────────
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const [pullRefreshActive, setPullRefreshActive] = useState(false);

  const gestureState = useNativeGestures(mainContainerRef, {
    // Pull-to-refresh DISABLED — it fires on normal content scrolls and
    // reloads the entire app.  Users can use browser pull-to-refresh.
    onEdgeSwipeBack: () => {
      // Edge swipe from left = pop navigation stack (back)
      if (navState.canGoBack) {
        haptic.nav();
        nav.pop();
      }
    },
    enabled: typeof window !== 'undefined' && window.innerWidth < 768,
  });

  // ── Sidebar transition state (for native slide animation) ─────────
  const [sidebarMounted, setSidebarMounted] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  useEffect(() => {
    if (isAnalysisOpen && selectedProject) {
      setSidebarMounted(true);
      // Trigger enter animation on next frame
      requestAnimationFrame(() => requestAnimationFrame(() => setSidebarVisible(true)));
    } else if (sidebarVisible) {
      setSidebarVisible(false);
      const timer = setTimeout(() => setSidebarMounted(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isAnalysisOpen, selectedProject]);

  // Listen for favorites panel open event from mobile tab bar
  useEffect(() => {
    const handler = () => openFavorites();
    window.addEventListener('open-favorites-panel', handler);
    return () => window.removeEventListener('open-favorites-panel', handler);
  }, []);

  // Listen for Play button filter sync (ai-apply-filters)
  useEffect(() => {
    const handler = (e: Event) => {
      const filters = (e as CustomEvent).detail || {};
      setDeveloperFilter(filters.developer || 'All');
      setStatusFilter(filters.status || 'All');
      setSelectedCommunity(filters.community || '');
      setSelectedCity(filters.city || '');
    };
    window.addEventListener('ai-apply-filters', handler);
    return () => window.removeEventListener('ai-apply-filters', handler);
  }, [setDeveloperFilter, setStatusFilter, setSelectedCommunity, setSelectedCity]);

  // Auto-expand sidebar when AI triggers a neighborhood tour or results panel
  useEffect(() => {
    const onNeighborhoodTour = () => setIsAnalysisOpen(true);
    const onExpandResults = () => setIsAnalysisOpen(true);
    window.addEventListener('ai-open-neighborhood-tour', onNeighborhoodTour);
    window.addEventListener('ai-expand-results-panel', onExpandResults);
    return () => {
      window.removeEventListener('ai-open-neighborhood-tour', onNeighborhoodTour);
      window.removeEventListener('ai-expand-results-panel', onExpandResults);
    };
  }, [setIsAnalysisOpen]);

  // Listen for lightweight project selection from sidebar project lists
  useEffect(() => {
    const handler = (e: Event) => {
      const { projectId } = (e as CustomEvent).detail || {};
      if (!projectId) return;
      const target = liveProjects.find(p => p.id === projectId);
      if (target) handleProjectFocus(target);
    };
    window.addEventListener('sidebar-select-project', handler);
    return () => window.removeEventListener('sidebar-select-project', handler);
  }, [liveProjects]);

  // Carousel + chip animation logic
  const isAnyFilterActive = Boolean(
    (developerFilter && developerFilter !== 'All') ||
    (statusFilter && statusFilter !== 'All') ||
    selectedCity ||
    selectedCommunity
  );
  // Desktop: always visible when a project is open or a filter is active
  // Mobile: carousel appears instantly when a pin is tapped
  const showCarousel = isAnyFilterActive || !!selectedProject;
  // Chips: lift above carousel when it's showing
  const chipsBottomClass = showCarousel
    ? 'bottom-[210px] md:bottom-[96px]'
    : 'bottom-[80px]';

  // ── Lightweight project focus — for tour playback & carousel clicks ──
  // Does NOT stop tours, clear filters, or change city/community breadcrumbs.
  // IMPORTANT: setSelectedCity/setSelectedCommunity are FILTER values that
  // drive filteredProjects. Changing them mid-tour would narrow the list.
  const handleProjectFocus = (project: Project) => {
    if (!project) return;
    haptic.tap();
    onProjectClick(project.id);
    setIsAnalysisOpen(true);
    const lat = Number(project.latitude);
    const lng = Number(project.longitude);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      onFlyTo(lng, lat, 16);
    }
  };

  // ── Full clean-slate search — for user-initiated searches only ────
  const handleSearchSelect = (project: Project) => {
    if (!project) return;

    // 1. Stop any active tours
    window.dispatchEvent(new CustomEvent('global-tour-pause'));

    // 2. Clear all filters (developer, status, property type)
    setDeveloperFilter('All');
    setStatusFilter('All');
    if (props.setPropertyType) props.setPropertyType('All');

    // 3. CRITICAL: Reset city/community to the NEW project's context
    //    This must happen BEFORE onProjectClick, because onProjectClick
    //    looks up the project from filteredProjects (which is filtered by community).
    setSelectedCity(project.city || '');
    setSelectedCommunity(project.community || '');

    // 4. Close nearby panel, clear isochrone/route/boundary
    if (props.setShowNearbyPanel) props.setShowNearbyPanel(false);
    if (props.setActiveIsochrone) props.setActiveIsochrone(null);

    // 5. Clear old landmark selection
    if ((props as any).setSelectedLandmarkForSearch) (props as any).setSelectedLandmarkForSearch(null);

    // 6. Close AI chat if open (prevents ghost panel + state conflicts)
    if (isAiChatOpen) {
      setIsAiChatOpen(false);
      // Pop chat from nav stack if it's the current screen
      if (navState.current.screen === 'chat') nav.pop();
    }

    // 7. Focus the project (fly to + open sidebar)
    handleProjectFocus(project);
  };

  return (
    <div ref={mainContainerRef} className="flex flex-col h-screen w-screen overflow-hidden bg-slate-900 font-sans relative" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>

      {/* Pull-to-Refresh visual indicator */}
      <PullToRefreshIndicator
        pullDistance={gestureState.pullDistance}
        isRefreshing={pullRefreshActive}
      />

      {/* Edge Swipe Indicator — shows on left edge during edge gesture */}
      <div className={`edge-swipe-indicator ${gestureState.isEdgeSwipe ? 'active' : ''}`} />

      {isAdminOpen && (
        <Suspense fallback={<AdminSkeleton />}>
          <AdminDashboard
            onClose={() => setIsAdminOpen(false)}
            liveProjects={liveProjects}
            setLiveProjects={setLiveProjects}
            liveLandmarks={liveLandmarks}
            setLiveLandmarks={setLiveLandmarks}
            mapFeatures={mapFeatures}
            setMapFeatures={setMapFeatures}
            showWelcomeBanner={showWelcomeBanner}
            cameraDuration={cameraDuration}
            onLaunchPresentation={props.onLaunchPresentation}
            enableHeatmap={props.enableHeatmap ?? false}
            setEnableHeatmap={props.setEnableHeatmap ?? (() => { })}
            enableSunlight={props.enableSunlight ?? false}
            setEnableSunlight={props.setEnableSunlight ?? (() => { })}
            enableIsochrone={props.enableIsochrone ?? false}
            setEnableIsochrone={props.setEnableIsochrone ?? (() => { })}
            enableLasso={props.enableLasso ?? false}
            setEnableLasso={props.setEnableLasso ?? (() => { })}
            {...({
              globalSettings: {
                showWelcomeBanner,
                cameraDuration,
                bannerDuration: props.bannerSettings?.duration,
                bannerPosition: props.bannerSettings?.position,
                bannerPositionMobile: props.bannerSettings?.positionMobile,
                mobileFooterTheme: props.bannerSettings?.mobileFooterTheme ?? props.mobileFooterTheme,
              }
            } as any)}
          />
        </Suspense>
      )}

      {isRefreshing && <AppLoadingSkeleton />}

      {/* Main Map Container - completely flush with the bottom */}
      <div className="absolute inset-0 z-0 bg-slate-100">
        {children}
      </div>

      {/* Breadcrumbs Navigation — pushed below notch on mobile */}
      <div className="absolute top-4 md:top-6 left-4 md:left-6 z-[4000] flex items-center gap-1.5 text-slate-800 text-sm font-bold bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-slate-200 max-w-[calc(100vw-112px)] overflow-hidden" style={{ top: 'max(env(safe-area-inset-top, 16px), 16px)' }}>
        <button onClick={() => { props.setSelectedCity(''); props.setSelectedCommunity(''); props.onCloseProject(); props.handleLocationSelect('city', '', props.liveProjects); }} className="hover:text-blue-600 transition-colors shrink-0">UAE</button>
        {props.selectedCity && (
          <>
            <span className="text-slate-400 shrink-0">/</span>
            <button onClick={() => { props.setSelectedCommunity(''); props.onCloseProject(); props.handleLocationSelect('city', props.selectedCity, props.liveProjects.filter(p => p.city === props.selectedCity)); }} className="hover:text-blue-600 transition-colors capitalize truncate max-w-[100px] md:max-w-[160px]">{props.selectedCity}</button>
          </>
        )}
        {props.selectedCommunity && (
          <>
            <span className="text-slate-400 shrink-0">/</span>
            <button onClick={() => { props.onCloseProject(); props.handleLocationSelect('community', props.selectedCommunity, props.liveProjects.filter(p => p.community === props.selectedCommunity)); }} className="hover:text-blue-600 transition-colors capitalize truncate max-w-[90px] md:max-w-[140px]">{props.selectedCommunity}</button>
          </>
        )}
        {props.selectedProject && (
          <>
            <span className="text-slate-400 shrink-0 hidden sm:inline">/</span>
            <span className="text-blue-600 capitalize truncate max-w-[80px] md:max-w-[150px] hidden sm:inline">{props.selectedProject.name}</span>
          </>
        )}
      </div>

      {/* Analysis Sidebar — Native slide transition */}
      {sidebarMounted && selectedProject && (
        <div
          data-nav-scroll="sidebar"
          className={`absolute top-0 right-0 w-full md:w-[380px] z-[5000] shadow-2xl bg-white border-l border-slate-200 overflow-hidden flex flex-col`}
          style={{
            bottom: 'max(56px, calc(56px + env(safe-area-inset-bottom, 0px)))',
            transform: sidebarVisible ? 'translate3d(0, 0, 0)' : 'translate3d(100%, 0, 0)',
            transition: 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
          }}
        >
          <Suspense fallback={<SidebarSkeleton />}>
            <ProjectSidebar
              project={selectedProject}
              allProjects={liveProjects}
              onClose={() => {
                closePanelViaBack();
              }}
              onDiscoverNeighborhood={onDiscoverNeighborhood}
              onQuickFilter={onQuickFilter}
              setSelectedCity={setSelectedCity}
              setFullscreenImage={setFullscreenImage}
              activeIsochrone={activeIsochrone}
              setActiveIsochrone={setActiveIsochrone}
              nearbyLandmarks={liveLandmarks}
              onFlyTo={onFlyTo}
              setShowNearbyPanel={setShowNearbyPanel}
              onRouteReady={props.onRouteReady}
              mapRef={props.mapRef}
              onSelectLandmark={props.onSelectLandmark}
            />
          </Suspense>
        </div>
      )}

      {/* Active Filter Chips — floating above the bottom dock (desktop) */}
      {(developerFilter !== 'All' && developerFilter !== '' || statusFilter !== 'All' && statusFilter !== '' || selectedCity || selectedCommunity) && (
        <div className={`absolute ${chipsBottomClass} left-1/2 -translate-x-1/2 z-[4500] hidden md:flex flex-wrap gap-2 pointer-events-none justify-center px-4 w-full max-w-3xl transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]`}>

          {/* Properties Count & Reset */}
          <div className="pointer-events-auto flex items-center gap-4 bg-white py-1.5 px-2 pr-4 rounded-xl shadow-lg border border-slate-200">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-sm bg-slate-100 px-3 py-1.5 rounded-lg">
              <Building className="w-4 h-4" />
              <span>{props.filteredProjects.length}</span>
            </div>
            <button
              className="text-sm font-bold text-slate-500 hover:text-slate-800"
              onClick={() => {
                setDeveloperFilter('All');
                setStatusFilter('All');
                props.setSelectedCity('');
                props.setSelectedCommunity('');
                props.onCloseProject();
                props.handleLocationSelect('city', '', props.liveProjects);
              }}
            >
              Reset
            </button>
          </div>

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

          {/* Status chip */}
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

          {/* City chip */}
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

          {/* Community chip */}
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

      {/* NearbyPanel — floats above the bottom dock (desktop only, hidden on mobile) */}
      {showNearbyPanel && selectedProject && (
        <div className="hidden md:block">
          <NearbyPanel
            project={selectedProject}
            landmarks={projectSpecificLandmarks}
            onClose={() => setShowNearbyPanel(false)}
          />
        </div>
      )}

      {/* Mobile Filter Tags — clean compact chips */}
      {isAnyFilterActive && (
        <div
          className={`md:hidden flex items-center gap-1.5 px-3 py-1 fixed ${showCarousel ? 'bottom-[200px]' : 'bottom-[72px]'} left-0 right-0 z-[4400] overflow-x-auto whitespace-nowrap hide-scrollbar transition-all duration-300`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Count + Reset — icon and number only, no "Properties" text */}
          <button
            onClick={() => { setDeveloperFilter('All'); setStatusFilter('All'); props.setSelectedCity(''); props.setSelectedCommunity(''); props.onCloseProject(); props.handleLocationSelect('city', '', props.liveProjects); }}
            className="flex items-center gap-1 text-[9px] font-black px-2 py-1 bg-white/95 backdrop-blur-md text-slate-600 border border-slate-200 rounded-full shrink-0 shadow-sm"
          >
            <Building className="w-3 h-3" />
            <span>{props.filteredProjects.length}</span>
            <X className="w-2.5 h-2.5 ml-0.5 text-slate-400" />
          </button>

          {developerFilter && developerFilter !== 'All' && (
            <button onClick={() => setDeveloperFilter('All')} className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 bg-blue-600 text-white rounded-full shrink-0 shadow-sm">
              <span className="max-w-[70px] truncate">{developerFilter}</span>
              <X className="w-2.5 h-2.5" />
            </button>
          )}
          {statusFilter && statusFilter !== 'All' && (
            <button onClick={() => setStatusFilter('All')} className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 bg-blue-800 text-white rounded-full shrink-0 shadow-sm">
              <span>{statusFilter}</span>
              <X className="w-2.5 h-2.5" />
            </button>
          )}
          {selectedCity && (
            <button onClick={() => { props.setSelectedCity(''); props.setSelectedCommunity(''); props.onCloseProject(); props.handleLocationSelect('city', '', props.liveProjects); }} className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 bg-emerald-600 text-white rounded-full shrink-0 shadow-sm capitalize">
              <span className="max-w-[70px] truncate">{selectedCity}</span>
              <X className="w-2.5 h-2.5" />
            </button>
          )}
          {selectedCommunity && (
            <button onClick={() => { props.setSelectedCommunity(''); props.onCloseProject(); selectedCity ? props.handleLocationSelect('city', selectedCity, props.liveProjects.filter(p => p.city === selectedCity)) : props.handleLocationSelect('city', '', props.liveProjects); }} className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 bg-violet-600 text-white rounded-full shrink-0 shadow-sm capitalize">
              <span className="max-w-[70px] truncate">{selectedCommunity}</span>
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      )}

      {/* Filtered results carousel — always visible on mobile, desktop toggle unchanged */}
      <FilteredProjectsCarousel
          projects={props.filteredProjects}
          onSelectProject={handleProjectFocus}
          isVisible={showCarousel}
          selectedProjectId={selectedProject?.id}
          hoveredProjectId={hoveredProjectId}
          setHoveredProjectId={setHoveredProjectId}
          onFlyTo={onFlyTo}
          activePresentation={props.activePresentation}
          presentationProjects={props.presentationProjects}
          onExitPresentation={props.onExitPresentation}
          onDismiss={() => {
            props.handleGlobalReset();
          }}
          isAiChatOpen={isAiChatOpen}
          isLoading={isRefreshing}
        />

      {/* Floating Map/List toggle — mobile only, visible when sidebar covers the map */}
      {selectedProject && isAnalysisOpen && (
        <button
          onClick={() => { onCloseProject(); closePanelViaBack(); }}
          className="md:hidden fixed z-[5500] w-12 h-12 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30 flex items-center justify-center active:scale-95 transition-all border-2 border-white/30"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 68px)', right: '16px' }}
          aria-label="Show map"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
        </button>
      )}

      {/* The New Bottom Dock */}
      <BottomControlBar
        projects={liveProjects}
        filteredProjects={props.filteredProjects}
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
        landmarks={liveLandmarks}
        onSelectLandmark={props.onSelectLandmark}
        activeAmenities={activeAmenities}
        onToggleAmenity={onToggleAmenity}
        filteredCount={props.filteredProjects.length}
        mapRef={props.mapRef}
        mapStyle={mapStyle}
        setMapStyle={setMapStyle}
        footerTheme={props.mobileFooterTheme || 'glass'}
        selectedProject={selectedProject}
        allLandmarks={liveLandmarks}
      />

      {/* Fullscreen Image Lightbox — rendered at MainLayout level to cover full viewport */}
      {fullscreenImage && (
        <FullscreenImageModal imageUrl={fullscreenImage} onClose={() => setFullscreenImage(null)} />
      )}

      {/* AI Chat Assistant overlay — TEMPORARILY DISABLED for stability */}
      {/* To re-enable: remove the `false &&` below */}
      {false && (
        <AIChatAssistant
          selectedProject={selectedProject}
          selectedCommunity={selectedCommunity}
          selectedCity={selectedCity}
          selectedDeveloper={developerFilter !== 'All' ? developerFilter : undefined}
          selectedLandmark={props.selectedLandmarkForSearch}
          isTourActive={!!props.activePresentation}
          allProjects={liveProjects}
          allLandmarks={liveLandmarks}
          onOpenChange={(open) => {
            if (open) { openChat(); }
            else { closePanelViaBack(); }
          }}
          onApplyFilters={(filters) => {
            // Atomic: reset everything, then apply specific values — one React batch
            setDeveloperFilter(filters.developer || 'All');
            setStatusFilter(filters.status || 'All');
            setSelectedCommunity(filters.community || '');
            setSelectedCity(filters.city || '');
          }}
        />
      )}

      {/* Favorites Panel */}
      <FavoritesPanel
        isOpen={isFavoritesOpen}
        onClose={closePanelViaBack}
        projects={liveProjects}
        favoriteIds={favCtx.favoriteIds}
        onToggleFavorite={favCtx.toggleFavorite}
        onSelectProject={handleSearchSelect}
        onClearAll={favCtx.clearFavorites}
      />

      {/* Compare Panel */}
      <ComparePanel
        isOpen={isCompareOpen}
        onClose={closePanelViaBack}
        projects={liveProjects.filter(p => favCtx.compareIds.includes(p.id))}
        onSelectProject={handleSearchSelect}
      />
    </div>
  );
};

export default MainLayout;
