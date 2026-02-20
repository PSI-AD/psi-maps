import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export const fetchAndSaveBoundary = async (communityName: string) => {
    try {
        const query = encodeURIComponent(`${communityName}, United Arab Emirates`);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&polygon_geojson=1&format=json`);
        const data = await response.json();
        const validResult = data.find((item: any) => item.geojson && (item.geojson.type === 'Polygon' || item.geojson.type === 'MultiPolygon'));

        if (validResult) {
            const boundaryRef = doc(db, 'community_boundaries', communityName);
            await setDoc(boundaryRef, {
                name: communityName,
                geojson: validResult.geojson,
                updatedAt: new Date().toISOString()
            });
            return validResult.geojson;
        }
        return null;
    } catch (error) {
        console.error(`Failed to sync boundary for ${communityName}`, error);
        return null;
    }
};

export const getBoundaryFromDB = async (communityName: string) => {
    try {
        const boundaryRef = doc(db, 'community_boundaries', communityName);
        const docSnap = await getDoc(boundaryRef);
        if (docSnap.exists()) {
            return docSnap.data().geojson;
        }
        return null;
    } catch (error) {
        console.error("Error reading boundary from DB", error);
        return null;
    }
};
