import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { MapRef } from 'react-map-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import useSupercluster from 'use-supercluster';
import { Project } from '../types';

export const useMapState = (filteredProjects: Project[]) => {
    const mapRef = useRef<MapRef>(null);
    const drawRef = useRef<MapboxDraw | null>(null);

    const [viewState, setViewState] = useState({
        longitude: 54.8,
        latitude: 24.84,
        zoom: 7.5,
        pitch: 0,
        bearing: 0
    });

    const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v12');
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

    const handleFlyTo = useCallback((longitude: number, latitude: number) => {
        mapRef.current?.flyTo({
            center: [longitude, latitude],
            zoom: 14.5,
            duration: 1000,
            essential: true
        });
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
        clusters,
        supercluster
    };
};
