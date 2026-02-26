import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Map, AttributionControl, Source, Layer, Popup, Marker } from 'react-map-gl';
import type { CircleLayer, SymbolLayer, FillLayer, LineLayer } from 'react-map-gl';
import useSupercluster from 'use-supercluster';
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
    activeRouteGeometry?: any | null;
    enableHeatmap?: boolean;
    enableSunlight?: boolean;
    isLassoMode?: boolean;
    drawnCoordinates?: [number, number][];
    setDrawnCoordinates?: React.Dispatch<React.SetStateAction<[number, number][]>>;
    clusters?: any[];
    supercluster?: any;
    /** Called when the ⓘ badge on an AmenityMarker is clicked */
    onLandmarkInfo?: (landmark: Landmark) => void;
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
    activeBoundary, activeIsochrone, selectedLandmarkForSearch, hoveredProjectId, onBoundsChange,
    activeRouteGeometry, enableHeatmap = false, enableSunlight = false,
    isLassoMode = false, drawnCoordinates = [], setDrawnCoordinates,
    onLandmarkInfo,
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

    const [bounds, setBounds] = useState<any>(null);

    // Build GeoJSON points from filteredAmenities
    const points = useMemo(() => filteredAmenities
        .filter(a => {
            const lat = Number(a.latitude);
            const lng = Number(a.longitude);
            return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        })
        .map(landmark => ({
            type: 'Feature' as const,
            properties: { cluster: false, landmarkId: landmark.id, amenity: landmark, ...landmark },
            geometry: {
                type: 'Point' as const,
                coordinates: [Number(landmark.longitude), Number(landmark.latitude)],
            },
        })), [filteredAmenities]);

    const { clusters, supercluster } = useSupercluster({
        points,
        bounds,
        zoom: viewState.zoom,
        options: { radius: 100, maxZoom: 14 }
    });


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

    // ── Heatmap GeoJSON: project price density ─────────────────────────────────
    const heatmapGeoJSON = useMemo(() => ({
        type: 'FeatureCollection',
        features: projects
            .filter(p => !isNaN(Number(p.latitude)) && !isNaN(Number(p.longitude)))
            .map(p => ({
                type: 'Feature',
                properties: { price: Number(p.price) || 0 },
                geometry: { type: 'Point', coordinates: [Number(p.longitude), Number(p.latitude)] },
            })),
    }), [projects]);

    // ── Sunlight: toggle golden-hour directional light ─────────────────────────
    useEffect(() => {
        const map = mapRef?.current?.getMap?.();
        if (!map) return;
        if (enableSunlight) {
            map.setLight({ anchor: 'map', color: '#fdb813', position: [1.5, 90, 80], intensity: 0.8 });
        } else {
            map.setLight({ anchor: 'viewport', color: '#ffffff', position: [1.15, 210, 30], intensity: 0.3 });
        }
    }, [enableSunlight, mapRef]);

    // ── Lasso: GeoJSON representation of drawn coordinates ──────────────────────────
    const drawnGeoJSON = useMemo(() => {
        if (drawnCoordinates.length === 0) return null;
        if (drawnCoordinates.length >= 3) {
            const closed = [...drawnCoordinates, drawnCoordinates[0]];
            return {
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: [closed] },
                properties: {},
            };
        }
        return {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: drawnCoordinates },
            properties: {},
        };
    }, [drawnCoordinates]);

    // ── Tour camera: listen for CustomEvent dispatched by the Neighborhood Tour ──
    useEffect(() => {
        const handleTourFly = (e: Event) => {
            const { pLng, pLat, aLng, aLat } = (e as CustomEvent).detail;
            const map = mapRef?.current?.getMap?.();
            if (!map) return;
            const west = Math.min(Number(pLng), Number(aLng));
            const east = Math.max(Number(pLng), Number(aLng));
            const south = Math.min(Number(pLat), Number(aLat));
            const north = Math.max(Number(pLat), Number(aLat));
            map.fitBounds([west, south, east, north], {
                padding: { top: 150, bottom: 150, left: 150, right: 150 },
                maxZoom: 15,
                speed: 0.6,
                curve: 1.8,
                essential: true,
                easing: (t: number) => t * (2 - t),
            });
        };
        window.addEventListener('tour-fly-bounds', handleTourFly);
        return () => window.removeEventListener('tour-fly-bounds', handleTourFly);
    }, [mapRef]);

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
            clickTolerance={15}
            doubleClickZoom={false}
            onMove={evt => {
                setViewState(evt.viewState);
                updateBounds();
                setBounds(evt.target.getBounds().toArray().flat());
            }}
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
                if (isLassoMode) {
                    setDrawnCoordinates?.(prev => [...prev, [e.lngLat.lng, e.lngLat.lat]]);
                    return;
                }
                const features = e.features || [];
                if (features.length > 0) handleLayerClick(e);
                else onClick(e);
            }}
            cursor={isLassoMode ? 'crosshair' : 'pointer'}
            preserveDrawingBuffer={true}
        >
            <AttributionControl position="bottom-left" />
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

            {/* Lasso drawn polygon overlay */}
            {drawnGeoJSON && (
                <Source id="lasso-draw" type="geojson" data={drawnGeoJSON as any}>
                    <Layer
                        id="lasso-fill"
                        type="fill"
                        filter={['==', '$type', 'Polygon']}
                        paint={{ 'fill-color': '#7c3aed', 'fill-opacity': 0.12 }}
                    />
                    <Layer
                        id="lasso-line"
                        type="line"
                        paint={{ 'line-color': '#7c3aed', 'line-width': 2.5, 'line-dasharray': [3, 2] }}
                    />
                    <Layer
                        id="lasso-points"
                        type="circle"
                        paint={{ 'circle-radius': 4, 'circle-color': '#7c3aed', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' }}
                    />
                </Source>
            )}

            {/* Lasso mode instruction badge */}
            {isLassoMode && (
                <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 100, pointerEvents: 'none' }}>
                    <div className="bg-violet-600 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                        <span>✏️</span> Click to draw selection polygon
                    </div>
                </div>
            )}
            {enableHeatmap && (
                <Source id="projects-heatmap" type="geojson" data={heatmapGeoJSON as any}>
                    <Layer
                        id="heatmap-layer"
                        type="heatmap"
                        paint={{
                            'heatmap-weight': ['interpolate', ['linear'], ['get', 'price'], 0, 0, 50000000, 1],
                            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
                            'heatmap-color': [
                                'interpolate', ['linear'], ['heatmap-density'],
                                0, 'rgba(33,102,172,0)',
                                0.2, 'rgb(103,169,207)',
                                0.4, 'rgb(209,229,240)',
                                0.6, 'rgb(253,219,199)',
                                0.8, 'rgb(239,138,98)',
                                1, 'rgb(178,24,43)',
                            ],
                            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 40],
                            'heatmap-opacity': 0.8,
                        } as any}
                    />
                </Source>
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
                {/* Invisible hit-target layer — 35px radius makes pins tappable on mobile */}
                <Layer
                    id="unclustered-point-hit"
                    type="circle"
                    source="projects"
                    filter={['!', ['has', 'point_count']]}
                    paint={{
                        'circle-color': '#000000',
                        'circle-opacity': 0.01,
                        'circle-radius': 35
                    }}
                />
                {/* Project name labels — visible at zoom ≥ 13.5 */}
                <Layer {...unclusteredLabelLayer} />
            </Source>

            {/* Amenity markers — superclustered; deferred 800ms to unblock initial paint */}
            {markersReady && clusters.map(cluster => {
                const [longitude, latitude] = cluster.geometry.coordinates;
                const { cluster: isCluster, point_count: pointCount } = cluster.properties;

                if (isCluster) {
                    return (
                        <Marker key={`cluster-${cluster.id}`} latitude={latitude} longitude={longitude}>
                            <div
                                className="w-10 h-10 bg-slate-900/90 backdrop-blur border-2 border-white rounded-full flex items-center justify-center text-white font-bold shadow-xl cursor-pointer hover:scale-110 transition-transform"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!supercluster) return;
                                    const expansionZoom = Math.min(supercluster.getClusterExpansionZoom(cluster.id as number), 20);
                                    mapRef.current?.flyTo({ center: [longitude, latitude], zoom: expansionZoom, duration: 500 });
                                }}
                                onTouchEnd={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!supercluster) return;
                                    const expansionZoom = Math.min(supercluster.getClusterExpansionZoom(cluster.id as number), 20);
                                    mapRef.current?.flyTo({ center: [longitude, latitude], zoom: expansionZoom, duration: 500 });
                                }}
                            >
                                {pointCount}
                            </div>
                        </Marker>
                    );
                }

                // If it's not a cluster, render the exact existing custom Landmark Marker here:
                const landmark = cluster.properties.amenity;
                return (
                    <AmenityMarker
                        key={`landmark-${landmark.id}`}
                        amenity={landmark}
                        isSelected={selectedLandmarkForSearch?.id === landmark.id}
                        onClick={() => onLandmarkClick(landmark)}
                        onMouseEnter={() => setHoveredLandmarkId(landmark.id)}
                        onMouseLeave={() => setHoveredLandmarkId(null)}
                        onInfo={onLandmarkInfo}
                    />
                );
            })}

            {/* Real traffic route — drawn when user uses the sidebar distance calculator */}
            {activeRouteGeometry && (
                <Source
                    id="real-route"
                    type="geojson"
                    data={{
                        type: 'Feature',
                        properties: {},
                        geometry: activeRouteGeometry,
                    }}
                >
                    {/* Outer glow / casing */}
                    <Layer
                        id="real-route-casing"
                        type="line"
                        paint={{
                            'line-color': '#1d4ed8',
                            'line-width': 8,
                            'line-opacity': 0.25,
                        }}
                        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                    />
                    {/* Core route line */}
                    <Layer
                        id="real-route-layer"
                        type="line"
                        paint={{
                            'line-color': '#3b82f6',
                            'line-width': 4,
                            'line-opacity': 0.9,
                        }}
                        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                    />
                </Source>
            )}

            {/* Dashed amber line from selected landmark to highlighted project */}
            {selectedLandmarkForSearch && selectedProject &&
                !isNaN(Number(selectedLandmarkForSearch.longitude)) &&
                !isNaN(Number(selectedLandmarkForSearch.latitude)) &&
                !isNaN(Number(selectedProject.longitude)) &&
                !isNaN(Number(selectedProject.latitude)) && (
                    <Source
                        id="distance-line"
                        type="geojson"
                        data={{
                            type: 'Feature',
                            properties: {},
                            geometry: {
                                type: 'LineString',
                                coordinates: [
                                    [Number(selectedLandmarkForSearch.longitude), Number(selectedLandmarkForSearch.latitude)],
                                    [Number(selectedProject.longitude), Number(selectedProject.latitude)]
                                ]
                            }
                        }}
                    >
                        <Layer
                            id="distance-line-layer"
                            type="line"
                            paint={{
                                'line-color': '#f59e0b',
                                'line-width': 3,
                                'line-dasharray': [2, 2],
                                'line-opacity': 0.8
                            }}
                        />
                    </Source>
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
