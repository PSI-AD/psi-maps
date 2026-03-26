import React, { useState, useMemo, useEffect, Suspense } from 'react';
import mapboxgl from 'mapbox-gl';
import { distance as turfDistance } from '@turf/distance';
import { point as turfPoint } from '@turf/helpers';
import { polygon as turfPolygon } from '@turf/helpers';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { bbox as turfBbox } from '@turf/bbox';
import { useProjectData } from './hooks/useProjectData';
import { useMapState } from './hooks/useMapState';
import { fetchNearbyAmenities } from './utils/placesClient';
import { fetchLocationBoundary } from './utils/boundaryFetcher';
import { getBoundaryFromDB } from './utils/boundaryService';
import MainLayout from './components/MainLayout';
import MapCanvas from './components/MapCanvas';
import ErrorBoundary from './components/ErrorBoundary';
import { Project, Landmark, ClientPresentation } from './types';
import { FavoritesProvider } from './hooks/useFavorites';
import WelcomeBanner from './components/WelcomeBanner';
import PropertyResultsList from './components/PropertyResultsList';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import PWAStatusOverlays from './components/PWAStatusOverlays';
import haptic from './utils/haptics';
import { loadAppState } from './utils/performanceEngine';
import { recordRecentView, addSearchEntry } from './utils/localPersistence';
import { warmUpPreloader, preloadProjectScreen, recordNavigation, preloadPredictedScreens, preloadVisibleProjects } from './utils/predictivePreloader';
import { AnalyticsEvents, PerfTraces } from './utils/firebasePlatform';
import { sampleROIZones } from './data/roiZones';
import 'mapbox-gl/dist/mapbox-gl.css';

// ── Lazy-loaded components (only downloaded when user triggers them) ─────────
const PresentationShowcase = React.lazy(() => import('./components/PresentationShowcase'));
const LandmarkInfoModal = React.lazy(() => import('./components/LandmarkInfoModal'));
const StreetViewPanel = React.lazy(() => import('./components/StreetViewPanel'));
const ARView = React.lazy(() => import('./components/ARView'));
const TimeSlider = React.lazy(() => import('./components/TimeSlider'));
const BeforeAfterSlider = React.lazy(() => import('./components/BeforeAfterSlider'));
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './utils/firebase';

// FIX: Set Mapbox token globally to prevent MapboxDraw plugin crashes
const getMapboxToken = () => {
  const b64 = 'cGsuZXlKMUlqb2ljSE5wYm5ZaUxDSmhJam9pWTIxc2NqQnpNMjF4TURacU56Tm1jMlZtZEd0NU1XMDVaQ0o5LlZ4SUVuMWpMVHpNd0xBTjhtNEIxNWc=';
  return typeof window !== 'undefined' ? atob(b64) : '';
};
const PUBLIC_MAPBOX_TOKEN = getMapboxToken();
(mapboxgl as any).accessToken = PUBLIC_MAPBOX_TOKEN;

const AppInner: React.FC = () => {

  const {
    liveProjects, setLiveProjects, liveLandmarks, setLiveLandmarks, isRefreshing, loadInitialData, filteredProjects,
    filteredAmenities, activeAmenities, handleToggleAmenity, filterPolygon, setFilterPolygon,
    propertyType, setPropertyType,
    developerFilter, setDeveloperFilter,
    statusFilter, setStatusFilter,
    selectedCity, setSelectedCity,
    selectedCommunity, setSelectedCommunity
  } = useProjectData();

  const [cameraDuration, setCameraDuration] = useState(2000);

  const {
    viewState, setViewState, mapStyle, setMapStyle, bounds, updateBounds,
    isDrawing, setIsDrawing, mapRef, drawRef, handleFlyTo, handleCinematicFlyTo, startCinematicTour, handleToggleDraw
  } = useMapState(filteredProjects, cameraDuration);

  // Super Admin Toggles
  const [mapFeatures, setMapFeatures] = useState({ show3D: true, showAnalytics: true, showCommunityBorders: true });

  // Advanced / Experimental feature flags
  const [enableHeatmap, setEnableHeatmap] = useState(false);
  const [enableSunlight, setEnableSunlight] = useState(false);
  const [enableIsochrone, setEnableIsochrone] = useState(false); // Phase 2
  const [enableLasso, setEnableLasso] = useState(false);         // Phase 2

  // ── Phase 1–2: Time-Based Map + ROI Heatmap states ────────────────────────
  const [enableROIHeatmap, setEnableROIHeatmap] = useState(false);
  const [showTimeSlider, setShowTimeSlider] = useState(false);
  const [selectedTimeYear, setSelectedTimeYear] = useState(2025);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);

  const [activeBoundary, setActiveBoundary] = useState<any>(null);

  // Lasso spatial-filter state
  const [isLassoMode, setIsLassoMode] = useState(false);
  const [drawnCoordinates, setDrawnCoordinates] = useState<[number, number][]>([]);

  // Listen for lasso CustomEvents dispatched by MapCommandCenter
  useEffect(() => {
    const handleToggle = () => setIsLassoMode(prev => !prev);
    const handleClear = () => { setDrawnCoordinates([]); setIsLassoMode(false); };
    window.addEventListener('lasso-toggle', handleToggle);
    window.addEventListener('lasso-clear', handleClear);
    return () => {
      window.removeEventListener('lasso-toggle', handleToggle);
      window.removeEventListener('lasso-clear', handleClear);
    };
  }, []);

  // Listen for Insights CustomEvents dispatched by MapCommandCenter
  useEffect(() => {
    const handleROI = () => setEnableROIHeatmap(prev => !prev);
    const handleTimeline = () => setShowTimeSlider(prev => !prev);
    const handleCompare = () => setShowBeforeAfter(prev => !prev);
    window.addEventListener('toggle-roi-heatmap', handleROI);
    window.addEventListener('toggle-time-slider', handleTimeline);
    window.addEventListener('toggle-before-after', handleCompare);
    return () => {
      window.removeEventListener('toggle-roi-heatmap', handleROI);
      window.removeEventListener('toggle-time-slider', handleTimeline);
      window.removeEventListener('toggle-before-after', handleCompare);
    };
  }, []);

  // ── Restore persisted state (last session) ──────────────────────────────
  useEffect(() => {
    const saved = loadAppState();
    if (!saved) return;

    // Restore filters (instant, no network)
    if (saved.selectedCity) setSelectedCity(saved.selectedCity);
    if (saved.selectedCommunity) setSelectedCommunity(saved.selectedCommunity);
    if (saved.propertyType && saved.propertyType !== 'All') setPropertyType(saved.propertyType);
    if (saved.developerFilter && saved.developerFilter !== 'All') setDeveloperFilter(saved.developerFilter);
    if (saved.statusFilter && saved.statusFilter !== 'All') setStatusFilter(saved.statusFilter);
    if (saved.mapStyle) setMapStyle(saved.mapStyle);

    // Restore selected project (after data loads)
    if (saved.selectedProjectId && saved.isAnalysisOpen) {
      // Wait for projects to load, then restore selection
      const restoreTimer = setTimeout(() => {
        setSelectedProjectId(saved.selectedProjectId);
        setIsAnalysisOpen(true);
      }, 500);
      return () => clearTimeout(restoreTimer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initialize predictive preloader ─────────────────────────────────────
  useEffect(() => {
    warmUpPreloader();
  }, []);

  // ── Preload visible projects' thumbnails when they change ──────────────
  useEffect(() => {
    if (filteredProjects.length > 0) {
      preloadVisibleProjects(filteredProjects);
    }
  }, [filteredProjects]);

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string | null>(null);
  const [hoveredLandmarkId, setHoveredLandmarkId] = useState<string | null>(null);
  const [activeIsochrone, setActiveIsochrone] = useState<{ mode: 'driving' | 'walking'; minutes: number } | null>(null);
  const [showNearbyPanel, setShowNearbyPanel] = useState(false);
  const [selectedLandmarkForSearch, setSelectedLandmarkForSearch] = useState<Landmark | null>(null);
  const [activeRouteInfo, setActiveRouteInfo] = useState<{
    geometry: any;
    startName: string; startLng: number; startLat: number;
    destName: string; destLng: number; destLat: number;
  } | null>(null);
  const activeRouteGeometry = activeRouteInfo?.geometry || null;
  const [activePresentation, setActivePresentation] = useState<ClientPresentation | null>(null);

  // Street View panel state
  const [streetViewData, setStreetViewData] = useState<{ lat: number; lng: number; name: string } | null>(null);

  // AR Mode state
  const [isAROpen, setIsAROpen] = useState(false);
  const [showWelcomeBanner, _setShowWelcomeBanner] = useState(() => {
    const saved = localStorage.getItem('psi_banner_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  // Banner appearance settings synced from Firestore (duration in seconds, position in %)
  const [bannerSettings, setBannerSettings] = useState({ duration: 5, position: { top: 30, left: 12 }, positionMobile: { top: 15, left: 50 }, mobileFooterTheme: 'glass' });

  // Landmark 3D info modal state
  const [infoLandmark, setInfoLandmark] = useState<Landmark | null>(null);

  // Coordinate Review Tool state
  const [showCoordReview, setShowCoordReview] = useState(false);
  const [auditReviewProject, setAuditReviewProject] = useState<Project | null>(null);

  const setShowWelcomeBanner = (newValue: boolean) => {
    _setShowWelcomeBanner(newValue);
    localStorage.setItem('psi_banner_enabled', String(newValue));
  };

  // Real-time listener: settings/global
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.showWelcomeBanner !== undefined) setShowWelcomeBanner(data.showWelcomeBanner);
        setCameraDuration(data.cameraDuration ?? 2000);
        if (data.bannerDuration !== undefined) setBannerSettings(prev => ({ ...prev, duration: data.bannerDuration }));
        if (data.bannerPosition !== undefined) setBannerSettings(prev => ({ ...prev, position: data.bannerPosition }));
        if (data.bannerPositionMobile !== undefined) setBannerSettings(prev => ({ ...prev, positionMobile: data.bannerPositionMobile }));
        if (data.mobileFooterTheme !== undefined) setBannerSettings(prev => ({ ...prev, mobileFooterTheme: data.mobileFooterTheme }));
      }
    });
    return () => unsub();
  }, []);

  // Listen for Street View open requests from sidebar
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.lat && detail?.lng) {
        setStreetViewData({ lat: detail.lat, lng: detail.lng, name: detail.name || 'Location' });
      }
    };
    window.addEventListener('open-street-view', handler);
    return () => window.removeEventListener('open-street-view', handler);
  }, []);

  // Listen for AR mode toggle from Settings
  useEffect(() => {
    const handler = () => setIsAROpen(true);
    window.addEventListener('open-ar-mode', handler);
    return () => window.removeEventListener('open-ar-mode', handler);
  }, []);

  // ── Deep Link / App Shortcut Handler ─────────────────────────────────────
  // Handles ?action=search|favorites|chat|map and ?project=ID from:
  // 1. manifest.json shortcuts (long-press app icon)
  // 2. Push notification deep links (sw.js → NOTIFICATION_CLICK)
  // 3. Direct URL sharing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const projectId = params.get('project');

    if (action) {
      // Slight delay to ensure components are mounted
      setTimeout(() => {
        switch (action) {
          case 'search':
            // Open mobile search modal
            window.dispatchEvent(new CustomEvent('open-mobile-search'));
            break;
          case 'favorites':
            window.dispatchEvent(new CustomEvent('open-favorites-panel'));
            break;
          case 'chat':
            window.dispatchEvent(new CustomEvent('open-ai-chat'));
            break;
          case 'map':
            // Map is default — do nothing or reset view
            break;
        }
      }, 1000);

      // Clean the URL without reload
      const clean = new URL(window.location.href);
      clean.searchParams.delete('action');
      window.history.replaceState({}, '', clean.toString());
    }

    if (projectId) {
      setTimeout(() => {
        setSelectedProjectId(projectId);
        setIsAnalysisOpen(true);
        const project = liveProjects.find(p => p.id === projectId);
        if (project) {
          handleFlyTo(project.longitude, project.latitude, 16);
        }
      }, 1500);

      const clean = new URL(window.location.href);
      clean.searchParams.delete('project');
      window.history.replaceState({}, '', clean.toString());
    }
  }, [liveProjects]);

  // Listen for notification deep-link events (from sw.js via swRegistration)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.projectId) {
        setSelectedProjectId(detail.projectId);
        setIsAnalysisOpen(true);
        const project = liveProjects.find((p: Project) => p.id === detail.projectId);
        if (project) {
          haptic.nav();
          handleFlyTo(project.longitude, project.latitude, 16);
        }
      }
    };
    window.addEventListener('psi-deep-link', handler);
    return () => window.removeEventListener('psi-deep-link', handler);
  }, [liveProjects, handleFlyTo]);

  // Auto-infer city when a community is selected (prevents dropdown desync)
  useEffect(() => {
    if (!selectedCommunity) return;
    const matched = liveProjects.find(
      p => p.community?.toLowerCase().trim() === selectedCommunity.toLowerCase().trim()
    );
    if (matched?.city && matched.city !== selectedCity) {
      setSelectedCity(matched.city);
    }
  }, [selectedCommunity, liveProjects, selectedCity, setSelectedCity]);

  // Clear community boundary when community changes (prevents stale boundary overlay)
  useEffect(() => {
    if (activeBoundary) {
      setActiveBoundary(null);
    }
  }, [selectedCommunity]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle route geometry from the sidebar's Directions call
  const handleRouteReady = (routeInfo: { geometry: any; startName: string; startLng: number; startLat: number; destName: string; destLng: number; destLat: number } | null) => {
    setActiveRouteInfo(routeInfo);
    const geometry = routeInfo?.geometry;
    if (geometry && geometry.coordinates && geometry.coordinates.length >= 2) {
      const lngs = geometry.coordinates.map((c: number[]) => c[0]);
      const lats = geometry.coordinates.map((c: number[]) => c[1]);
      const bbox: [number, number, number, number] = [
        Math.min(...lngs), Math.min(...lats),
        Math.max(...lngs), Math.max(...lats),
      ];
      // Mapbox best practice: fit route only within the visible map area
      // Panels are treated as blocked space — route stays centered in the clear zone
      const map = mapRef.current?.getMap();
      const isDesktop = typeof window !== 'undefined' && window.innerWidth > 768;
      const routePadding = isDesktop
        ? { top: 140, bottom: 100, left: 460, right: 460 }
        : { top: 100, bottom: 280, left: 40, right: 40 };
      map?.fitBounds(bbox, { padding: routePadding, duration: 1500, maxZoom: 15 });

      // Navigation-style camera tilt — adds depth after route fits
      if (map) {
        setTimeout(() => {
          map.easeTo({ pitch: 40, bearing: map.getBearing(), duration: 1200 });
        }, 1600);
      }
    }
  };

  // IMPORTANT: Fall back to liveProjects when selectedProject is not in filteredProjects.
  // This happens when searching for a project in a different community — the filter
  // state (selectedCommunity) may not have updated yet in the same React cycle.
  const selectedProject = filteredProjects.find(p => p.id === selectedProjectId)
    || liveProjects.find(p => p.id === selectedProjectId)
    || null;
  const hoveredProject = filteredProjects.find(p => p.id === hoveredProjectId) || null;
  const selectedLandmark = filteredAmenities.find(l => l.id === selectedLandmarkId) || null;

  // Lasso spatial filter: applied on top of filteredProjects when ≥3 points are drawn
  const lassoFilteredProjects = useMemo(() => {
    if (!enableLasso || drawnCoordinates.length < 3) return filteredProjects;
    try {
      const closed = [...drawnCoordinates, drawnCoordinates[0]];
      const polygon = turfPolygon([closed]);
      return filteredProjects.filter(p => {
        if (isNaN(Number(p.longitude)) || isNaN(Number(p.latitude))) return false;
        return booleanPointInPolygon(
          turfPoint([Number(p.longitude), Number(p.latitude)]),
          polygon
        );
      });
    } catch {
      return filteredProjects;
    }
  }, [filteredProjects, drawnCoordinates, enableLasso]);

  // Show top 5 proximity landmarks when a project is selected, or strictly map filters
  const projectSpecificLandmarks = useMemo((): Landmark[] => {
    if (!selectedProject) return [];
    const projCoord: [number, number] = [Number(selectedProject.longitude), Number(selectedProject.latitude)];
    const withDist = liveLandmarks
      .filter(l => !l.isHidden && !isNaN(Number(l.latitude)) && !isNaN(Number(l.longitude)))
      .map(l => ({
        ...l,
        _dist: turfDistance(projCoord, [Number(l.longitude), Number(l.latitude)])
      }))
      .sort((a, b) => a._dist - b._dist);

    const topLandmarks: Landmark[] = [];
    const counts: Record<string, number> = {};
    for (const l of withDist) {
      // Respect active amenity filters — normalise category to lowercase to match toggle values
      if (activeAmenities.length > 0 && !activeAmenities.includes(l.category.toLowerCase())) continue;
      counts[l.category] = (counts[l.category] || 0) + 1;
      if (counts[l.category] <= 5) topLandmarks.push(l);
    }
    return topLandmarks;
  }, [selectedProject, liveLandmarks, activeAmenities, showNearbyPanel]);

  // Projects within 5km of selected landmark — uses liveProjects (full DB) so city filters don't block results
  const nearbyProjects = useMemo((): Project[] => {
    if (!selectedLandmarkForSearch) return [];
    const lCoord: [number, number] = [Number(selectedLandmarkForSearch.longitude), Number(selectedLandmarkForSearch.latitude)];
    return liveProjects.filter(p => {
      if (!p.longitude || !p.latitude || isNaN(Number(p.longitude)) || isNaN(Number(p.latitude))) return false;
      return turfDistance(lCoord, [Number(p.longitude), Number(p.latitude)]) <= 5;
    });
  }, [selectedLandmarkForSearch, liveProjects]);

  // Resolve saved presentation IDs back to full Project objects in order
  const presentationProjects = useMemo(() => {
    if (!activePresentation) return null;
    return activePresentation.projectIds
      .map(id => liveProjects.find(p => p.id === id))
      .filter(Boolean) as Project[];
  }, [activePresentation, liveProjects]);

  const handleFitBounds = (projectsToFit: Project[], isDefault = false) => {
    if (!mapRef.current) return;
    const defaultBounds: [number, number, number, number] = [51.5, 22.5, 56.5, 26.0];

    const uiPadding = typeof window !== 'undefined' && window.innerWidth > 768
      ? { top: 80, bottom: 80, left: 420, right: 80 }
      : { top: 80, bottom: 300, left: 40, right: 40 };

    if (isDefault || !projectsToFit.length) {
      mapRef.current.getMap().fitBounds(defaultBounds, { padding: uiPadding, duration: 1500 });
      return;
    }

    // Pass 1: strict UAE geographic bounds
    let validProjects = projectsToFit.filter(p => {
      const lat = Number(p.latitude); const lng = Number(p.longitude);
      return !isNaN(lat) && !isNaN(lng) && lat > 22 && lat < 27 && lng > 51 && lng < 57;
    });

    // Pass 2: median-center outlier rejection (~15km radius around the cluster)
    if (validProjects.length > 2) {
      const sortedLats = [...validProjects.map(p => Number(p.latitude))].sort((a, b) => a - b);
      const sortedLngs = [...validProjects.map(p => Number(p.longitude))].sort((a, b) => a - b);
      const medianLat = sortedLats[Math.floor(sortedLats.length / 2)];
      const medianLng = sortedLngs[Math.floor(sortedLngs.length / 2)];
      validProjects = validProjects.filter(p =>
        Math.abs(Number(p.latitude) - medianLat) < 0.15 &&
        Math.abs(Number(p.longitude) - medianLng) < 0.15
      );
    }

    if (!validProjects.length) {
      mapRef.current.getMap().fitBounds(defaultBounds, { padding: uiPadding, duration: 1500 });
      return;
    }

    const lats = validProjects.map(p => Number(p.latitude));
    const lngs = validProjects.map(p => Number(p.longitude));
    const bbox: [number, number, number, number] = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
    mapRef.current.getMap().fitBounds(bbox, { padding: uiPadding, duration: 1200, maxZoom: 15 });
  };

  const handleLocationSelect = async (locationType: 'city' | 'community', locationName: string, projectsInLocation: Project[]) => {
    if (!locationName) {
      setActiveBoundary(null);
      handleFitBounds([], true); // Force default UAE zoom
      return;
    }
    if (locationType === 'city') {
      setActiveBoundary(null);
      handleFitBounds(projectsInLocation);
    } else if (locationType === 'community') {
      if (mapFeatures.showCommunityBorders) {
        try {
          const geojson = await getBoundaryFromDB(locationName);
          if (geojson) {
            setActiveBoundary(geojson);
            const bbox = turfBbox(geojson) as [number, number, number, number];
            const uiPadding = typeof window !== 'undefined' && window.innerWidth > 768
              ? { top: 80, bottom: 80, left: 420, right: 80 }
              : { top: 80, bottom: 300, left: 40, right: 40 };
            mapRef.current?.getMap().fitBounds(bbox, { padding: uiPadding, duration: 1500 });
            return;
          }
        } catch (e) { console.error(e); }
      }
      setActiveBoundary(null);
      handleFitBounds(projectsInLocation);
    }
  };

  const handleMarkerClick = (id: string) => {
    haptic.tap();
    setSelectedProjectId(id);
    setSelectedLandmarkId(null);
    setActiveRouteInfo(null);
    setIsAnalysisOpen(true);
    // Use liveProjects as fallback — filteredProjects may not contain this project
    // if community/city filters are still set to the previous context
    const p = filteredProjects.find(pr => pr.id === id) || liveProjects.find(pr => pr.id === id);
    if (p) {
      setSelectedCity(p.city || '');
      setSelectedCommunity(p.community || '');
      if (p.latitude && p.longitude && !isNaN(p.latitude) && !isNaN(p.longitude)) {
        handleFlyTo(p.longitude, p.latitude, 16);
      }
      recordRecentView(p.id, p.name, p.thumbnailUrl);
      // Predictive: preload project screen + record navigation pattern
      preloadProjectScreen(p);
      recordNavigation('map', 'project', p.id);
      preloadPredictedScreens('project');
      // Analytics: track project view
      AnalyticsEvents.projectView(p.id, p.name);
      AnalyticsEvents.screenView('project');
    }
  };

  const handleSearchSelect = (project: Project) => {
    haptic.nav();
    handleFlyTo(project.longitude, project.latitude, 16);
    setSelectedProjectId(project.id);
    setSelectedLandmarkId(null);
    setActiveRouteInfo(null);
    setIsAnalysisOpen(true);
    setSelectedCity(project.city || '');
    setSelectedCommunity(project.community || '');
    recordRecentView(project.id, project.name, project.thumbnailUrl);
    addSearchEntry({ query: project.name, type: 'text', resultCount: 1 });
    // Predictive: preload + record pattern
    preloadProjectScreen(project);
    recordNavigation('map', 'project', project.id);
    // Analytics: track search + project view
    AnalyticsEvents.projectSearch(project.name, 1);
    AnalyticsEvents.projectView(project.id, project.name);
  };

  const handleLandmarkClick = (l: any) => {
    // Fly gently — don't deselect the active project or close the sidebar
    setSelectedLandmarkId(l.id);
    setSelectedLandmarkForSearch(l as Landmark);
    if (l.latitude && l.longitude && !isNaN(l.latitude) && !isNaN(l.longitude)) {
      handleFlyTo(l.longitude, l.latitude, 15);
    }
  };

  // Separate handler for the ⓘ badge — only opens modal, never moves the map
  const handleLandmarkInfoClick = (l: Landmark) => {
    setInfoLandmark(l);
  };

  const handleMapClick = (e: any) => {
    if (e.originalEvent?.target === mapRef.current?.getMap().getCanvas()) {
      setSelectedProjectId(null); setSelectedLandmarkId(null); setIsAnalysisOpen(false); setActiveRouteInfo(null);
    }
  };

  const onCloseProject = () => {
    setSelectedProjectId(null);
    setIsAnalysisOpen(false);
    setActiveIsochrone(null);
    setShowNearbyPanel(false);
    setSelectedLandmarkForSearch(null);
    setActiveRouteInfo(null); // Clear route when closing project sidebar
  };

  const handleFocusProjectFromReverseSearch = (id: string) => {
    setSelectedProjectId(id);
    setIsAnalysisOpen(false); // keep sidebar closed — user is browsing reverse-search results

    const p = liveProjects.find(pr => pr.id === id);
    if (p && p.latitude && p.longitude && selectedLandmarkForSearch) {
      const lLng = Number(selectedLandmarkForSearch.longitude);
      const lLat = Number(selectedLandmarkForSearch.latitude);
      const pLng = Number(p.longitude);
      const pLat = Number(p.latitude);

      if (!isNaN(lLng) && !isNaN(lLat) && !isNaN(pLng) && !isNaN(pLat)) {
        const bbox: [number, number, number, number] = [
          Math.min(lLng, pLng), Math.min(lLat, pLat),
          Math.max(lLng, pLng), Math.max(lLat, pLat),
        ];
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const padding = isMobile
          ? { top: 100, bottom: 350, left: 60, right: 60 }
          : { top: 150, bottom: 150, left: 150, right: 400 };
        mapRef.current?.getMap().fitBounds(bbox, { padding, duration: 1200, maxZoom: 15 });
      }
    }
  };

  const handleGlobalReset = () => {
    haptic.heavy();
    setSelectedProjectId(null);
    setSelectedLandmarkId(null);
    setIsAnalysisOpen(false);
    setActiveIsochrone(null);
    setActiveBoundary(null);
    setSelectedCity('');
    setSelectedCommunity('');
    setDeveloperFilter('All');
    setStatusFilter('All');
    setPropertyType('All');
    handleFitBounds([], true);
    setSelectedLandmarkForSearch(null);
    setActiveRouteInfo(null); // Clear route on global reset
  };

  const handleQuickFilter = (type: 'community' | 'developer', value: string) => {
    if (type === 'community') {
      // Preserve the city lock — look up the parent city for this community
      const parentProj = liveProjects.find(p => p.community?.toLowerCase() === value.toLowerCase());
      if (parentProj?.city) setSelectedCity(parentProj.city);
      setSelectedCommunity(value);
      setDeveloperFilter('All');
      handleFitBounds(liveProjects.filter(p => p.community?.toLowerCase() === value.toLowerCase()));
    } else if (type === 'developer') {
      setDeveloperFilter(value);
      handleFitBounds(liveProjects.filter(p => p.developerName === value));
    }
    setIsAnalysisOpen(false);
  };

  return (
    <MainLayout
      viewMode={viewMode} setViewMode={setViewMode} isAdminOpen={isAdminOpen} setIsAdminOpen={setIsAdminOpen}
      isAnalysisOpen={isAnalysisOpen} setIsAnalysisOpen={setIsAnalysisOpen} liveProjects={liveProjects} setLiveProjects={setLiveProjects}
      liveLandmarks={liveLandmarks} setLiveLandmarks={setLiveLandmarks}
      selectedProject={selectedProject} filteredProjects={lassoFilteredProjects} isRefreshing={isRefreshing} onRefresh={loadInitialData}
      onProjectClick={handleMarkerClick} onCloseProject={onCloseProject} filterPolygon={filterPolygon}
      activeAmenities={activeAmenities} onToggleAmenity={handleToggleAmenity} isDrawing={isDrawing} onToggleDraw={handleToggleDraw}
      mapStyle={mapStyle} setMapStyle={setMapStyle} onDiscoverNeighborhood={(lat, lng) => fetchNearbyAmenities(lat, lng)}
      onFlyTo={handleFlyTo}
      startCinematicTour={startCinematicTour}
      mapFeatures={mapFeatures} setMapFeatures={setMapFeatures}
      propertyType={propertyType} setPropertyType={setPropertyType}
      developerFilter={developerFilter} setDeveloperFilter={setDeveloperFilter}
      statusFilter={statusFilter} setStatusFilter={setStatusFilter}
      selectedCity={selectedCity} setSelectedCity={setSelectedCity}
      selectedCommunity={selectedCommunity} setSelectedCommunity={setSelectedCommunity}
      handleFitBounds={handleFitBounds}
      handleLocationSelect={handleLocationSelect}
      onQuickFilter={handleQuickFilter}
      activeBoundary={activeBoundary}
      handleGlobalReset={handleGlobalReset}
      activeIsochrone={activeIsochrone}
      setActiveIsochrone={setActiveIsochrone}
      showNearbyPanel={showNearbyPanel}
      setShowNearbyPanel={setShowNearbyPanel}
      projectSpecificLandmarks={projectSpecificLandmarks}
      showWelcomeBanner={showWelcomeBanner}
      hoveredProjectId={hoveredProjectId}
      setHoveredProjectId={setHoveredProjectId}
      cameraDuration={cameraDuration}
      activePresentation={activePresentation}
      presentationProjects={presentationProjects}
      onLaunchPresentation={(pres) => { setActivePresentation(pres); setIsAdminOpen(false); }}
      onExitPresentation={() => setActivePresentation(null)}
      onSelectLandmark={handleLandmarkClick}
      selectedLandmarkForSearch={selectedLandmarkForSearch}
      mapRef={mapRef}
      activeRouteGeometry={activeRouteGeometry}
      onRouteReady={handleRouteReady}
      enableHeatmap={enableHeatmap} setEnableHeatmap={setEnableHeatmap}
      enableSunlight={enableSunlight} setEnableSunlight={setEnableSunlight}
      enableIsochrone={enableIsochrone} setEnableIsochrone={setEnableIsochrone}
      enableLasso={enableLasso} setEnableLasso={setEnableLasso}
      mobileFooterTheme={bannerSettings.mobileFooterTheme}
      bannerSettings={bannerSettings}
      showCoordReview={showCoordReview}
      setShowCoordReview={setShowCoordReview}
      onAuditProjectChange={setAuditReviewProject}
    >
      <WelcomeBanner show={showWelcomeBanner} isAppLoading={isRefreshing} duration={bannerSettings.duration} position={bannerSettings.position} positionMobile={bannerSettings.positionMobile} />

      <ErrorBoundary>
        <MapCanvas
          mapRef={mapRef} viewState={viewState} setViewState={setViewState} updateBounds={updateBounds} mapStyle={mapStyle} onClick={handleMapClick}
          drawRef={drawRef} onDrawCreate={e => { setFilterPolygon(e.features[0]); setIsDrawing(false); }} onDrawUpdate={e => setFilterPolygon(e.features[0])} onDrawDelete={() => { setFilterPolygon(null); setIsDrawing(false); }}
          filteredAmenities={selectedProject ? projectSpecificLandmarks : filteredAmenities}
          onMarkerClick={handleMarkerClick} onLandmarkClick={handleLandmarkClick}
          selectedProjectId={selectedProjectId} setHoveredProjectId={setHoveredProjectId} setHoveredLandmarkId={setHoveredLandmarkId}
          selectedLandmark={selectedLandmark} selectedProject={selectedProject} hoveredProject={hoveredProject}
          projects={lassoFilteredProjects}
          mapFeatures={mapFeatures}
          activeBoundary={activeBoundary}
          activeIsochrone={activeIsochrone}
          selectedLandmarkForSearch={selectedLandmarkForSearch}
          hoveredProjectId={hoveredProjectId}
          activeRouteGeometry={activeRouteGeometry}
          activeRouteInfo={activeRouteInfo}
          enableHeatmap={enableHeatmap}
          enableSunlight={enableSunlight}
          isLassoMode={isLassoMode}
          drawnCoordinates={drawnCoordinates}
          setDrawnCoordinates={setDrawnCoordinates}
          onLandmarkInfo={handleLandmarkInfoClick}
          auditReviewProject={showCoordReview ? auditReviewProject : null}
          enableROIHeatmap={enableROIHeatmap}
          roiZones={sampleROIZones}
          onCloseROIHeatmap={() => setEnableROIHeatmap(false)}
          selectedTimeYear={selectedTimeYear}
        />
      </ErrorBoundary>

      {/* Floating "Exit Route" button — visible when a driving route is active */}
      {activeRouteInfo && (
        <button
          onClick={() => {
            haptic.tap();
            setActiveRouteInfo(null);
            // Reset pitch back to flat
            mapRef.current?.getMap()?.easeTo({ pitch: 0, duration: 800 });
          }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[6500] flex items-center gap-2 px-5 py-2.5 bg-slate-900/90 backdrop-blur-lg text-white rounded-full shadow-2xl border border-white/10 hover:bg-red-600 transition-all hover:scale-105 group"
          title="Close driving route"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 group-hover:rotate-90 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          <span className="text-xs font-bold uppercase tracking-wider">Exit Route</span>
        </button>
      )}

      {/* Floating Time Slider Panel — RIGHT side, not center */}
      {showTimeSlider && (
        <Suspense fallback={null}>
          <div className="fixed bottom-20 right-4 z-[6000] w-[260px] lg:w-[280px]">
            <TimeSlider
              selectedYear={selectedTimeYear}
              onYearChange={setSelectedTimeYear}
              growthData={{
                2015: 0,
                2018: 18,
                2020: 25,
                2022: 42,
                2024: 58,
                2025: 65,
              }}
              onClose={() => setShowTimeSlider(false)}
            />
          </div>
        </Suspense>
      )}

      {/* Floating Before/After Slider — RIGHT side */}
      {showBeforeAfter && (
        <Suspense fallback={null}>
          <div className="fixed bottom-20 right-4 z-[6000] w-[260px] lg:w-[280px]">
            <BeforeAfterSlider
              beforeYear={2015}
              afterYear={2025}
              onClose={() => setShowBeforeAfter(false)}
            />
          </div>
        </Suspense>
      )}
      {/* Reverse Search: floating nearby projects panel */}
      {selectedLandmarkForSearch && nearbyProjects.length > 0 && (
        <PropertyResultsList
          landmark={selectedLandmarkForSearch}
          projects={nearbyProjects}
          onClose={() => setSelectedLandmarkForSearch(null)}
          onHoverProject={setHoveredProjectId}
          onSelectProject={handleFocusProjectFromReverseSearch}
        />
      )}
      {/* Landmark 3D Info Modal */}
      {infoLandmark && (
        <Suspense fallback={null}>
          <LandmarkInfoModal
            landmark={infoLandmark}
            onClose={() => setInfoLandmark(null)}
          />
        </Suspense>
      )}

      {/* Street View Split Screen Panel */}
      {streetViewData && (
        <Suspense fallback={null}>
          <StreetViewPanel
            lat={streetViewData.lat}
            lng={streetViewData.lng}
            projectName={streetViewData.name}
            onClose={() => setStreetViewData(null)}
          />
        </Suspense>
      )}

      {/* AR Mode Overlay */}
      {isAROpen && (
        <Suspense fallback={null}>
          <ARView
            projects={liveProjects}
            onClose={() => setIsAROpen(false)}
            onSelectProject={(p) => {
              setIsAROpen(false);
              handleMarkerClick(p.id);
            }}
          />
        </Suspense>
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* PWA Status Overlays — Offline banner, update prompt, error toasts */}
      <PWAStatusOverlays />
    </MainLayout>
  );
};

// ── Outer router — checks pathname BEFORE any hooks fire ─────────────────────
// PresentationShowcase self-loads its Firestore data, so no props needed here.
const App: React.FC = () => {
  if (typeof window !== 'undefined' && window.location.pathname === '/presentation') {
    return <Suspense fallback={<div className="flex items-center justify-center h-screen bg-slate-900"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>}><PresentationShowcase /></Suspense>;
  }
  return <FavoritesProvider><AppInner /></FavoritesProvider>;
};

export default App;
