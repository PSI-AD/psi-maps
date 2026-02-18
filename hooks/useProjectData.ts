import { useState, useCallback, useMemo, useEffect } from 'react';
import * as turf from '@turf/turf';
import { Project } from '../types';
import { collection, onSnapshot, query } from 'firebase/firestore'; // Import Firestore functions
import { db } from '../utils/firebase'; // Import initialized db instance
import { amenitiesData } from '../data/seedData';

export const useProjectData = () => {
    const [liveProjects, setLiveProjects] = useState<Project[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeAmenities, setActiveAmenities] = useState<string[]>([]);
    const [filterPolygon, setFilterPolygon] = useState<any>(null);

    // Initial Load - Setup Realtime Listener
    useEffect(() => {
        setIsRefreshing(true);
        const q = query(collection(db, 'projects'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const projects: Project[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                projects.push({
                    id: doc.id,
                    name: data.name || 'Untitled Project',
                    // User check: API often returns mapLatitude/mapLongitude as strings
                    latitude: parseFloat(data.latitude || data.mapLatitude),
                    longitude: parseFloat(data.longitude || data.mapLongitude),
                    type: data.type || 'apartment',
                    thumbnailUrl: data.thumbnailUrl || (data.generalImages && data.generalImages[0]?.imageURL) || '',
                    developerName: data.developerName || data.masterDeveloper || 'Unknown Developer',
                    projectUrl: data.projectUrl || '',
                    priceRange: data.priceRange || data.maxPrice ? `AED ${Number(data.minPrice || 0).toLocaleString()} - ${Number(data.maxPrice).toLocaleString()}` : 'Enquire',
                    description: data.description || data.enPropertyOverView || '',
                    images: [
                        ...(data.featuredImages?.map((img: any) => img.imageURL) || []),
                        ...(data.generalImages?.map((img: any) => img.imageURL) || [])
                    ],
                    bedrooms: data.availableBedrooms ? data.availableBedrooms.map((b: any) => b.noOfBedroom).join(', ') : 'N/A',
                    bathrooms: 'N/A', // Data might not have explicit bathrooms count at top level, check unitModels if needed
                    builtupArea: data.builtupArea_SQFT || 0,
                    plotArea: data.plotArea_SQFT || 0,
                    completionDate: data.completionDate || 'Ready',
                    status: data.propertyPlan || 'Completed',
                    amenities: data.aminities?.map((a: any) => a.name) || [],
                    city: data.city,
                    community: data.community,
                    subCommunity: data.subCommunity
                } as Project);
            });
            // CRITICAL: Filter out projects with invalid coordinates to prevent map errors
            const validProjects = projects.filter(p => !isNaN(p.latitude) && !isNaN(p.longitude) && p.latitude !== 0 && p.longitude !== 0);
            setLiveProjects(validProjects);
            setIsRefreshing(false);
        }, (error) => {
            console.error("Error fetching projects:", error);
            setIsRefreshing(false);
        });

        return () => unsubscribe();
    }, []);

    const loadInitialData = useCallback(async () => {
        // No-op for now as we have a listener, or could trigger a manual refresh/re-sub if needed.
        // For compatibility with UI button:
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 500);
    }, []);

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
