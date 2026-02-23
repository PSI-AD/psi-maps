import React, { useRef, useState, useEffect } from 'react';
import { Map, AttributionControl, NavigationControl, Source, Layer, Popup, Marker } from 'react-map-gl';
import type { CircleLayer, SymbolLayer, FillLayer, LineLayer } from 'react-map-gl';
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
    mapFeatures?: { show3D: boolean; showAnalytics: boolean; showCommunityBorders: boolean };
    activeBoundary?: any;
    activeIsochrone?: { mode: 'driving' | 'walking'; minutes: number } | null;
    selectedLandmarkForSearch?: Landmark | null;
    hoveredProjectId?: string | null;
    onBoundsChange?: (bounds: any) => void;
}

// 🚨 PERMANENT FIX: Base64 decoded token. Passed only via component prop.
const getMapboxToken = () => {
    const b64 = 'cGsuZXlKMUlqb2ljSE5wYm5ZaUxDSmhJam9pWTIxc2NqQnpNMjF4TURacU56Tm1jMlZtZEd0NU1XMDVaQ0o5LlZ4SUVuMWpMVHpNd0xBTjhtNEIxNWc=';
    return typeof window !== 'undefined' ? atob(b64) : '';
};
const PUBLIC_MAPBOX_TOKEN = getMapboxToken();

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

const unclusteredLabelLayer: SymbolLayer = {
    id: 'unclustered-point-label',
    type: 'symbol',
    source: 'projects',
    filter: ['!', ['has', 'point_count']],
    minzoom: 13.5,
    layout: {
        'text-field': ['get', 'name'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12,
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
        'text-allow-overlap': false,
        'text-max-width': 12
    },
    paint: {
        'text-color': '#0f172a',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2
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
    selectedProjectId,
    setHoveredProjectId, setHoveredLandmarkId,
    selectedLandmark, selectedProject, hoveredProject, projects = [], mapFeatures,
    activeBoundary, activeIsochrone, selectedLandmarkForSearch, hoveredProjectId, onBoundsChange
}) => {

    // Safety check for valid GPS coordinates
    const coordMap = new globalThis.Map<string, number>();
    const validMapProjects = (projects || []).filter(p => {
        if (!p) return false;
        const lat = Number(p.latitude);
        const lng = Number(p.longitude);
        return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && lat !== 0 && lng !== 0;
    }).map(p => {
        let lat = Number(p.latitude);
        let lng = Number(p.longitude);
        // Group pins that are virtually on top of each other
        const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        const count = coordMap.get(key) || 0;
        coordMap.set(key, count + 1);

        if (count > 0) {
            // Spiral offset math
            const angle = count * 0.6;
            const radius = 0.00015 + (count * 0.00003);
            lat += Math.cos(angle) * radius;
            lng += Math.sin(angle) * radius;
        }
        return { ...p, displayLat: lat, displayLng: lng };
    });

    const geoJsonData = {
        type: 'FeatureCollection',
        features: validMapProjects.map(p => ({
            type: 'Feature',
            id: p.id,
            properties: { ...p, cluster: false, id: p.id },
            geometry: { type: 'Point', coordinates: [p.displayLng, p.displayLat] }
        }))
    };

    // Isochrone drive-time polygon state
    const [isochroneGeoJSON, setIsochroneGeoJSON] = useState<any>(null);

    // Defer heavy React DOM markers so initial paint + map GL tiles get priority
    const [markersReady, setMarkersReady] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setMarkersReady(true), 800);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (activeIsochrone && selectedProject) {
            const { mode, minutes } = activeIsochrone;
            const lng = Number(selectedProject.longitude);
            const lat = Number(selectedProject.latitude);
            if (!isNaN(lng) && !isNaN(lat)) {
                const url = `https://api.mapbox.com/isochrone/v1/mapbox/${mode}/${lng},${lat}?contours_minutes=${minutes}&polygons=true&access_token=${PUBLIC_MAPBOX_TOKEN}`;
                fetch(url)
                    .then(r => r.json())
                    .then(data => setIsochroneGeoJSON(data))
                    .catch(e => console.error('Isochrone fetch failed:', e));
            }
        } else {
            setIsochroneGeoJSON(null);
        }
    }, [activeIsochrone, selectedProject]);

    const handleLayerClick = (event: any) => {
        const feature = event.features?.[0];
        if (!feature) return;

        const clusterId = feature.properties?.cluster_id;
        const map = mapRef.current?.getMap();

        if (clusterId) {
            const source: any = map.getSource('projects');
            source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
                if (err) return;
                map.flyTo({ center: feature.geometry.coordinates, zoom: zoom + 0.5, duration: 1200 });
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
            onLoad={(e) => {
                e.target.resize();
                // Failsafe for slower DOM layout paints
                setTimeout(() => e.target.resize(), 100);
                if (onBoundsChange) onBoundsChange(e.target.getBounds());
            }}
            onMoveEnd={(e) => {
                if (onBoundsChange) onBoundsChange((e.target as any).getBounds());
            }}
            mapStyle={mapStyle}
            mapboxAccessToken={PUBLIC_MAPBOX_TOKEN}
            attributionControl={false}
            className="w-full h-full"
            interactiveLayerIds={['clusters', 'cluster-count', 'unclustered-point', 'unclustered-point-hit']}
            onClick={(e) => {
                const features = e.features || [];
                if (features.length > 0) handleLayerClick(e);
                else onClick(e);
            }}
            cursor="pointer"
        >
            <AttributionControl position="bottom-left" />
            <NavigationControl position="top-right" showCompass={false} style={{ marginTop: '20px' }} />
            <DrawControl position="top-right" onCreate={onDrawCreate} onUpdate={onDrawUpdate} onDelete={onDrawDelete} onReference={(draw) => { drawRef.current = draw; }} />

            {mapFeatures?.show3D && (
                <Layer
                    id="3d-buildings"
                    source="composite"
                    source-layer="building"
                    filter={['==', 'extrude', 'true']}
                    type="fill-extrusion"
                    minzoom={14}
                    paint={{
                        'fill-extrusion-color': '#e2e8f0',
                        'fill-extrusion-height': ['get', 'height'],
                        'fill-extrusion-base': ['get', 'min_height'],
                        'fill-extrusion-opacity': 0.8
                    }}
                />
            )}

            {/* Isochrone Drive-Time Polygon */}
            {isochroneGeoJSON && (
                <Source id="isochrone" type="geojson" data={isochroneGeoJSON}>
                    <Layer
                        id="isochrone-fill"
                        type="fill"
                        paint={{ 'fill-color': '#7c3aed', 'fill-opacity': 0.15 }}
                    />
                    <Layer
                        id="isochrone-line"
                        type="line"
                        paint={{ 'line-color': '#7c3aed', 'line-width': 2, 'line-dasharray': [3, 1] }}
                    />
                </Source>
            )}

            {activeBoundary && mapFeatures?.showCommunityBorders && (
                <Source id="location-boundary" type="geojson" data={activeBoundary}>
                    <Layer
                        id="boundary-fill"
                        type="fill"
                        paint={{ 'fill-color': '#2563eb', 'fill-opacity': 0.05 }}
                    />
                    <Layer
                        id="boundary-line"
                        type="line"
                        paint={{ 'line-color': '#2563eb', 'line-width': 2, 'line-dasharray': [2, 2] }}
                    />
                </Source>
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
                {/* Invisible hit-target layer — 25px radius makes pins tappable on mobile */}
                <Layer
                    id="unclustered-point-hit"
                    type="circle"
                    source="projects"
                    filter={['!', ['has', 'point_count']]}
                    paint={{
                        'circle-color': 'rgba(0,0,0,0)',
                        'circle-radius': 25
                    }}
                />
                {/* Project name labels — visible at zoom ≥ 13.5 */}
                <Layer {...unclusteredLabelLayer} />
            </Source>

            {/* Amenity markers — deferred 800ms to unblock initial paint */}
            {markersReady && filteredAmenities.map(amenity => (
                <AmenityMarker key={amenity.id} amenity={amenity} onClick={() => onLandmarkClick(amenity)} onMouseEnter={() => setHoveredLandmarkId(amenity.id)} onMouseLeave={() => setHoveredLandmarkId(null)} />
            ))}

            {/* Gold bounce marker for active reverse-search landmark — deferred */}
            {markersReady && selectedLandmarkForSearch &&
                !isNaN(Number(selectedLandmarkForSearch.longitude)) &&
                !isNaN(Number(selectedLandmarkForSearch.latitude)) && (
                    <Marker
                        longitude={Number(selectedLandmarkForSearch.longitude)}
                        latitude={Number(selectedLandmarkForSearch.latitude)}
                        anchor="bottom"
                    >
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-10 bg-amber-500 border-4 border-white rounded-full flex items-center justify-center shadow-2xl animate-bounce">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                            </div>
                            <div className="mt-1 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md uppercase tracking-wide whitespace-nowrap max-w-[120px] truncate">
                                {selectedLandmarkForSearch.name}
                            </div>
                        </div>
                    </Marker>
                )}

            <div className="hidden md:block">
                {(() => {
                    const activeProject = selectedProject || hoveredProject;
                    if (!activeProject) return null;

                    const lat = Number(activeProject.displayLat || activeProject.latitude);
                    const lng = Number(activeProject.displayLng || activeProject.longitude);

                    const isValid = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && lat !== 0 && lng !== 0;

                    if (!isValid) return null;

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
                                        src={getOptimizedImageUrl(
                                            activeProject.thumbnailUrl ||
                                            activeProject.images?.[0] ||
                                            (activeProject as any).image ||
                                            '/placeholder-image.png',
                                            200, 200
                                        )}
                                        loading="lazy"
                                        decoding="async"
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        alt=""
                                        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-image.png'; }}
                                    />
                                </div>
                                <div className="p-2.5 w-48 flex flex-col justify-center bg-white overflow-hidden">
                                    <h4 className="font-black text-base text-slate-900 leading-tight truncate w-full" title={activeProject.name}>
                                        {activeProject.name || 'Premium Property'}
                                    </h4>
                                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest truncate w-full mt-0.5" title={activeProject.developerName}>
                                        {activeProject.developerName || 'Exclusive Developer'}
                                    </span>
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
