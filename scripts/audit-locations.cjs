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
        console.log('📌 Strategy: SAFE MODE — audit coordinates are stored as NEW fields.');
        console.log('   Original mapLatitude/mapLongitude will NOT be modified.\n');

        let mismatchCount = 0;
        let matchedCount = 0;
        let notFoundCount = 0;
        let skippedCount = 0;

        // Firestore batch limit is 500 operations — we'll auto-flush
        let batch = db.batch();
        let batchCount = 0;

        const flushBatch = async () => {
            if (batchCount > 0) {
                await batch.commit();
                batch = db.batch();
                batchCount = 0;
            }
        };

        for (let i = 0; i < projects.length; i++) {
            const p = projects[i];

            // 1. Try to get coordinates from multiple possible field names
            let lat = p.mapLatitude ?? p.latitude;
            let lng = p.mapLongitude ?? p.longitude;

            if ((lat === undefined || lng === undefined) && p.coordinates) {
                lat = lat ?? p.coordinates.lat;
                lng = lng ?? p.coordinates.lng;
            }

            // 2. Convert to numbers
            const numLat = Number(lat);
            const numLng = Number(lng);

            // 3. Skip only if truly missing, NaN, or [0,0]
            if (!lat || !lng || isNaN(numLat) || isNaN(numLng) || (numLat === 0 && numLng === 0)) {
                skippedCount++;
                continue;
            }

            const currentLat = numLat;
            const currentLng = numLng;

            // Resolve project name from multiple possible fields
            const projectName = p.name || p.propertyName || p.enMarketingTitle || 'Unknown Project';

            // Append community + city context for better Mapbox results
            const searchQuery = encodeURIComponent(`${projectName}, ${p.community || ''}, ${p.city || 'Abu Dhabi'}, UAE`);
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${searchQuery}.json?access_token=${MAPBOX_TOKEN}&limit=1`;

            try {
                const response = await fetch(url);
                const data = await response.json();

                if (data.features && data.features.length > 0) {
                    const [mbLng, mbLat] = data.features[0].center;
                    const distance = getDistanceInMeters(currentLat, currentLng, mbLat, mbLng);

                    if (distance > 100) {
                        console.log(`⚠️  Mismatch: ${projectName} — off by ${Math.round(distance)}m (community: ${p.community || 'N/A'})`);
                        mismatchCount++;

                        // ── SAFE WRITE: Add audit fields to the PROJECT document itself ──
                        // Original mapLatitude/mapLongitude remain UNTOUCHED
                        const projectRef = db.collection('projects').doc(p.id);
                        batch.update(projectRef, {
                            auditLatitude: mbLat,
                            auditLongitude: mbLng,
                            auditDistanceMeters: Math.round(distance),
                            auditMapboxPlaceName: data.features[0].place_name,
                            auditStatus: 'pending',    // pending | approved | rejected
                            auditedAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        batchCount++;

                        // Firestore batch limit is 500 — flush before hitting it
                        if (batchCount >= 490) {
                            console.log('  💾 Flushing batch (490 writes)...');
                            await flushBatch();
                        }
                    } else {
                        matchedCount++;
                    }
                } else {
                    notFoundCount++;
                }
            } catch (err) {
                console.error(`  Error checking ${projectName}:`, err.message);
            }

            await sleep(250); // Mapbox rate limit safety
            if ((i + 1) % 50 === 0) console.log(`  ... audited ${i + 1}/${projects.length} projects`);
        }

        // Flush remaining writes
        await flushBatch();

        console.log('\n🎉 Audit Complete!');
        console.log(`  Total Projects: ${projects.length}`);
        console.log(`  Skipped (no coords): ${skippedCount}`);
        console.log(`  ✅ Matched OK (<100m): ${matchedCount}`);
        console.log(`  ⚠️  Mismatches (>100m): ${mismatchCount}`);
        console.log(`  ❌ Not Found by Mapbox: ${notFoundCount}`);
        console.log('\n📌 Audit fields added to each mismatched project:');
        console.log('   • auditLatitude / auditLongitude — suggested coordinates');
        console.log('   • auditDistanceMeters — how far off the original was');
        console.log('   • auditMapboxPlaceName — what Mapbox resolved');
        console.log('   • auditStatus — "pending" (approve/reject manually)');
        console.log('\n💡 Original mapLatitude/mapLongitude are UNTOUCHED.');

    } catch (error) {
        console.error('❌ Error running audit:', error);
    }
};

auditLocations();
