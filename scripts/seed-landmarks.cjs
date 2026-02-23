/**
 * PSI MAPS - MASSIVE LANDMARK INJECTOR (80 PREMIUM LOCATIONS)
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ ERROR: service-account.json not found.");
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const premiumLandmarks = [
    // ==========================================
    // ABU DHABI - CULTURE & RETAIL (10)
    // ==========================================
    { name: "Louvre Abu Dhabi", category: "Culture", city: "Abu Dhabi", community: "Saadiyat Island", coordinates: { lat: 24.5338, lng: 54.3983 }, status: "Active", logoUrl: "" },
    { name: "Sheikh Zayed Grand Mosque", category: "Culture", city: "Abu Dhabi", community: "Abu Dhabi Gate", coordinates: { lat: 24.4128, lng: 54.4750 }, status: "Active", logoUrl: "" },
    { name: "Ferrari World", category: "Culture", city: "Abu Dhabi", community: "Yas Island", coordinates: { lat: 24.4838, lng: 54.6070 }, status: "Active", logoUrl: "" },
    { name: "Qasr Al Watan", category: "Culture", city: "Abu Dhabi", community: "Al Ras Al Akhdar", coordinates: { lat: 24.4616, lng: 54.3155 }, status: "Active", logoUrl: "" },
    { name: "Warner Bros. World", category: "Culture", city: "Abu Dhabi", community: "Yas Island", coordinates: { lat: 24.4905, lng: 54.5983 }, status: "Active", logoUrl: "" },
    { name: "SeaWorld Abu Dhabi", category: "Culture", city: "Abu Dhabi", community: "Yas Island", coordinates: { lat: 24.4851, lng: 54.6152 }, status: "Active", logoUrl: "" },
    { name: "Zayed National Museum", category: "Culture", city: "Abu Dhabi", community: "Saadiyat Island", coordinates: { lat: 24.5305, lng: 54.4001 }, status: "Active", logoUrl: "" },
    { name: "Yas Mall", category: "Retail", city: "Abu Dhabi", community: "Yas Island", coordinates: { lat: 24.4886, lng: 54.6083 }, status: "Active", logoUrl: "" },
    { name: "The Galleria Al Maryah", category: "Retail", city: "Abu Dhabi", community: "Al Maryah Island", coordinates: { lat: 24.5020, lng: 54.3900 }, status: "Active", logoUrl: "" },
    { name: "Marina Mall", category: "Retail", city: "Abu Dhabi", community: "Al Marina", coordinates: { lat: 24.4754, lng: 54.3204 }, status: "Active", logoUrl: "" },

    // ==========================================
    // ABU DHABI - HOTELS (10)
    // ==========================================
    { name: "Emirates Palace Mandarin Oriental", category: "Hotel", city: "Abu Dhabi", community: "Al Ras Al Akhdar", coordinates: { lat: 24.4615, lng: 54.3173 }, status: "Active", logoUrl: "" },
    { name: "W Abu Dhabi", category: "Hotel", city: "Abu Dhabi", community: "Yas Island", coordinates: { lat: 24.4674, lng: 54.6056 }, status: "Active", logoUrl: "" },
    { name: "The St. Regis Saadiyat Island", category: "Hotel", city: "Abu Dhabi", community: "Saadiyat Island", coordinates: { lat: 24.5422, lng: 54.4367 }, status: "Active", logoUrl: "" },
    { name: "Park Hyatt Abu Dhabi", category: "Hotel", city: "Abu Dhabi", community: "Saadiyat Island", coordinates: { lat: 24.5441, lng: 54.4419 }, status: "Active", logoUrl: "" },
    { name: "Rosewood Abu Dhabi", category: "Hotel", city: "Abu Dhabi", community: "Al Maryah Island", coordinates: { lat: 24.5005, lng: 54.3888 }, status: "Active", logoUrl: "" },
    { name: "Four Seasons Hotel", category: "Hotel", city: "Abu Dhabi", community: "Al Maryah Island", coordinates: { lat: 24.5042, lng: 54.3897 }, status: "Active", logoUrl: "" },
    { name: "Rixos Premium Saadiyat", category: "Hotel", city: "Abu Dhabi", community: "Saadiyat Island", coordinates: { lat: 24.5420, lng: 54.4390 }, status: "Active", logoUrl: "" },
    { name: "Fairmont Bab Al Bahr", category: "Hotel", city: "Abu Dhabi", community: "Khor Al Maqta", coordinates: { lat: 24.4147, lng: 54.4841 }, status: "Active", logoUrl: "" },
    { name: "The Ritz-Carlton Grand Canal", category: "Hotel", city: "Abu Dhabi", community: "Khor Al Maqta", coordinates: { lat: 24.4109, lng: 54.4856 }, status: "Active", logoUrl: "" },
    { name: "Conrad Abu Dhabi Etihad Towers", category: "Hotel", city: "Abu Dhabi", community: "Al Bateen", coordinates: { lat: 24.4583, lng: 54.3223 }, status: "Active", logoUrl: "" },

    // ==========================================
    // ABU DHABI - SCHOOLS (10)
    // ==========================================
    { name: "Cranleigh Abu Dhabi", category: "School", city: "Abu Dhabi", community: "Saadiyat Island", coordinates: { lat: 24.5322, lng: 54.4068 }, status: "Active", logoUrl: "" },
    { name: "Repton School Abu Dhabi", category: "School", city: "Abu Dhabi", community: "Al Reem Island", coordinates: { lat: 24.4982, lng: 54.4062 }, status: "Active", logoUrl: "" },
    { name: "Brighton College Abu Dhabi", category: "School", city: "Abu Dhabi", community: "Bloom Gardens", coordinates: { lat: 24.4239, lng: 54.4628 }, status: "Active", logoUrl: "" },
    { name: "Raha International School", category: "School", city: "Abu Dhabi", community: "Khalifa City", coordinates: { lat: 24.4357, lng: 54.5826 }, status: "Active", logoUrl: "" },
    { name: "British School Al Khubairat", category: "School", city: "Abu Dhabi", community: "Al Mushrif", coordinates: { lat: 24.4526, lng: 54.3842 }, status: "Active", logoUrl: "" },
    { name: "GEMS World Academy", category: "School", city: "Abu Dhabi", community: "Al Reem Island", coordinates: { lat: 24.4975, lng: 54.4010 }, status: "Active", logoUrl: "" },
    { name: "Amity International School", category: "School", city: "Abu Dhabi", community: "Al Bahia", coordinates: { lat: 24.5245, lng: 54.6558 }, status: "Active", logoUrl: "" },
    { name: "Al Yasmina Academy", category: "School", city: "Abu Dhabi", community: "Khalifa City", coordinates: { lat: 24.4223, lng: 54.5954 }, status: "Active", logoUrl: "" },
    { name: "Nord Anglia International", category: "School", city: "Abu Dhabi", community: "Al Reem Island", coordinates: { lat: 24.4990, lng: 54.4080 }, status: "Active", logoUrl: "" },
    { name: "International Community School", category: "School", city: "Abu Dhabi", community: "Al Mushrif", coordinates: { lat: 24.4445, lng: 54.3860 }, status: "Active", logoUrl: "" },

    // ==========================================
    // ABU DHABI - HOSPITALS (10)
    // ==========================================
    { name: "Cleveland Clinic Abu Dhabi", category: "Hospital", city: "Abu Dhabi", community: "Al Maryah Island", coordinates: { lat: 24.5015, lng: 54.3895 }, status: "Active", logoUrl: "" },
    { name: "Burjeel Hospital", category: "Hospital", city: "Abu Dhabi", community: "Al Najda", coordinates: { lat: 24.4912, lng: 54.3754 }, status: "Active", logoUrl: "" },
    { name: "NMC Royal Hospital", category: "Hospital", city: "Abu Dhabi", community: "Khalifa City", coordinates: { lat: 24.4258, lng: 54.5771 }, status: "Active", logoUrl: "" },
    { name: "Sheikh Shakhbout Medical City", category: "Hospital", city: "Abu Dhabi", community: "Al Mafraq", coordinates: { lat: 24.2885, lng: 54.6221 }, status: "Active", logoUrl: "" },
    { name: "Danat Al Emarat", category: "Hospital", city: "Abu Dhabi", community: "Abu Dhabi Gate", coordinates: { lat: 24.4075, lng: 54.5028 }, status: "Active", logoUrl: "" },
    { name: "Healthpoint", category: "Hospital", city: "Abu Dhabi", community: "Zayed Sports City", coordinates: { lat: 24.4172, lng: 54.4568 }, status: "Active", logoUrl: "" },
    { name: "Medeor 24x7 Hospital", category: "Hospital", city: "Abu Dhabi", community: "Al Muroor", coordinates: { lat: 24.4752, lng: 54.3683 }, status: "Active", logoUrl: "" },
    { name: "Amana Healthcare", category: "Hospital", city: "Abu Dhabi", community: "Khalifa City", coordinates: { lat: 24.4201, lng: 54.5822 }, status: "Active", logoUrl: "" },
    { name: "Corniche Hospital", category: "Hospital", city: "Abu Dhabi", community: "Al Markaziyah", coordinates: { lat: 24.4988, lng: 54.3689 }, status: "Active", logoUrl: "" },
    { name: "LLH Hospital", category: "Hospital", city: "Abu Dhabi", community: "Al Muroor", coordinates: { lat: 24.4811, lng: 54.3732 }, status: "Active", logoUrl: "" },

    // ==========================================
    // DUBAI - CULTURE & RETAIL (10)
    // ==========================================
    { name: "Burj Khalifa", category: "Culture", city: "Dubai", community: "Downtown Dubai", coordinates: { lat: 25.1972, lng: 55.2744 }, status: "Active", logoUrl: "" },
    { name: "The Dubai Mall", category: "Retail", city: "Dubai", community: "Downtown Dubai", coordinates: { lat: 25.1973, lng: 55.2793 }, status: "Active", logoUrl: "" },
    { name: "Museum of the Future", category: "Culture", city: "Dubai", community: "Trade Centre", coordinates: { lat: 25.2192, lng: 55.2819 }, status: "Active", logoUrl: "" },
    { name: "Dubai Opera", category: "Culture", city: "Dubai", community: "Downtown Dubai", coordinates: { lat: 25.1966, lng: 55.2723 }, status: "Active", logoUrl: "" },
    { name: "Ain Dubai", category: "Culture", city: "Dubai", community: "Bluewaters Island", coordinates: { lat: 25.0796, lng: 55.1215 }, status: "Active", logoUrl: "" },
    { name: "Dubai Frame", category: "Culture", city: "Dubai", community: "Zabeel", coordinates: { lat: 25.2355, lng: 55.3003 }, status: "Active", logoUrl: "" },
    { name: "Global Village", category: "Culture", city: "Dubai", community: "Dubailand", coordinates: { lat: 25.0682, lng: 55.3048 }, status: "Active", logoUrl: "" },
    { name: "Atlantis Aquaventure", category: "Culture", city: "Dubai", community: "The Palm Jumeirah", coordinates: { lat: 25.1328, lng: 55.1187 }, status: "Active", logoUrl: "" },
    { name: "Mall of the Emirates", category: "Retail", city: "Dubai", community: "Al Barsha", coordinates: { lat: 25.1181, lng: 55.2006 }, status: "Active", logoUrl: "" },
    { name: "Dubai Miracle Garden", category: "Culture", city: "Dubai", community: "Dubailand", coordinates: { lat: 25.0598, lng: 55.2445 }, status: "Active", logoUrl: "" },

    // ==========================================
    // DUBAI - HOTELS (10)
    // ==========================================
    { name: "Burj Al Arab", category: "Hotel", city: "Dubai", community: "Jumeirah", coordinates: { lat: 25.1412, lng: 55.1852 }, status: "Active", logoUrl: "" },
    { name: "Atlantis The Royal", category: "Hotel", city: "Dubai", community: "The Palm Jumeirah", coordinates: { lat: 25.1378, lng: 55.1293 }, status: "Active", logoUrl: "" },
    { name: "Atlantis The Palm", category: "Hotel", city: "Dubai", community: "The Palm Jumeirah", coordinates: { lat: 25.1304, lng: 55.1171 }, status: "Active", logoUrl: "" },
    { name: "Jumeirah Beach Hotel", category: "Hotel", city: "Dubai", community: "Jumeirah", coordinates: { lat: 25.1414, lng: 55.1904 }, status: "Active", logoUrl: "" },
    { name: "Armani Hotel Dubai", category: "Hotel", city: "Dubai", community: "Downtown Dubai", coordinates: { lat: 25.1972, lng: 55.2744 }, status: "Active", logoUrl: "" },
    { name: "Bulgari Resort Dubai", category: "Hotel", city: "Dubai", community: "Jumeira Bay", coordinates: { lat: 25.2104, lng: 55.2361 }, status: "Active", logoUrl: "" },
    { name: "One&Only The Palm", category: "Hotel", city: "Dubai", community: "The Palm Jumeirah", coordinates: { lat: 25.1064, lng: 55.1348 }, status: "Active", logoUrl: "" },
    { name: "Palazzo Versace", category: "Hotel", city: "Dubai", community: "Al Jaddaf", coordinates: { lat: 25.2268, lng: 55.3370 }, status: "Active", logoUrl: "" },
    { name: "Address Downtown", category: "Hotel", city: "Dubai", community: "Downtown Dubai", coordinates: { lat: 25.1942, lng: 55.2783 }, status: "Active", logoUrl: "" },
    { name: "Mandarin Oriental Jumeira", category: "Hotel", city: "Dubai", community: "Jumeirah", coordinates: { lat: 25.2255, lng: 55.2585 }, status: "Active", logoUrl: "" },

    // ==========================================
    // DUBAI - SCHOOLS (10)
    // ==========================================
    { name: "GEMS Wellington International School", category: "School", city: "Dubai", community: "Al Sufouh", coordinates: { lat: 25.1121, lng: 55.1664 }, status: "Active", logoUrl: "" },
    { name: "Dubai International Academy", category: "School", city: "Dubai", community: "Emirates Hills", coordinates: { lat: 25.0765, lng: 55.1631 }, status: "Active", logoUrl: "" },
    { name: "Kings' School Dubai", category: "School", city: "Dubai", community: "Umm Suqeim", coordinates: { lat: 25.1362, lng: 55.1947 }, status: "Active", logoUrl: "" },
    { name: "Dubai College", category: "School", city: "Dubai", community: "Al Sufouh", coordinates: { lat: 25.1052, lng: 55.1643 }, status: "Active", logoUrl: "" },
    { name: "Repton School Dubai", category: "School", city: "Dubai", community: "Nad Al Sheba", coordinates: { lat: 25.1508, lng: 55.3783 }, status: "Active", logoUrl: "" },
    { name: "Nord Anglia International", category: "School", city: "Dubai", community: "Al Barsha", coordinates: { lat: 25.0931, lng: 55.2325 }, status: "Active", logoUrl: "" },
    { name: "Safa Community School", category: "School", city: "Dubai", community: "Al Barsha South", coordinates: { lat: 25.0607, lng: 55.2392 }, status: "Active", logoUrl: "" },
    { name: "JESS Dubai", category: "School", city: "Dubai", community: "Arabian Ranches", coordinates: { lat: 25.0505, lng: 55.2678 }, status: "Active", logoUrl: "" },
    { name: "Sunmarke School", category: "School", city: "Dubai", community: "Jumeirah Village Triangle", coordinates: { lat: 25.0454, lng: 55.1843 }, status: "Active", logoUrl: "" },
    { name: "Regent International School", category: "School", city: "Dubai", community: "The Greens", coordinates: { lat: 25.0945, lng: 55.1742 }, status: "Active", logoUrl: "" },

    // ==========================================
    // DUBAI - HOSPITALS (10)
    // ==========================================
    { name: "Mediclinic City Hospital", category: "Hospital", city: "Dubai", community: "Dubai Healthcare City", coordinates: { lat: 25.2285, lng: 55.3185 }, status: "Active", logoUrl: "" },
    { name: "American Hospital Dubai", category: "Hospital", city: "Dubai", community: "Oud Metha", coordinates: { lat: 25.2323, lng: 55.3134 }, status: "Active", logoUrl: "" },
    { name: "Saudi German Hospital", category: "Hospital", city: "Dubai", community: "Al Barsha", coordinates: { lat: 25.1042, lng: 55.1818 }, status: "Active", logoUrl: "" },
    { name: "King's College Hospital", category: "Hospital", city: "Dubai", community: "Dubai Hills Estate", coordinates: { lat: 25.1095, lng: 55.2492 }, status: "Active", logoUrl: "" },
    { name: "Aster Hospital Mankhool", category: "Hospital", city: "Dubai", community: "Al Mankhool", coordinates: { lat: 25.2515, lng: 55.2917 }, status: "Active", logoUrl: "" },
    { name: "Al Zahra Hospital", category: "Hospital", city: "Dubai", community: "Al Barsha", coordinates: { lat: 25.1118, lng: 55.1951 }, status: "Active", logoUrl: "" },
    { name: "Zulekha Hospital Dubai", category: "Hospital", city: "Dubai", community: "Al Qusais", coordinates: { lat: 25.2811, lng: 55.3789 }, status: "Active", logoUrl: "" },
    { name: "Emirates Hospital Jumeirah", category: "Hospital", city: "Dubai", community: "Jumeirah", coordinates: { lat: 25.2014, lng: 55.2471 }, status: "Active", logoUrl: "" },
    { name: "Fakeeh University Hospital", category: "Hospital", city: "Dubai", community: "Dubai Silicon Oasis", coordinates: { lat: 25.1235, lng: 55.3942 }, status: "Active", logoUrl: "" },
    { name: "Neuro Spinal Hospital", category: "Hospital", city: "Dubai", community: "Dubai Science Park", coordinates: { lat: 25.0841, lng: 55.2415 }, status: "Active", logoUrl: "" }
];

async function seedMassiveLandmarks() {
    console.log(`🚀 Starting BATCH INJECTION of ${premiumLandmarks.length} Premium UAE Landmarks...`);

    let successCount = 0;

    for (const landmark of premiumLandmarks) {
        try {
            // Generates a clean URL slug (e.g., "louvre-abu-dhabi")
            const docId = landmark.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            await db.collection('landmarks').doc(docId).set({
                ...landmark,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`✅ Injected: ${landmark.name} (${landmark.category} - ${landmark.city})`);
            successCount++;
        } catch (error) {
            console.error(`❌ Failed to inject ${landmark.name}:`, error.message);
        }
    }

    console.log(`\n🔥 BOOM! Successfully injected ${successCount} premium landmarks into the database.`);
    process.exit(0);
}

seedMassiveLandmarks();
