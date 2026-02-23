/**
 * PSI MAPS - BATCH LANDMARK INJECTOR
 * * HOW TO RUN THIS LOCALLY:
 * 1. Open your terminal in this project folder.
 * 2. Run the script: node scripts/seed-landmarks.cjs
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 1. Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ ERROR: service-account.json not found in the scripts folder.");
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// 2. Curated UAE Landmark Dataset
const uaeLandmarks = [
    // --- ABU DHABI ---
    { name: "Louvre Abu Dhabi", category: "Culture", city: "Abu Dhabi", community: "Saadiyat Island", coordinates: { lat: 24.5338, lng: 54.3983 }, status: "Active" },
    { name: "Zayed National Museum", category: "Culture", city: "Abu Dhabi", community: "Saadiyat Island", coordinates: { lat: 24.5305, lng: 54.4001 }, status: "Active" },
    { name: "Cranleigh Abu Dhabi", category: "School", city: "Abu Dhabi", community: "Saadiyat Island", coordinates: { lat: 24.5322, lng: 54.4068 }, status: "Active" },
    { name: "Sheikh Zayed Grand Mosque", category: "Culture", city: "Abu Dhabi", community: "Abu Dhabi Gate", coordinates: { lat: 24.4128, lng: 54.4750 }, status: "Active" },
    { name: "Emirates Palace", category: "Hotel", city: "Abu Dhabi", community: "Al Ras Al Akhdar", coordinates: { lat: 24.4615, lng: 54.3173 }, status: "Active" },
    { name: "Yas Mall", category: "Retail", city: "Abu Dhabi", community: "Yas Island", coordinates: { lat: 24.4886, lng: 54.6083 }, status: "Active" },
    { name: "Ferrari World", category: "Culture", city: "Abu Dhabi", community: "Yas Island", coordinates: { lat: 24.4838, lng: 54.6070 }, status: "Active" },
    { name: "Cleveland Clinic Abu Dhabi", category: "Hospital", city: "Abu Dhabi", community: "Al Maryah Island", coordinates: { lat: 24.5015, lng: 54.3895 }, status: "Active" },
    { name: "Galleria Mall", category: "Retail", city: "Abu Dhabi", community: "Al Maryah Island", coordinates: { lat: 24.5020, lng: 54.3900 }, status: "Active" },
    { name: "Repton School Abu Dhabi", category: "School", city: "Abu Dhabi", community: "Al Reem Island", coordinates: { lat: 24.4982, lng: 54.4062 }, status: "Active" },

    // --- DUBAI ---
    { name: "Burj Khalifa", category: "Culture", city: "Dubai", community: "Downtown Dubai", coordinates: { lat: 25.1972, lng: 55.2744 }, status: "Active" },
    { name: "The Dubai Mall", category: "Retail", city: "Dubai", community: "Downtown Dubai", coordinates: { lat: 25.1973, lng: 55.2793 }, status: "Active" },
    { name: "Dubai Opera", category: "Culture", city: "Dubai", community: "Downtown Dubai", coordinates: { lat: 25.1966, lng: 55.2723 }, status: "Active" },
    { name: "Atlantis The Palm", category: "Hotel", city: "Dubai", community: "The Palm Jumeirah", coordinates: { lat: 25.1304, lng: 55.1171 }, status: "Active" },
    { name: "Burj Al Arab", category: "Hotel", city: "Dubai", community: "Jumeirah", coordinates: { lat: 25.1412, lng: 55.1852 }, status: "Active" },
    { name: "Mall of the Emirates", category: "Retail", city: "Dubai", community: "Al Barsha", coordinates: { lat: 25.1181, lng: 55.2006 }, status: "Active" },
    { name: "Mediclinic City Hospital", category: "Hospital", city: "Dubai", community: "Dubai Healthcare City", coordinates: { lat: 25.2285, lng: 55.3185 }, status: "Active" },
    { name: "GEMS Wellington International School", category: "School", city: "Dubai", community: "Al Sufouh", coordinates: { lat: 25.1121, lng: 55.1664 }, status: "Active" },
    { name: "Dubai International Academy", category: "School", city: "Dubai", community: "Emirates Hills", coordinates: { lat: 25.0765, lng: 55.1631 }, status: "Active" },
    { name: "Ain Dubai", category: "Culture", city: "Dubai", community: "Bluewaters Island", coordinates: { lat: 25.0796, lng: 55.1215 }, status: "Active" }
];

async function seedLandmarks() {
    console.log(`🚀 Starting Batch Injection of ${uaeLandmarks.length} Landmarks...`);

    let successCount = 0;

    for (const landmark of uaeLandmarks) {
        try {
            // Create a clean URL-friendly ID (e.g., "louvre-abu-dhabi")
            const docId = landmark.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            // Inject into the 'landmarks' collection
            await db.collection('landmarks').doc(docId).set({
                ...landmark,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`✅ Injected: ${landmark.name} (${landmark.category})`);
            successCount++;
        } catch (error) {
            console.error(`❌ Failed to inject ${landmark.name}:`, error.message);
        }
    }

    console.log(`\n🎉 Injection Complete! Successfully added ${successCount} premium landmarks to the database.`);
    process.exit(0);
}

seedLandmarks();
