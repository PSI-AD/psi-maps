
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Map, { MapRef, AttributionControl, NavigationControl, Popup, Marker } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import useSupercluster from 'use-supercluster';
import * as turf from '@turf/turf';
import MapboxDraw from '@mapbox/mapbox-gl-draw';

import TopNavBar from './components/TopNavBar';
import ProjectSidebar from './components/ProjectSidebar';
import ProjectListSidebar from './components/ProjectListSidebar';
import MapMarker from './components/MapMarker';
import AmenityMarker from './components/AmenityMarker';
import MapStyleSwitcher from './components/MapStyleSwitcher';
import AmenityFilterBar from './components/AmenityFilterBar';
import ProjectBottomCard from './components/ProjectBottomCard';
import DrawControl from './components/DrawControl';
import AdminDashboard from './components/AdminDashboard';

import { fetchLiveProperties } from './utils/apiClient';
import { fetchNearbyAmenities } from './utils/placesClient';
import { Project, Landmark } from './types';
import { amenitiesData } from './data/seedData';

const MAPBOX_PUBLIC_TOKEN = 'pk.eyJ1IjoicHNpbnYiLCJhIjoiY21scjBzM21xMDZqNzNmc2VmdGt5MW05ZCJ9.VxIEn1jLTzMwLAN8m4B15g';

if (typeof window !== 'undefined') {
  mapboxgl.accessToken = MAPBOX_PUBLIC_TOKEN;
}

const App: React.FC = () => {
  const mapRef = useRef<MapRef>(null);
  const drawRef = useRef<MapboxDraw | null>(null);

  const [viewState, setViewState] = useState({
    longitude: 54.436, 
    latitude: 24.543,
    zoom: 13,
    pitch: 0,
    bearing: 0
  });

  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v12');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  
  // Dynamic Live State
  const [liveProjects, setLiveProjects] = useState<Project[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string | null>(null);
  const [hoveredLandmarkId, setHoveredLandmarkId] = useState<string | null>(null);
  const [activeAmenities, setActiveAmenities] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
  const [filterPolygon, setFilterPolygon] = useState<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Load initial approved projects
  const loadInitialData = useCallback(async () => {
    setIsRefreshing(true);
    const data = await fetchLiveProperties();
    setLiveProjects(data);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const updateBounds = useCallback(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      const b = map.getBounds();
      setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    }
  }, []);

  useEffect(() => {
    updateBounds();
  }, [updateBounds]);

  // Spatial Filtering Logic - uses liveProjects state
  const filteredProjects = useMemo(() => {
    if (!filterPolygon) return liveProjects;
    
    const points = turf.featureCollection(
      liveProjects.map(p => turf.point([p.longitude, p.latitude], { ...p }))
    );
    
    const within = turf.pointsWithinPolygon(points, filterPolygon);
    return within.features.map(f => f.properties as Project);
  }, [liveProjects, filterPolygon]);

  const points = useMemo(() => 
    filteredProjects.map(project => ({
      type: "Feature",
      properties: { cluster: false, projectId: project.id, category: project.type },
      geometry: {
        type: "Point",
        coordinates: [project.longitude, project.latitude]
      }
    })) as any
  , [filteredProjects]);

  const { clusters, supercluster } = useSupercluster({
    points,
    bounds: bounds || undefined,
    zoom: viewState.zoom,
    options: { radius: 75, maxZoom: 20 }
  });

  const selectedProject = useMemo(() => 
    filteredProjects.find(p => p.id === selectedProjectId) || null
  , [selectedProjectId, filteredProjects]);

  const hoveredProject = useMemo(() => 
    filteredProjects.find(p => p.id === hoveredProjectId) || null
  , [hoveredProjectId, filteredProjects]);

  const selectedLandmark = useMemo(() => 
    amenitiesData.find(l => l.id === selectedLandmarkId) || null
  , [selectedLandmarkId]);

  const filteredAmenities = useMemo(() => {
    if (activeAmenities.length === 0) return [];
    return amenitiesData.filter(amenity => activeAmenities.includes(amenity.category));
  }, [activeAmenities]);

  const handleMapClick = (e: any) => {
    const map = mapRef.current?.getMap();
    const canvas = map?.getCanvas();
    if (canvas && e.originalEvent && e.originalEvent.target === canvas) {
      setSelectedProjectId(null);
      setSelectedLandmarkId(null);
      setIsAnalysisOpen(false);
    }
  };

  const handleFlyTo = useCallback((longitude: number, latitude: number) => {
    mapRef.current?.flyTo({
      center: [longitude, latitude],
      zoom: 14.5, 
      duration: 1000, 
      essential: true
    });
  }, []);

  const handleMarkerClick = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedLandmarkId(null); 
    const project = filteredProjects.find(p => p.id === projectId);
    if (project) {
      handleFlyTo(project.longitude, project.latitude);
    }
  };

  const handleLandmarkClick = (landmark: Landmark) => {
    setSelectedLandmarkId(landmark.id);
    setSelectedProjectId(null); 
    handleFlyTo(landmark.longitude, landmark.latitude);
  };

  const handleToggleAmenity = (category: string) => {
    setActiveAmenities(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  const handleToggleDraw = () => {
    if (!drawRef.current) return;
    if (!isDrawing) {
      drawRef.current.changeMode('draw_polygon');
      setIsDrawing(true);
    } else {
      drawRef.current.changeMode('simple_select');
      setIsDrawing(false);
    }
  };

  const onDrawCreate = useCallback((e: any) => {
    setFilterPolygon(e.features[0]);
    setIsDrawing(false);
  }, []);

  const onDrawUpdate = useCallback((e: any) => {
    setFilterPolygon(e.features[0]);
  }, []);

  const onDrawDelete = useCallback(() => {
    setFilterPolygon(null);
    setIsDrawing(false);
  }, []);

  const handleDiscoverNeighborhood = useCallback(async (lat: number, lng: number) => {
    await fetchNearbyAmenities(lat, lng);
  }, []);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80';
  };

  const getLandmarkBadgeStyle = (category: string) => {
    switch(category) {
      case 'school': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'hotel': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'culture': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'leisure': return 'bg-teal-50 text-teal-600 border-teal-100';
      case 'retail': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white font-sans">
      <TopNavBar onAdminClick={() => setIsAdminOpen(true)} />

      {isAdminOpen && (
        <AdminDashboard 
          onClose={() => setIsAdminOpen(false)} 
          liveProjects={liveProjects}
          setLiveProjects={setLiveProjects}
        />
      )}

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden mt-20 relative">
        
        {/* Project Listings Sidebar */}
        <div className={`
          ${viewMode === 'list' ? 'flex' : 'hidden md:flex'}
          w-full md:w-[400px] h-full overflow-y-auto bg-slate-50 z-10 md:z-0 border-r border-slate-200 flex-col relative custom-scrollbar
        `}>
          {selectedProject ? (
            <ProjectListSidebar 
              project={selectedProject} 
              onClose={() => setSelectedProjectId(null)}
              onOpenAnalysis={() => setIsAnalysisOpen(true)}
              isInline={true}
            />
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-slate-200 bg-white sticky top-0 z-20">
                <div className="flex justify-between items-end mb-1">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Saadiyat Island</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {filterPolygon ? `${filteredProjects.length} Filtered Listings` : `${filteredProjects.length} Luxury Listings`}
                    </p>
                  </div>
                  <button 
                    onClick={loadInitialData}
                    disabled={isRefreshing}
                    className={`p-2 rounded-xl border border-slate-100 transition-all ${isRefreshing ? 'bg-blue-50 text-blue-600' : 'bg-white hover:bg-slate-50 text-slate-400'}`}
                  >
                    <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 p-5 flex flex-col">
                {filteredProjects.map((project) => (
                  <div 
                    key={project.id}
                    onClick={() => {
                      handleMarkerClick(project.id);
                      setViewMode('map');
                    }}
                    className="flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-5 transition-shadow hover:shadow-md cursor-pointer group"
                  >
                    <div className="w-full h-56 relative bg-slate-200">
                      <img 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        src={project.thumbnailUrl} 
                        alt={project.name} 
                        onError={handleImageError} 
                      />
                    </div>
                    <div className="p-4 flex flex-col gap-1">
                      <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">
                        {project.type}
                      </span>
                      <p className="text-xl font-extrabold text-slate-800 mt-1">
                        {project.priceRange?.split('-')[0].trim() || 'Enquire'}
                      </p>
                      <h3 className="text-lg font-bold text-slate-700 leading-tight">
                        {project.name}
                      </h3>
                      <p className="text-sm text-slate-500 mb-3">
                        {project.developerName}
                      </p>
                      <button className="bg-blue-700 hover:bg-blue-800 text-white w-full py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-[0.15em] transition-all shadow-lg shadow-blue-50 active:scale-[0.98]">
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Map Panel */}
        <div className={`
          ${viewMode === 'map' ? 'flex' : 'hidden md:flex'}
          flex-1 w-full h-full relative bg-slate-100
        `}>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[2000] pointer-events-none">
            <div className="pointer-events-auto">
              <AmenityFilterBar 
                activeFilters={activeAmenities} 
                onToggle={handleToggleAmenity}
                isDrawActive={isDrawing}
                onToggleDraw={handleToggleDraw}
              />
            </div>
          </div>

          <Map
            {...viewState}
            ref={mapRef}
            onMove={evt => {
              setViewState(evt.viewState);
              updateBounds();
            }}
            mapStyle={mapStyle}
            mapboxAccessToken={MAPBOX_PUBLIC_TOKEN}
            onClick={handleMapClick}
            attributionControl={false}
            className="w-full h-full"
          >
            <AttributionControl position="bottom-left" />
            <NavigationControl position="bottom-right" className="md:block hidden" />

            <DrawControl 
              position="top-right"
              onCreate={onDrawCreate}
              onUpdate={onDrawUpdate}
              onDelete={onDrawDelete}
              onReference={(draw) => { drawRef.current = draw; }}
            />

            {/* Amenities (Non-clustered) */}
            {filteredAmenities.map((amenity) => (
              <AmenityMarker 
                key={amenity.id} 
                amenity={amenity} 
                onClick={() => handleLandmarkClick(amenity)}
                onMouseEnter={() => setHoveredLandmarkId(amenity.id)}
                onMouseLeave={() => setHoveredLandmarkId(null)}
              />
            ))}

            {/* Project Clusters & Leaf Markers */}
            {clusters.map((cluster) => {
              const [longitude, latitude] = cluster.geometry.coordinates;
              const { cluster: isCluster, point_count: pointCount, projectId } = cluster.properties;

              if (isCluster) {
                return (
                  <Marker
                    key={`cluster-${cluster.id}`}
                    longitude={longitude}
                    latitude={latitude}
                  >
                    <div
                      onClick={() => {
                        const expansionZoom = Math.min(
                          supercluster?.getClusterExpansionZoom(cluster.id) || viewState.zoom + 2,
                          20
                        );
                        mapRef.current?.flyTo({
                          center: [longitude, latitude],
                          zoom: expansionZoom,
                          duration: 800
                        });
                      }}
                      className="w-10 h-10 rounded-full bg-blue-600 text-white border-2 border-white shadow-lg flex items-center justify-center font-black cursor-pointer transition-transform hover:scale-110 active:scale-95"
                    >
                      {pointCount}
                    </div>
                  </Marker>
                );
              }

              const project = filteredProjects.find(p => p.id === projectId);
              if (!project) return null;

              return (
                <MapMarker
                  key={project.id}
                  project={project}
                  selected={selectedProjectId === project.id}
                  isDimmed={selectedProjectId !== null && selectedProjectId !== project.id}
                  onClick={() => handleMarkerClick(project.id)}
                  onMouseEnter={() => setHoveredProjectId(project.id)}
                  onMouseLeave={() => setHoveredProjectId(null)}
                />
              );
            })}

            {/* Landmark Popup */}
            {selectedLandmark && (
              <Popup
                longitude={selectedLandmark.longitude}
                latitude={selectedLandmark.latitude}
                anchor="bottom"
                offset={25}
                closeButton={false}
                closeOnClick={false}
                className="z-[2500]"
              >
                <div className="p-3 bg-white min-w-[180px] shadow-sm">
                  <h4 className="text-sm font-black text-slate-800 leading-tight mb-1">
                    {selectedLandmark.name}
                  </h4>
                  <div className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${getLandmarkBadgeStyle(selectedLandmark.category)}`}>
                    {selectedLandmark.category === 'culture' ? 'Cultural Heritage' :
                     selectedLandmark.category === 'hotel' ? 'Luxury Resort' :
                     selectedLandmark.category === 'school' ? 'Educational Hub' :
                     selectedLandmark.category === 'leisure' ? 'Leisure & Lifestyle' :
                     'High-end Retail'}
                  </div>
                </div>
              </Popup>
            )}

            {/* Desktop Popups */}
            <div className="hidden md:block">
              {(selectedProject || hoveredProject) && (
                <Popup
                  longitude={(selectedProject || hoveredProject)!.longitude}
                  latitude={(selectedProject || hoveredProject)!.latitude}
                  closeButton={false}
                  closeOnClick={false}
                  anchor="top"
                  className="z-[200]"
                  maxWidth="300px"
                >
                  <div className="flex w-64 bg-white rounded-lg overflow-hidden shadow-2xl border border-slate-100">
                    <div className="w-[70px] h-[70px] shrink-0 bg-slate-100">
                      <img src={(selectedProject || hoveredProject)!.thumbnailUrl} className="w-full h-full object-cover" onError={handleImageError} alt=""/>
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-center min-w-0">
                      <h4 className="font-bold text-sm text-slate-800 truncate">{(selectedProject || hoveredProject)!.name}</h4>
                      <p className="text-[10px] text-slate-500 font-medium truncate">{(selectedProject || hoveredProject)!.developerName}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">{(selectedProject || hoveredProject)!.type}</span>
                        <span className="text-[10px] font-bold text-slate-900">{(selectedProject || hoveredProject)!.priceRange?.split('-')[0].trim()}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              )}
            </div>
          </Map>

          {/* Mobile Project Bottom Sheet */}
          <div className="md:hidden">
            <ProjectBottomCard 
              project={selectedProject}
              onClose={() => setSelectedProjectId(null)}
              onViewDetails={() => setIsAnalysisOpen(true)}
            />
          </div>

          <div className="absolute bottom-20 md:bottom-6 left-6 z-[2000]">
            <MapStyleSwitcher currentStyle={mapStyle} onStyleChange={setMapStyle} />
          </div>
        </div>

        {/* View Toggle Button (Mobile Only) */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[6000] md:hidden">
          <button 
            onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
            className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest border border-blue-500 transition-all active:scale-95"
          >
            {viewMode === 'map' ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Show List
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-5.447-2.724A2 2 0 013 15.487V6.513a2 2 0 011.553-1.943L9 2l5.447 2.724A2 2 0 0116 6.513v8.974a2 2 0 01-1.553 1.943L9 20z" />
                </svg>
                Show Map
              </>
            )}
          </button>
        </div>
      </div>

      <ProjectSidebar 
        project={isAnalysisOpen ? selectedProject : null}
        onClose={() => setIsAnalysisOpen(false)}
        onDiscoverNeighborhood={handleDiscoverNeighborhood}
      />
    </div>
  );
};

export default App;
