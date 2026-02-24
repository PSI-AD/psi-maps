import { useState, useCallback, useMemo, useEffect } from 'react';
import * as turf from '@turf/turf';
import { Project, Landmark } from '../types';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../utils/firebase';

// Intercepts the PSI API image URL and forces it to return a fast, compressed thumbnail
const getOptimizedImage = (url: string, width: number, height: number) => {
    if (!url) return 'https://images.unsplash.com/photo-1600607687969-b6139b5f40bb?auto=format&fit=crop&w=800&q=80';
    if (url.includes('width=0&height=0')) {
        return url.replace('width=0&height=0', `width=${width}&height=${height}`);
    }
    return url;
};

export const useProjectData = () => {
    const [liveProjects, setLiveProjects] = useState<Project[]>([]);
    const [liveLandmarks, setLiveLandmarks] = useState<Landmark[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Initialize active amenities from localStorage or default to empty array
    const [activeAmenities, setActiveAmenities] = useState<string[]>(() => {
        try {
            const savedDefaults = localStorage.getItem('psi-default-amenities');
            return savedDefaults ? JSON.parse(savedDefaults) : [];
        } catch (e) {
            console.error("Error reading default amenities from localStorage:", e);
            return [];
        }
    });

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

                // DEEP MAPPING AUDIT: Grab correct names from your specific API format
                const rawName = data.propertyName || data.enMarketingTitle || data.name || data.ProjectName || data.title || 'Untitled Project';
                const cleanName = rawName !== 'Untitled Project' ? rawName.replace(/[-_]/g, ' ') : rawName;
                const rawDeveloper = data.masterDeveloper || data.developerName || data.Developer || data.developer || 'Exclusive Developer';

                // Extract all images
                const featuredImages = data.featuredImages?.map((img: any) => img.imageURL) || [];
                const generalImages = data.generalImages?.map((img: any) => img.imageURL) || [];
                const allImages = [...featuredImages, ...generalImages];
                const rawThumb = allImages[0] || data.thumbnailUrl || '';

                // Format Price cleanly
                let priceString = 'Enquire for Details';
                if (data.minPrice && data.maxPrice && data.maxPrice !== "0.00") {
                    if (data.minPrice === "0.00") {
                        priceString = `Up to AED ${Number(data.maxPrice).toLocaleString()}`;
                    } else {
                        priceString = `AED ${Number(data.minPrice).toLocaleString()} - ${Number(data.maxPrice).toLocaleString()}`;
                    }
                } else if (data.maxPrice && data.maxPrice !== "0.00") {
                    priceString = `AED ${Number(data.maxPrice).toLocaleString()}`;
                }

                const lat = parseFloat(data.mapLatitude || data.latitude || "0");
                const lng = parseFloat(data.mapLongitude || data.longitude || "0");

                const rawDesc = data.enPropertyOverView || data.description || '';
                const cleanDesc = rawDesc.replace(/&nbsp;/g, ' ').replace(/\s{2,}/g, ' ').trim();

                return {
                    id: doc.id,
                    name: cleanName,
                    latitude: isNaN(lat) ? 0 : lat,
                    longitude: isNaN(lng) ? 0 : lng,
                    type: data.propertyType || data.type || 'apartment',
                    // Request compressed 400x300 thumbnail for the map pins
                    thumbnailUrl: getOptimizedImage(rawThumb, 400, 300),
                    developerName: rawDeveloper,
                    projectUrl: data.projectUrl || '',
                    priceRange: priceString,
                    description: cleanDesc || 'Experience unparalleled luxury in this exclusive development.',
                    // Request medium-res images for the sidebar gallery
                    images: allImages.map(img => getOptimizedImage(img, 1200, 800)),
                    bedrooms: data.availableBedrooms ? data.availableBedrooms.map((b: any) => b.noOfBedroom).join(', ') : (data.numberOfApartmentStudio ? 'Studios & Apartments' : '1 - 4 Beds'),
                    bathrooms: data.bathrooms || 'Premium Fittings',
                    builtupArea: data.areaRangeMax || data.builtupArea_SQFT || 0,
                    plotArea: data.plotArea_SQFT || 0,
                    completionDate: data.completionDate || data.propertyPlan || 'Ready',
                    status: data.propertyPlan || 'Completed',
                    amenities: data.aminities?.map((a: any) => a.name) || [],
                    city: data.city || 'Dubai',
                    community: data.community || data.subCommunity || 'Exclusive Community',
                    subCommunity: data.subCommunity || '',
                    optimizedGallery: data.optimizedGallery || [],
                    responsiveMedia: data.responsiveMedia || null
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
                    category: data.category || 'Culture',
                    community: data.community || '',
                    latitude: parseFloat(data.latitude || "0"),
                    longitude: parseFloat(data.longitude || "0"),
                    isHidden: data.isHidden || false,
                    thumbnailUrl: data.thumbnailUrl || '',
                    city: data.city || ''
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

        // Location filters — applied first (most restrictive)
        if (selectedCity) {
            projects = projects.filter(p => p.city?.toLowerCase().trim() === selectedCity.toLowerCase().trim());
        }
        if (selectedCommunity) {
            projects = projects.filter(p => p.community?.toLowerCase().trim() === selectedCommunity.toLowerCase().trim());
        }

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

        // SAFETY FIX: Prevents crash if the user presses enter before closing the drawing shape
        try {
            if (filterPolygon.geometry?.type !== 'Polygon') {
                return projects;
            }
            const points = turf.featureCollection(
                projects.map(p => turf.point([p.longitude, p.latitude], { ...p }))
            ) as any;
            const within = turf.pointsWithinPolygon(points, filterPolygon);
            return within.features.map(f => f.properties as Project);
        } catch (error) {
            console.error("Draw area error caught safely:", error);
            return projects;
        }
    }, [liveProjects, filterPolygon, propertyType, developerFilter, statusFilter, selectedCity, selectedCommunity]);

    const filteredAmenities = useMemo(() => {
        if (activeAmenities.length === 0) return [];
        return liveLandmarks.filter(landmark => {
            if (landmark.isHidden) return false;

            // 1. Category filter — accept both Title Case ('School') and lowercase ('school')
            const categoryMatch =
                activeAmenities.includes(landmark.category) ||
                activeAmenities.includes(landmark.category.toLowerCase());
            if (!categoryMatch) return false;

            // 2. Strict city geofence — only show amenities in the selected city
            if (selectedCity && landmark.city) {
                if (landmark.city.toLowerCase().trim() !== selectedCity.toLowerCase().trim()) return false;
            }

            // 3. Strict community geofence — only show amenities in the selected community
            if (selectedCommunity && landmark.community) {
                if (landmark.community.toLowerCase().trim() !== selectedCommunity.toLowerCase().trim()) return false;
            }

            return true;
        });
    }, [activeAmenities, liveLandmarks, selectedCity, selectedCommunity]);

    const handleToggleAmenity = (category: string) => {
        setActiveAmenities(prev =>
            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
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
