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
    const [propertyType, setPropertyType] = useState<string>('All');

    // Initial Load - Setup Realtime Listener
    useEffect(() => {
        setIsRefreshing(true);
        const unsubscribe = onSnapshot(collection(db, 'projects'), (snapshot) => {
            const projects: Project[] = snapshot.docs.map((doc) => {
                const data = doc.data();

                const rawName = data.propertyName || data.enMarketingTitle || data.name || data.ProjectName || data.title || 'Untitled Project';
                const cleanName = rawName !== 'Untitled Project' ? rawName.replace(/[-_]/g, ' ') : rawName;

                const rawDeveloper = data.masterDeveloper || data.developerName || data.Developer || data.developer || 'Unknown Developer';

                const lat = parseFloat(data.mapLatitude || data.latitude || "0");
                const lng = parseFloat(data.mapLongitude || data.longitude || "0");

                return {
                    id: doc.id,
                    name: cleanName,
                    latitude: isNaN(lat) ? 0 : lat,
                    longitude: isNaN(lng) ? 0 : lng,
                    type: data.type || 'apartment',
                    thumbnailUrl: data.thumbnailUrl || (data.generalImages && data.generalImages[0]?.imageURL) || '',
                    developerName: rawDeveloper,
                    projectUrl: data.projectUrl || '',
                    priceRange: data.priceRange || (data.maxPrice ? `AED ${Number(data.minPrice || 0).toLocaleString()} - ${Number(data.maxPrice).toLocaleString()}` : 'Enquire'),
                    description: data.description || data.enPropertyOverView || '',
                    images: [
                        ...(data.featuredImages?.map((img: any) => img.imageURL) || []),
                        ...(data.generalImages?.map((img: any) => img.imageURL) || [])
                    ],
                    bedrooms: data.availableBedrooms ? data.availableBedrooms.map((b: any) => b.noOfBedroom).join(', ') : 'N/A',
                    bathrooms: 'N/A',
                    builtupArea: data.builtupArea_SQFT || 0,
                    plotArea: data.plotArea_SQFT || 0,
                    completionDate: data.completionDate || 'Ready',
                    status: data.propertyPlan || 'Completed',
                    amenities: data.aminities?.map((a: any) => a.name) || [],
                    city: data.city,
                    community: data.community,
                    subCommunity: data.subCommunity
                } as Project;
            });

            console.log("🔥 EXCLUSIVE FIRESTORE DATA LOADED. Count:", projects.length);
            setLiveProjects(projects);
            setIsRefreshing(false);
        }, (error) => {
            console.error("🔥 FIRESTORE READ ERROR:", error);
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
        let projects = liveProjects;

        if (propertyType !== 'All') {
            projects = projects.filter(p => p.type?.toLowerCase() === propertyType.toLowerCase());
        }

        if (!filterPolygon) return projects;

        const points = turf.featureCollection(
            projects.map(p => turf.point([p.longitude, p.latitude], { ...p }))
        ) as any;

        const within = turf.pointsWithinPolygon(points, filterPolygon);
        return within.features.map(f => f.properties as Project);
    }, [liveProjects, filterPolygon, propertyType]);

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
        setFilterPolygon,
        propertyType,
        setPropertyType
    };
};
