import React, { useRef } from 'react';
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
    // Deprecated props (kept for interface compatibility if needed, but unused here)
    clusters?: any[];
    supercluster?: any;
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoicHNpbnYiLCJhIjoiY21scjBzM21xMDZqNzNmc2VmdGt5MW05ZCJ9.VxIEn1jLTzMwLAN8m4B15g';

// Cluster Layer Styles
const clusterLayer: CircleLayer = {
    id: 'clusters',
    type: 'circle',
    source: 'projects',
    filter: ['has', 'point_count'],
    paint: {
        'circle-color': ['step', ['get', 'point_count'], '#f59e0b', 10, '#d97706', 50, '#b45309'],
        'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 50, 40],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
        'circle-opacity': 0.9
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
        'circle-stroke-color': '#f59e0b' // Amber 500
    }
};

const MapCanvas: React.FC<MapCanvasProps> = ({
    mapRef, viewState, setViewState, updateBounds, mapStyle, onClick,
    drawRef, onDrawCreate, onDrawUpdate, onDrawDelete,
    filteredAmenities, onMarkerClick, onLandmarkClick, selectedProjectId,
    setHoveredProjectId, setHoveredLandmarkId,
    selectedLandmark, selectedProject, hoveredProject, projects = []
}) => {

    const geoJsonData = {
        type: 'FeatureCollection',
        features: projects.map(p => ({
            type: 'Feature',
            properties: { ...p, cluster: false },
            geometry: {
                type: 'Point',
                coordinates: [p.longitude, p.latitude]
            }
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
                map.easeTo({
                    center: feature.geometry.coordinates,
                    zoom: zoom,
                    duration: 800
                });
            });
        } else {
            // Unclustered point click
            onMarkerClick(feature.properties.id);
        }
    };

    const handleImageError = (e: any) => {
        e.currentTarget.src = 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80';
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
                if (features.length > 0) {
                    handleLayerClick(e);
                } else {
                    onClick(e);
                }
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

            <Source
                id="projects"
                type="geojson"
                data={geoJsonData as any}
                cluster={true}
                clusterMaxZoom={14}
                clusterRadius={50}
            >
                <Layer {...clusterLayer} />
                <Layer {...clusterCountLayer} />
                <Layer {...unclusteredPointLayer} />
            </Source>

            {/* Amenity Markers */}
            {filteredAmenities.map(amenity => (
                <AmenityMarker key={amenity.id} amenity={amenity} onClick={() => onLandmarkClick(amenity)} onMouseEnter={() => setHoveredLandmarkId(amenity.id)} onMouseLeave={() => setHoveredLandmarkId(null)} />
            ))}

            {/* Popups */}
            {selectedLandmark && (
                <Popup longitude={selectedLandmark.longitude} latitude={selectedLandmark.latitude} anchor="bottom" offset={25} closeButton={false} closeOnClick={false} className="z-[2500]">
                    <div className="p-3 bg-white min-w-[180px] shadow-sm">
                        <h4 className="text-sm font-black text-slate-800 mb-1">{selectedLandmark.name}</h4>
                        <div className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border bg-slate-50 text-slate-600 border-slate-100">{selectedLandmark.category}</div>
                    </div>
                </Popup>
            )}

            <div className="hidden md:block">
                {(selectedProject || hoveredProject) && (
                    <Popup longitude={(selectedProject || hoveredProject)!.longitude} latitude={(selectedProject || hoveredProject)!.latitude} closeButton={false} closeOnClick={false} anchor="top" className="z-[200]" maxWidth="300px" offset={15}>
                        <div className="flex w-64 bg-white rounded-lg overflow-hidden shadow-2xl border border-slate-100">
                            <div className="w-[70px] h-[70px] shrink-0 bg-slate-100"><img src={(selectedProject || hoveredProject)!.thumbnailUrl} className="w-full h-full object-cover" onError={handleImageError} alt="" /></div>
                            <div className="p-3 flex-1 flex flex-col justify-center min-w-0">
                                <h4 className="font-bold text-sm text-slate-800 truncate">{(selectedProject || hoveredProject)!.name}</h4>
                                <p className="text-[10px] text-slate-500 font-medium truncate">{(selectedProject || hoveredProject)!.developerName}</p>
                                <div className="flex items-center gap-1.5 mt-1"><span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">{(selectedProject || hoveredProject)!.type}</span><span className="text-[10px] font-bold text-slate-900">{(selectedProject || hoveredProject)!.priceRange?.split('-')[0].trim()}</span></div>
                            </div>
                        </div>
                    </Popup>
                )}
            </div>
        </Map>
    );
};

export default MapCanvas;
