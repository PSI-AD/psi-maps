import { useState, useCallback, useMemo, useEffect } from 'react';
import * as turf from '@turf/turf';
import { Project, Landmark } from '../types';
import { collection, onSnapshot, query } from 'firebase/firestore'; // Import Firestore functions
import { db } from '../utils/firebase'; // Import initialized db instance

export const useProjectData = () => {
    const [liveProjects, setLiveProjects] = useState<Project[]>([]);
    const [liveLandmarks, setLiveLandmarks] = useState<Landmark[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeAmenities, setActiveAmenities] = useState<string[]>([]);
    const [filterPolygon, setFilterPolygon] = useState<any>(null);
    const [propertyType, setPropertyType] = useState<string>('All');
    const [developerFilter, setDeveloperFilter] = useState<string>('All');
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [selectedCommunity, setSelectedCommunity] = useState<string>('');
    const [activeBoundary, setActiveBoundary] = useState<any>(null);

    // Projects Listener
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

                const rawDesc = data.enPropertyOverView || data.description || '';
                const cleanDesc = rawDesc.replace(/&nbsp;/g, ' ').replace(/\s{2,}/g, ' ').trim();

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
                    description: cleanDesc,
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

            console.log("🔥 FIRESTORE PROJECTS LOADED. Count:", projects.length);
            setLiveProjects(projects);
            setIsRefreshing(false);
        }, (error) => {
            console.error("🔥 FIRESTORE PROJECTS ERROR:", error);
            setIsRefreshing(false);
        });

        return () => unsubscribe();
    }, []);

    // Landmarks Listener
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'landmarks'), (snapshot) => {
            const landmarks: Landmark[] = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name || 'Untitled Landmark',
                    category: data.category || 'culture',
                    latitude: parseFloat(data.latitude || "0"),
                    longitude: parseFloat(data.longitude || "0"),
                    thumbnailUrl: data.thumbnailUrl || ''
                } as Landmark;
            });

            console.log("📍 FIRESTORE LANDMARKS LOADED. Count:", landmarks.length);
            setLiveLandmarks(landmarks);
        }, (error) => {
            console.error("📍 FIRESTORE LANDMARKS ERROR:", error);
        });

        return () => unsubscribe();
    }, []);

    const loadInitialData = useCallback(async () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 500);
    }, []);

    const filteredProjects = useMemo(() => {
        let projects = liveProjects;

        if (propertyType !== 'All') {
            projects = projects.filter(p => p.type?.toLowerCase() === propertyType.toLowerCase());
        }

        if (developerFilter !== 'All') {
            projects = projects.filter(p => p.developerName === developerFilter);
        }

        if (statusFilter !== 'All') {
            projects = projects.filter(p => {
                const isOffPlan = p.status?.toLowerCase().includes('off');
                if (statusFilter === 'Off-Plan') return isOffPlan;
                if (statusFilter === 'Completed') return !isOffPlan;
                return true;
            });
        }

        if (!filterPolygon) return projects;

        const points = turf.featureCollection(
            projects.map(p => turf.point([p.longitude, p.latitude], { ...p }))
        ) as any;

        const within = turf.pointsWithinPolygon(points, filterPolygon);
        return within.features.map(f => f.properties as Project);
    }, [liveProjects, filterPolygon, propertyType, developerFilter, statusFilter]);

    const filteredAmenities = useMemo(() => {
        if (activeAmenities.length === 0) return [];
        return liveLandmarks.filter(landmark => activeAmenities.includes(landmark.category));
    }, [activeAmenities, liveLandmarks]);

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
        liveLandmarks,
        setLiveLandmarks,
        isRefreshing,
        loadInitialData,
        filteredProjects,
        filteredAmenities,
        activeAmenities,
        handleToggleAmenity,
        filterPolygon,
        setFilterPolygon,
        propertyType,
        setPropertyType,
        developerFilter,
        setDeveloperFilter,
        statusFilter,
        setStatusFilter,
        selectedCity,
        setSelectedCity,
        selectedCommunity,
        setSelectedCommunity,
        activeBoundary,
        setActiveBoundary
    };
};
