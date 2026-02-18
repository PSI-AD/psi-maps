
/**
 * Fetches nearby amenities for a given coordinate using the proxy server.
 */
export const fetchNearbyAmenities = async (lat: number, lng: number) => {
  let isLocal = false;
  try {
    const currentHostname = (window && window.location && window.location.hostname) ? window.location.hostname : '';
    isLocal = currentHostname === 'localhost' || currentHostname === '127.0.0.1';
  } catch (e) {
    isLocal = false;
  }

  if (!isLocal) {
    console.info('Nearby amenities discovery is currently limited to local CRM connections.');
    return [];
  }

  const PROXY_URL = 'http://localhost:3001/api/places';
  
  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        includedTypes: ["restaurant", "school", "hospital", "museum", "park"],
        maxResultCount: 15,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 1000.0
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Places Proxy responded with status: ${response.status}`);
    }

    const data = await response.json();
    return data.places || [];
  } catch (error) {
    console.error('Failed to fetch nearby amenities:', error);
    return [];
  }
};
