import React, { useState, useMemo, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import { useProjectData } from './hooks/useProjectData';
import { useMapState } from './hooks/useMapState';
import { fetchNearbyAmenities } from './utils/placesClient';
import { fetchLocationBoundary } from './utils/boundaryFetcher';
import { getBoundaryFromDB } from './utils/boundaryService';
import MainLayout from './components/MainLayout';
import MapCanvas from './components/MapCanvas';
import ErrorBoundary from './components/ErrorBoundary';
import { Project, Landmark } from './types';
import WelcomeBanner from './components/WelcomeBanner';
import PropertyResultsList from './components/PropertyResultsList';
import 'mapbox-gl/dist/mapbox-gl.css';
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

const App: React.FC = () => {
  const {
    liveProjects, setLiveProjects, liveLandmarks, setLiveLandmarks, isRefreshing, loadInitialData, filteredProjects,
    filteredAmenities, activeAmenities, handleToggleAmenity, filterPolygon, setFilterPolygon,
    propertyType, setPropertyType,
    developerFilter, setDeveloperFilter,
    statusFilter, setStatusFilter
  } = useProjectData();

  const {
    viewState, setViewState, mapStyle, setMapStyle, bounds, updateBounds,
    isDrawing, setIsDrawing, mapRef, drawRef, handleFlyTo, handleToggleDraw
  } = useMapState(filteredProjects);

  // Super Admin Toggles
  const [mapFeatures, setMapFeatures] = useState({ show3D: true, showAnalytics: true, showCommunityBorders: true });

  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedCommunity, setSelectedCommunity] = useState<string>('');
  const [activeBoundary, setActiveBoundary] = useState<any>(null);

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string | null>(null);
  const [hoveredLandmarkId, setHoveredLandmarkId] = useState<string | null>(null);
  const [activeIsochrone, setActiveIsochrone] = useState<{ mode: 'driving' | 'walking'; minutes: number } | null>(null);
  const [showNearbyPanel, setShowNearbyPanel] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [selectedLandmarkForSearch, setSelectedLandmarkForSearch] = useState<Landmark | null>(null);

  // Real-time listener: settings/global.showWelcomeBanner
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        setShowWelcomeBanner(snap.data().showWelcomeBanner ?? false);
      }
    });
    return () => unsub();
  }, []);

  const selectedProject = filteredProjects.find(p => p.id === selectedProjectId) || null;
  const hoveredProject = filteredProjects.find(p => p.id === hoveredProjectId) || null;
  const selectedLandmark = filteredAmenities.find(l => l.id === selectedLandmarkId) || null;

  // Only show the top 5 landmarks per category for the selected project when the panel is open
  const projectSpecificLandmarks = useMemo((): Landmark[] => {
    if (!selectedProject || !showNearbyPanel) return [];
    const projCoord: [number, number] = [Number(selectedProject.longitude), Number(selectedProject.latitude)];
    const withDist = liveLandmarks
      .filter(l => !l.isHidden && !isNaN(Number(l.latitude)) && !isNaN(Number(l.longitude)))
      .map(l => ({
        ...l,
        _dist: turf.distance(projCoord, [Number(l.longitude), Number(l.latitude)])
      }))
      .sort((a, b) => a._dist - b._dist);

    const topLandmarks: Landmark[] = [];
    const counts: Record<string, number> = {};
    for (const l of withDist) {
      counts[l.category] = (counts[l.category] || 0) + 1;
      if (counts[l.category] <= 5) topLandmarks.push(l);
    }
    return topLandmarks;
  }, [selectedProject, liveLandmarks, showNearbyPanel]);

  // Projects within 5km of selected landmark for Reverse Search
  const nearbyProjects = useMemo((): Project[] => {
    if (!selectedLandmarkForSearch) return [];
    const lCoord: [number, number] = [Number(selectedLandmarkForSearch.longitude), Number(selectedLandmarkForSearch.latitude)];
    return filteredProjects.filter(p => {
      if (!p.longitude || !p.latitude || isNaN(Number(p.longitude)) || isNaN(Number(p.latitude))) return false;
      return turf.distance(lCoord, [Number(p.longitude), Number(p.latitude)]) <= 5;
    });
  }, [selectedLandmarkForSearch, filteredProjects]);

  const handleFitBounds = (projectsToFit: Project[], isDefault = false) => {
    if (!mapRef.current) return;
    const defaultBounds: [number, number, number, number] = [51.5, 22.5, 56.5, 26.0];

    if (isDefault || !projectsToFit.length) {
      mapRef.current.getMap().fitBounds(defaultBounds, { padding: 50, duration: 1500 });
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
      mapRef.current.getMap().fitBounds(defaultBounds, { padding: 50, duration: 1500 });
      return;
    }

    const lats = validProjects.map(p => Number(p.latitude));
    const lngs = validProjects.map(p => Number(p.longitude));
    const bbox: [number, number, number, number] = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
    mapRef.current.getMap().fitBounds(bbox, { padding: 80, duration: 1200, maxZoom: 15 });
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
            const bbox = turf.bbox(geojson) as [number, number, number, number];
            mapRef.current?.getMap().fitBounds(bbox, { padding: 80, duration: 1500 });
            return;
          }
        } catch (e) { console.error(e); }
      }
      setActiveBoundary(null);
      handleFitBounds(projectsInLocation);
    }
  };

  const handleMarkerClick = (id: string) => {
    setSelectedProjectId(id);
    setSelectedLandmarkId(null);
    setIsAnalysisOpen(true);
    const p = filteredProjects.find(pr => pr.id === id);
    if (p) {
      // Sync Breadcrumbs on click
      setSelectedCity(p.city || '');
      setSelectedCommunity(p.community || '');

      if (p.latitude && p.longitude && !isNaN(p.latitude) && !isNaN(p.longitude)) {
        handleFlyTo(p.longitude, p.latitude, 16);
      }
    }
  };

  const handleSearchSelect = (project: Project) => {
    handleFlyTo(project.longitude, project.latitude, 16);
    setSelectedProjectId(project.id);
    setSelectedLandmarkId(null);
    setIsAnalysisOpen(true);
    // Sync Breadcrumbs on select
    setSelectedCity(project.city || '');
    setSelectedCommunity(project.community || '');
  };

  const handleLandmarkClick = (l: any) => {
    setSelectedLandmarkId(l.id);
    setSelectedProjectId(null);
    setSelectedLandmarkForSearch(l as Landmark);
    if (l.latitude && l.longitude && !isNaN(l.latitude) && !isNaN(l.longitude)) {
      handleFlyTo(l.longitude, l.latitude, 14);
    }
  };

  const handleMapClick = (e: any) => {
    if (e.originalEvent?.target === mapRef.current?.getMap().getCanvas()) {
      setSelectedProjectId(null); setSelectedLandmarkId(null); setIsAnalysisOpen(false);
    }
  };

  const onCloseProject = () => {
    setSelectedProjectId(null);
    setIsAnalysisOpen(false);
    setActiveIsochrone(null);
    setShowNearbyPanel(false);
    setSelectedLandmarkForSearch(null);
  };

  const handleGlobalReset = () => {
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
  };

  const handleQuickFilter = (type: 'community' | 'developer', value: string) => {
    if (type === 'community' && setSelectedCommunity && handleLocationSelect) {
      setSelectedCommunity(value);
      setSelectedCity('');
      handleLocationSelect('community', value, liveProjects.filter(p => p.community === value));
    } else if (type === 'developer' && setDeveloperFilter) {
      setDeveloperFilter(value);
      handleFitBounds(liveProjects.filter(p => p.developerName === value));
    }
    setIsAnalysisOpen(false); // Close sidebar to show map results
  };

  return (
    <MainLayout
      viewMode={viewMode} setViewMode={setViewMode} isAdminOpen={isAdminOpen} setIsAdminOpen={setIsAdminOpen}
      isAnalysisOpen={isAnalysisOpen} setIsAnalysisOpen={setIsAnalysisOpen} liveProjects={liveProjects} setLiveProjects={setLiveProjects}
      liveLandmarks={liveLandmarks} setLiveLandmarks={setLiveLandmarks}
      selectedProject={selectedProject} filteredProjects={filteredProjects} isRefreshing={isRefreshing} onRefresh={loadInitialData}
      onProjectClick={handleMarkerClick} onCloseProject={onCloseProject} filterPolygon={filterPolygon}
      activeAmenities={activeAmenities} onToggleAmenity={handleToggleAmenity} isDrawing={isDrawing} onToggleDraw={handleToggleDraw}
      mapStyle={mapStyle} setMapStyle={setMapStyle} onDiscoverNeighborhood={(lat, lng) => fetchNearbyAmenities(lat, lng)}
      onFlyTo={handleFlyTo}
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
    >
      <WelcomeBanner show={showWelcomeBanner} />
      <ErrorBoundary>
        <MapCanvas
          mapRef={mapRef} viewState={viewState} setViewState={setViewState} updateBounds={updateBounds} mapStyle={mapStyle} onClick={handleMapClick}
          drawRef={drawRef} onDrawCreate={e => { setFilterPolygon(e.features[0]); setIsDrawing(false); }} onDrawUpdate={e => setFilterPolygon(e.features[0])} onDrawDelete={() => { setFilterPolygon(null); setIsDrawing(false); }}
          filteredAmenities={showNearbyPanel ? projectSpecificLandmarks : filteredAmenities}
          onMarkerClick={handleMarkerClick} onLandmarkClick={handleLandmarkClick}
          selectedProjectId={selectedProjectId} setHoveredProjectId={setHoveredProjectId} setHoveredLandmarkId={setHoveredLandmarkId}
          selectedLandmark={selectedLandmark} selectedProject={selectedProject} hoveredProject={hoveredProject}
          projects={filteredProjects}
          mapFeatures={mapFeatures}
          activeBoundary={activeBoundary}
          activeIsochrone={activeIsochrone}
          selectedLandmarkForSearch={selectedLandmarkForSearch}
          hoveredProjectId={hoveredProjectId}
        />
      </ErrorBoundary>
      {/* Reverse Search: floating nearby projects panel */}
      {selectedLandmarkForSearch && nearbyProjects.length > 0 && (
        <PropertyResultsList
          landmark={selectedLandmarkForSearch}
          projects={nearbyProjects}
          onClose={() => setSelectedLandmarkForSearch(null)}
          onHoverProject={setHoveredProjectId}
          onSelectProject={handleMarkerClick}
        />
      )}
    </MainLayout>
  );
};
export default App;
