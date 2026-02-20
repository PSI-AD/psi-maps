
export const fetchLocationBoundary = async (locationName: string) => {
    try {
        // Append UAE to ensure we don't get a similarly named place in another country
        const query = encodeURIComponent(`${locationName}, United Arab Emirates`);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&polygon_geojson=1&format=json`);
        const data = await response.json();

        // Find the first result that actually includes a polygon geometry
        const validResult = data.find((item: any) => item.geojson && (item.geojson.type === 'Polygon' || item.geojson.type === 'MultiPolygon'));

        if (validResult) return validResult.geojson;
        return null;
    } catch (error) {
        console.error("Boundary fetch failed:", error);
        return null;
    }
};
