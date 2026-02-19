import React, { useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import Map, { AttributionControl, NavigationControl, Source, Layer, Popup } from 'react-map-gl';
import type { CircleLayer, SymbolLayer } from 'react-map-gl';
import { Project, Landmark } from '../types';
import DrawControl from './DrawControl';
import AmenityMarker from './AmenityMarker';

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

// FIX: Bulletproof Mapbox Token Initialization
// Using import.meta.env to satisfy secret scanning while keeping the fallback logic
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
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
        'circle-color': '#0f172a', // Slate 900
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#2563eb' // Blue 600
    }
};

const MapCanvas: React.FC<MapCanvasProps> = ({
    mapRef, viewState, setViewState, updateBounds, mapStyle, onClick,
    drawRef, onDrawCreate, onDrawUpdate, onDrawDelete,
    filteredAmenities, onMarkerClick, onLandmarkClick,
    setHoveredProjectId, setHoveredLandmarkId,
    selectedLandmark, selectedProject, hoveredProject, projects = [], mapFeatures
}) => {
    // FIX: Bulletproof coordinate parsing to prevent white screen crashes
    const validMapProjects = (projects || []).filter(p => {
        if (!p) return false;
        const lat = Number(p.latitude);
        const lng = Number(p.longitude);
        // Ensure coordinates are real numbers and fall within Earth's bounds!
        return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && lat !== 0 && lng !== 0;
    });

    const geoJsonData = {
        type: 'FeatureCollection',
        features: validMapProjects.map(p => ({
            type: 'Feature',
            properties: { ...p, cluster: false },
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

            {/* 3D Buildings Layer (Toggled via Admin Settings) */}
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
                <Layer {...unclusteredPointLayer} />
            </Source>

            {filteredAmenities.map(amenity => (
                <AmenityMarker key={amenity.id} amenity={amenity} onClick={() => onLandmarkClick(amenity)} onMouseEnter={() => setHoveredLandmarkId(amenity.id)} onMouseLeave={() => setHoveredLandmarkId(null)} />
            ))}

            <div className="hidden md:block">
                {(selectedProject || hoveredProject) && (
                    <Popup
                        longitude={Number((selectedProject || hoveredProject)!.longitude)}
                        latitude={Number((selectedProject || hoveredProject)!.latitude)}
                        closeButton={false}
                        closeOnClick={false}
                        anchor="bottom"
                        offset={25}
                        className="z-[200]"
                        maxWidth="320px"
                    >
                        <div className="flex w-[280px] bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-100 p-0 m-0">
                            <div className="w-[100px] h-[100px] shrink-0 bg-slate-100 relative">
                                <img
                                    src={(selectedProject || hoveredProject)!.thumbnailUrl}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    alt=""
                                    onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80'; }}
                                />
                            </div>
                            <div className="p-3 flex-1 flex flex-col justify-center min-w-0 bg-white h-[100px]">
                                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1 truncate block">
                                    {(selectedProject || hoveredProject)!.developerName || 'Developer'}
                                </span>
                                <h4 className="font-black text-sm text-slate-900 leading-tight line-clamp-2 mb-2">
                                    {(selectedProject || hoveredProject)!.name}
                                </h4>
                                <div className="mt-auto">
                                    <span className="text-[10px] font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100 inline-block">
                                        {(selectedProject || hoveredProject)!.priceRange?.split('-')[0].trim() || 'Enquire'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Popup>
                )}
            </div>
        </Map>
    );
};

export default MapCanvas;
