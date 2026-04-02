import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { MapRef } from 'react-map-gl';
import MapboxDrawImport from '@mapbox/mapbox-gl-draw';
import useSupercluster from 'use-supercluster';
import { Project } from '../types';
import { loadAppState, saveAppState } from '../utils/performanceEngine';
import { cacheMapState } from '../utils/smartCache';
import { saveMapRegion } from '../utils/localPersistence';


export const useMapState = (filteredProjects: Project[], cameraDuration: number = 2000) => {
    const mapRef = useRef<MapRef>(null);
    const drawRef = useRef<any>(null);

    // Restore camera from persisted state for instant familiarity
    const savedState = loadAppState();
    const [viewState, setViewState] = useState(savedState?.viewState || {
        longitude: 54.8,
        latitude: 24.84,
        zoom: 7.5,
        pitch: 0,
        bearing: 0
    });

    const [mapStyle, setMapStyle] = useState(savedState?.mapStyle || 'mapbox://styles/mapbox/streets-v12');
    const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const updateBounds = useCallback(() => {
        if (mapRef.current) {
            const map = mapRef.current.getMap();
            const b = map.getBounds();
            setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
        }
    }, []);

    // Update bounds initially and on movement
    useEffect(() => {
        updateBounds();
    }, [updateBounds]);

    // Debounced camera state persistence (save after 1s of no movement)
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            saveAppState({ viewState, mapStyle });
            // Also persist dedicated map region key for offline restore
            saveMapRegion(viewState);
            // Persist to IndexedDB for durable offline recovery
            cacheMapState({ ...viewState, mapStyle }).catch(() => { });
        }, 1000);
        return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    }, [viewState, mapStyle]);

    const points = useMemo(() =>
        filteredProjects
            .filter(p => !isNaN(Number(p.latitude)) && !isNaN(Number(p.longitude)) && Number(p.latitude) !== 0)
            .map(project => ({
                type: "Feature",
                properties: { cluster: false, projectId: project.id, category: project.type },
                geometry: {
                    type: "Point",
                    coordinates: [Number(project.longitude), Number(project.latitude)]
                }
            })) as any
        , [filteredProjects]);

    const { clusters, supercluster } = useSupercluster({
        points,
        bounds: bounds || undefined,
        zoom: viewState.zoom,
        options: { radius: 75, maxZoom: 20 }
    });

    const handleFlyTo = useCallback((longitude: number, latitude: number, zoom?: number) => {
        mapRef.current?.flyTo({
            center: [longitude, latitude],
            zoom: zoom ?? 16,
            pitch: 60,
            bearing: 20,
            duration: cameraDuration,
            essential: true
        });
    }, [cameraDuration]);

    /** Cinematic single-point flyTo with dramatic angle */
    const handleCinematicFlyTo = useCallback((longitude: number, latitude: number, zoom?: number) => {
        mapRef.current?.flyTo({
            center: [longitude, latitude],
            zoom: zoom ?? 15,
            pitch: 60,
            bearing: 45,
            duration: 3000,
            essential: true
        });
    }, []);

    /** Cinematic sequential tour — flies through a list of stops */
    const startCinematicTour = useCallback((stops: { lng: number; lat: number; name?: string }[], zoom: number = 15) => {
        if (!stops.length || !mapRef.current) return;
        let i = 0;
        const flyNext = () => {
            if (i >= stops.length) return;
            const stop = stops[i];
            mapRef.current?.flyTo({
                center: [stop.lng, stop.lat],
                zoom,
                pitch: 60,
                bearing: 20 + (i * 30) % 90, // rotate bearing for variety
                duration: 3000,
                essential: true
            });
            i++;
            if (i < stops.length) {
                setTimeout(flyNext, 3500); // wait for previous fly to finish + brief pause
            }
        };
        flyNext();
    }, []);

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

    return {
        mapRef,
        drawRef,
        viewState,
        setViewState,
        mapStyle,
        setMapStyle,
        bounds,
        updateBounds,
        isDrawing,
        setIsDrawing,
        handleToggleDraw,
        handleFlyTo,
        handleCinematicFlyTo,
        startCinematicTour,
        clusters,
        supercluster
    };
};
