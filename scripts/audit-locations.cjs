const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// 1. Initialize Firebase
const serviceAccountPath = path.resolve(__dirname, '../service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Missing service-account.json. Please ensure it exists in the root folder.');
    process.exit(1);
}
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// 2. Setup Mapbox Token
const MAPBOX_TOKEN = process.env.VITE_MAPBOX_TOKEN;
if (!MAPBOX_TOKEN) {
    console.error('❌ Missing VITE_MAPBOX_TOKEN in .env.local file.');
    process.exit(1);
}

// Helper: Haversine distance formula (returns distance in meters)
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const toRadians = (deg) => deg * (Math.PI / 180);
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const auditLocations = async () => {
    try {
        console.log('📡 Fetching projects from live Firestore...');
        const snapshot = await db.collection('projects').get();
        const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log(`✅ Found ${projects.length} projects to audit.\n`);

        let mismatchCount = 0;
        let notFoundCount = 0;
        let skippedCount = 0;
        const batch = db.batch();

        for (let i = 0; i < projects.length; i++) {
            const p = projects[i];

            // 1. DYNAMIC EXTRACTION: Look in root OR nested coordinates object
            let lat = p.latitude;
            let lng = p.longitude;

            if (p.coordinates && (lat === undefined || lng === undefined)) {
                lat = p.coordinates.lat;
                lng = p.coordinates.lng;
            }

            // Convert to numbers
            const numLat = Number(lat);
            const numLng = Number(lng);

            // 2. STRICTER CHECK: Skip if missing, NaN, OR set to 0 (which causes that 5000km error)
            if (!lat || !lng || isNaN(numLat) || isNaN(numLng) || numLat === 0 || numLng === 0) {
                skippedCount++;
                continue;
            }

            // Append community + city context for better Mapbox results
            const searchQuery = encodeURIComponent(`${p.name}, ${p.community || ''}, ${p.city || 'Abu Dhabi'}, UAE`);
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${searchQuery}.json?access_token=${MAPBOX_TOKEN}&limit=1`;

            try {
                const response = await fetch(url);
                const data = await response.json();

                if (data.features && data.features.length > 0) {
                    // Mapbox returns coordinates as [longitude, latitude]
                    const [mbLng, mbLat] = data.features[0].center;

                    const distance = getDistanceInMeters(numLat, numLng, mbLat, mbLng);

                    if (distance > 100) {
                        console.log(`⚠️  Mismatch: ${p.name} — off by ${Math.round(distance)}m (community: ${p.community || 'N/A'})`);
                        mismatchCount++;

                        const auditRef = db.collection('audit_locations').doc(p.id);
                        batch.set(auditRef, {
                            projectId: p.id,
                            projectName: p.name,
                            community: p.community || 'Unknown',
                            currentCoordinates: { lat: numLat, lng: numLng },
                            suggestedCoordinates: { lat: mbLat, lng: mbLng },
                            distanceOffMeters: Math.round(distance),
                            mapboxPlaceName: data.features[0].place_name,
                            status: 'pending',
                            createdAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }
                } else {
                    notFoundCount++;
                }
            } catch (err) {
                console.error(`  Error checking ${p.name}:`, err.message);
            }

            await sleep(250); // Mapbox rate limit safety
            if ((i + 1) % 50 === 0) console.log(`  ... audited ${i + 1}/${projects.length} projects`);
        }

        if (mismatchCount > 0) {
            console.log(`\n💾 Saving ${mismatchCount} mismatches to 'audit_locations' collection...`);
            await batch.commit();
        }

        console.log('\n🎉 Audit Complete!');
        console.log(`  Total Projects: ${projects.length}`);
        console.log(`  Skipped (no coords): ${skippedCount}`);
        console.log(`  Mismatches (>100m): ${mismatchCount}`);
        console.log(`  Not Found by Mapbox: ${notFoundCount}`);
        console.log(`  Matched OK: ${projects.length - skippedCount - mismatchCount - notFoundCount}`);

    } catch (error) {
        console.error('❌ Error running audit:', error);
    }
};

auditLocations();
