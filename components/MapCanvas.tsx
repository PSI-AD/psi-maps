import React, { useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import Map, { AttributionControl, NavigationControl, Source, Layer, Popup } from 'react-map-gl';
import type { CircleLayer, SymbolLayer } from 'react-map-gl';
import { Project, Landmark } from '../types';
import DrawControl from './DrawControl';
import AmenityMarker from './AmenityMarker';
import { getOptimizedImageUrl } from '../utils/imageHelpers';

interface MapCanvasProps {
    mapRef: any;
    viewState: any;
    setViewState: (vs: any) => void;
    updateBounds: () => void;
    mapStyle: string;
    onClick: (e: any) => void;
    drawRef: any;
    onDrawCreate: (e: any) => void;
    onDrawUpdate: (e: any) => void;
    onDrawDelete: () => void;
    filteredAmenities: Landmark[];
    onMarkerClick: (id: string) => void;
    onLandmarkClick: (l: Landmark) => void;
    selectedProjectId: string | null;
    setHoveredProjectId: (id: string | null) => void;
    setHoveredLandmarkId: (id: string | null) => void;
    selectedLandmark: Landmark | null;
    selectedProject: Project | null;
    hoveredProject: Project | null;
    projects?: Project[];
    mapFeatures?: { show3D: boolean; showAnalytics: boolean };
}

// 🚨 PERMANENT FIX: Hardcoded Token. No environment variables allowed.
const MAPBOX_TOKEN = 'pk.eyJ1IjoicHNpbnYiLCJhIjoiY21scjBzM21xMDZqNzNmc2VmdGt5MW05ZCJ9.VxIEn1jLTzMwLAN8m4B15g';
(mapboxgl as any).accessToken = MAPBOX_TOKEN;

const clusterLayer: CircleLayer = {
    id: 'clusters',
    type: 'circle',
    source: 'projects',
    filter: ['has', 'point_count'],
    paint: {
        'circle-color': ['step', ['get', 'point_count'], '#2563eb', 10, '#1d4ed8', 50, '#1e3a8a'],
        'circle-radius': ['step', ['get', 'point_count'], 20, 10, 25, 50, 35],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.95
    }
};

const clusterCountLayer: SymbolLayer = {
    id: 'cluster-count',
    type: 'symbol',
    source: 'projects',
    filter: ['has', 'point_count'],
    layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 14,
        'text-allow-overlap': true
    },
    paint: {
        'text-color': '#ffffff'
    }
};

const unclusteredPointLayer: CircleLayer = {
    id: 'unclustered-point',
    type: 'circle',
    source: 'projects',
    filter: ['!', ['has', 'point_count']],
    paint: {
        'circle-color': '#0f172a',
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#2563eb'
    }
};

const MapCanvas: React.FC<MapCanvasProps> = ({
    mapRef, viewState, setViewState, updateBounds, mapStyle, onClick,
    drawRef, onDrawCreate, onDrawUpdate, onDrawDelete,
    filteredAmenities, onMarkerClick, onLandmarkClick,
    selectedProjectId, // Fix missing destructuring
    setHoveredProjectId, setHoveredLandmarkId,
    selectedLandmark, selectedProject, hoveredProject, projects = [], mapFeatures
}) => {

    // Safety check for valid GPS coordinates
    const validMapProjects = (projects || []).filter(p => {
        if (!p) return false;
        const lat = Number(p.latitude);
        const lng = Number(p.longitude);
        return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && lat !== 0 && lng !== 0;
    });

    const geoJsonData = {
        type: 'FeatureCollection',
        features: validMapProjects.map(p => ({
            type: 'Feature',
            id: p.id,
            properties: { ...p, cluster: false, id: p.id },
            geometry: { type: 'Point', coordinates: [Number(p.longitude), Number(p.latitude)] }
        }))
    };

    const handleLayerClick = (event: any) => {
        const feature = event.features?.[0];
        if (!feature) return;

        const clusterId = feature.properties?.cluster_id;
        const map = mapRef.current?.getMap();

        if (clusterId) {
            const source: any = map.getSource('projects');
            source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
                if (err) return;
                map.easeTo({ center: feature.geometry.coordinates, zoom: zoom, duration: 800 });
            });
        } else {
            onMarkerClick(feature.properties.id);
        }
    };

    return (
        <Map
            {...viewState}
            ref={mapRef}
            onMove={evt => { setViewState(evt.viewState); updateBounds(); }}
            mapStyle={mapStyle}
            mapboxAccessToken={MAPBOX_TOKEN}
            attributionControl={false}
            className="w-full h-full"
            interactiveLayerIds={['clusters', 'unclustered-point']}
            onClick={(e) => {
                const features = e.features || [];
                if (features.length > 0) handleLayerClick(e);
                else onClick(e);
            }}
            cursor={hoveredProject ? 'pointer' : 'auto'}
            onMouseEnter={(e) => {
                if (e.features?.[0]?.layer.id === 'unclustered-point') {
                    setHoveredProjectId(e.features[0].properties?.id);
                }
            }}
            onMouseLeave={() => setHoveredProjectId(null)}
        >
            <AttributionControl position="bottom-left" />
            <NavigationControl position="bottom-right" />
            <DrawControl position="top-right" onCreate={onDrawCreate} onUpdate={onDrawUpdate} onDelete={onDrawDelete} onReference={(draw) => { drawRef.current = draw; }} />

            {mapFeatures?.show3D && (
                <Layer
                    id="3d-buildings"
                    source="composite"
                    source-layer="building"
                    filter={['==', 'extrude', 'true']}
                    type="fill-extrusion"
                    minzoom={15}
                    paint={{
                        'fill-extrusion-color': '#e2e8f0',
                        'fill-extrusion-height': ['get', 'height'],
                        'fill-extrusion-base': ['get', 'min_height'],
                        'fill-extrusion-opacity': 0.8
                    }}
                />
            )}

            <Source id="projects" type="geojson" data={geoJsonData as any} cluster={true} clusterMaxZoom={14} clusterRadius={45}>
                <Layer {...clusterLayer} />
                <Layer {...clusterCountLayer} />
                <Layer
                    id="selected-point"
                    type="circle"
                    source="projects"
                    filter={['==', ['get', 'id'], selectedProjectId || '']}
                    paint={{
                        'circle-color': '#d4af37', // Gold/Amber
                        'circle-radius': 14,
                        'circle-stroke-width': 3,
                        'circle-stroke-color': '#ffffff',
                        'circle-color-transition': { duration: 300 }
                    }}
                />
                <Layer
                    id="unclustered-point"
                    type="circle"
                    source="projects"
                    filter={['!', ['has', 'point_count']]}
                    paint={{
                        'circle-color': '#2563eb', // Royal Blue
                        'circle-radius': 8,
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#ffffff'
                    }}
                />
            </Source>

            {filteredAmenities.map(amenity => (
                <AmenityMarker key={amenity.id} amenity={amenity} onClick={() => onLandmarkClick(amenity)} onMouseEnter={() => setHoveredLandmarkId(amenity.id)} onMouseLeave={() => setHoveredLandmarkId(null)} />
            ))}

            <div className="hidden md:block">
                {(() => {
                    const activeProject = selectedProject || hoveredProject;
                    if (!activeProject) return null;

                    const lat = Number(activeProject.latitude);
                    const lng = Number(activeProject.longitude);

                    const isValid = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && lat !== 0 && lng !== 0;

                    if (!isValid) return null;

                    const hasValidPrice = activeProject.priceRange &&
                        activeProject.priceRange !== '0' &&
                        activeProject.priceRange !== '0.00' &&
                        !activeProject.priceRange.startsWith('AED 0');

                    return (
                        <Popup
                            longitude={lng}
                            latitude={lat}
                            closeButton={false}
                            closeOnClick={false}
                            anchor="bottom"
                            className="z-[200]"
                            maxWidth="320px"
                            offset={20}
                        >
                            <div className="flex w-[300px] h-[110px] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-100 p-0 m-[-10px] group">
                                <div className="w-[100px] h-full shrink-0 bg-slate-100 relative overflow-hidden">
                                    <img
                                        src={getOptimizedImageUrl(activeProject.thumbnailUrl, 200, 200)}
                                        loading="lazy"
                                        decoding="async"
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        alt=""
                                    />
                                </div>
                                <div className="p-4 flex-1 flex flex-col justify-center min-w-0 bg-white">
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.15em] mb-1.5 truncate">
                                        {activeProject.developerName || 'Unknown Developer'}
                                    </span>
                                    <h4 className="font-black text-[15px] text-slate-900 leading-tight line-clamp-2 mb-2">
                                        {activeProject.name || 'Premium Property'}
                                    </h4>
                                    <div className="mt-auto">
                                        {hasValidPrice && (
                                            <span className="text-[11px] font-bold text-slate-800 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 inline-block">
                                                {activeProject.priceRange?.split('-')[0].trim()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    );
                })()}
            </div>
        </Map>
    );
};

export default MapCanvas;
