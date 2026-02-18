import { useState, useCallback, useMemo, useEffect } from 'react';
import * as turf from '@turf/turf';
import { Project } from '../types';
import { fetchLiveProperties } from '../utils/apiClient';
import { amenitiesData } from '../data/seedData';

export const useProjectData = () => {
    const [liveProjects, setLiveProjects] = useState<Project[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeAmenities, setActiveAmenities] = useState<string[]>([]);
    const [filterPolygon, setFilterPolygon] = useState<any>(null);

    const loadInitialData = useCallback(async () => {
        setIsRefreshing(true);
        const data = await fetchLiveProperties();
        setLiveProjects(data);
        setIsRefreshing(false);
    }, []);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    const filteredProjects = useMemo(() => {
        if (!filterPolygon) return liveProjects;

        const points = turf.featureCollection(
            liveProjects.map(p => turf.point([p.longitude, p.latitude], { ...p }))
        ) as any;

        const within = turf.pointsWithinPolygon(points, filterPolygon);
        return within.features.map(f => f.properties as Project);
    }, [liveProjects, filterPolygon]);

    const filteredAmenities = useMemo(() => {
        if (activeAmenities.length === 0) return [];
        return amenitiesData.filter(amenity => activeAmenities.includes(amenity.category));
    }, [activeAmenities]);

    const handleToggleAmenity = (category: string) => {
        setActiveAmenities(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    return {
        liveProjects,
        setLiveProjects,
        isRefreshing,
        loadInitialData,
        filteredProjects,
        filteredAmenities,
        activeAmenities,
        handleToggleAmenity,
        filterPolygon,
        setFilterPolygon
    };
};
