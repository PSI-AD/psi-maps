import React, { useState } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import { useProjectData } from './hooks/useProjectData';
import { useMapState } from './hooks/useMapState';
import { fetchNearbyAmenities } from './utils/placesClient';
import { fetchLocationBoundary } from './utils/boundaryFetcher';
import MainLayout from './components/MainLayout';
import MapCanvas from './components/MapCanvas';
import { Project } from './types';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

// FIX: Set Mapbox token globally to prevent MapboxDraw plugin crashes
mapboxgl.accessToken = 'pk.eyJ1IjoicHNpbnYiLCJhIjoiY21scjBzM21xMDZqNzNmc2VmdGt5MW05ZCJ9.VxIEn1jLTzMwLAN8m4B15g';

const App: React.FC = () => {
  const {
    liveProjects, setLiveProjects, liveLandmarks, setLiveLandmarks, isRefreshing, loadInitialData, filteredProjects,
    filteredAmenities, activeAmenities, handleToggleAmenity, filterPolygon, setFilterPolygon,
    propertyType, setPropertyType,
    developerFilter, setDeveloperFilter,
    statusFilter, setStatusFilter,
    selectedCity, setSelectedCity,
    selectedCommunity, setSelectedCommunity,
    activeBoundary, setActiveBoundary
  } = useProjectData();

  const {
    viewState, setViewState, mapStyle, setMapStyle, bounds, updateBounds,
    isDrawing, setIsDrawing, mapRef, drawRef, handleFlyTo, handleToggleDraw
  } = useMapState(filteredProjects);

  // Super Admin Toggles
  const [mapFeatures, setMapFeatures] = useState({ show3D: false, showAnalytics: true });

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string | null>(null);
  const [hoveredLandmarkId, setHoveredLandmarkId] = useState<string | null>(null);

  const selectedProject = filteredProjects.find(p => p.id === selectedProjectId) || null;
  const hoveredProject = filteredProjects.find(p => p.id === hoveredProjectId) || null;
  const selectedLandmark = filteredAmenities.find(l => l.id === selectedLandmarkId) || null;

  const handleFitBounds = (projectsToFit: Project[]) => {
    if (!mapRef.current || !projectsToFit.length) return;
    const lats = projectsToFit.map(p => Number(p.latitude)).filter(n => !isNaN(n) && n !== 0 && n >= -90 && n <= 90);
    const lngs = projectsToFit.map(p => Number(p.longitude)).filter(n => !isNaN(n) && n !== 0 && n >= -180 && n <= 180);
    if (!lats.length || !lngs.length) return;
    const bbox: [number, number, number, number] = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
    mapRef.current.getMap().fitBounds(bbox, { padding: 120, duration: 1200, maxZoom: 15 });
  };

  const handleLocationSelect = async (locationType: 'city' | 'community', locationName: string, projectsInLocation: Project[]) => {
    if (!locationName) {
      setActiveBoundary(null);
      handleFitBounds(liveProjects); // Reset to UAE
      return;
    }

    if (locationType === 'city') {
      // 1. CITIES: Never draw borders, just fit the camera perfectly to the pins.
      setActiveBoundary(null);
      handleFitBounds(projectsInLocation);
    } else if (locationType === 'community') {
      // 2. COMMUNITIES: Try to fetch and draw the border.
      const geojson = await fetchLocationBoundary(locationName);
      if (geojson) {
        // Border found! Draw it and zoom to its exact shape.
        setActiveBoundary(geojson);
        const bbox = turf.bbox(geojson) as [number, number, number, number];
        mapRef.current?.getMap().fitBounds(bbox, { padding: 100, duration: 1500 });
      } else {
        // 3. FALLBACK: No border found in OSM. Don't draw lines, just zoom to the pins.
        setActiveBoundary(null);
        handleFitBounds(projectsInLocation);
      }
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
        handleFlyTo(p.longitude, p.latitude);
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
    if (l.latitude && l.longitude && !isNaN(l.latitude) && !isNaN(l.longitude)) {
      handleFlyTo(l.longitude, l.latitude);
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
    >
      <MapCanvas
        mapRef={mapRef} viewState={viewState} setViewState={setViewState} updateBounds={updateBounds} mapStyle={mapStyle} onClick={handleMapClick}
        drawRef={drawRef} onDrawCreate={e => { setFilterPolygon(e.features[0]); setIsDrawing(false); }} onDrawUpdate={e => setFilterPolygon(e.features[0])} onDrawDelete={() => { setFilterPolygon(null); setIsDrawing(false); }}
        filteredAmenities={filteredAmenities}
        onMarkerClick={handleMarkerClick} onLandmarkClick={handleLandmarkClick}
        selectedProjectId={selectedProjectId} setHoveredProjectId={setHoveredProjectId} setHoveredLandmarkId={setHoveredLandmarkId}
        selectedLandmark={selectedLandmark} selectedProject={selectedProject} hoveredProject={hoveredProject}
        projects={filteredProjects}
        mapFeatures={mapFeatures}
        activeBoundary={activeBoundary}
      />
    </MainLayout>
  );
};
export default App;
