/**
 * PSI MAPS - MEGA LANDMARK INJECTOR
 * Expands existing categories + adds Parks, Beaches, Hypermarkets
 * Run: node scripts/seed-landmarks.cjs
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ ERROR: service-account.json not found in scripts/ directory.');
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

const newLandmarks = [

    // ══════════════════════════════════════════════════════
    // SCHOOLS — 10 new real-world UAE campuses
    // ══════════════════════════════════════════════════════
    { name: 'GEMS World Academy Dubai', category: 'School', city: 'Dubai', community: 'Al Barsha South', latitude: 25.0493, longitude: 55.1976 },
    { name: 'Dubai American Academy', category: 'School', city: 'Dubai', community: 'Al Barsha', latitude: 25.1089, longitude: 55.1850 },
    { name: 'Jumeirah College', category: 'School', city: 'Dubai', community: 'Jumeirah', latitude: 25.1340, longitude: 55.1810 },
    { name: 'GEMS Wellington International School', category: 'School', city: 'Dubai', community: 'Al Quoz', latitude: 25.1435, longitude: 55.2175 },
    { name: 'Repton School Dubai', category: 'School', city: 'Dubai', community: 'Nad Al Sheba', latitude: 25.1573, longitude: 55.3152 },
    { name: 'Nord Anglia International School Dubai', category: 'School', city: 'Dubai', community: 'Al Barsha South', latitude: 25.0462, longitude: 55.1996 },
    { name: 'British School Al Khubairat Abu Dhabi', category: 'School', city: 'Abu Dhabi', community: 'Al Mushrif', latitude: 24.4645, longitude: 54.3613 },
    { name: 'Raha International School', category: 'School', city: 'Abu Dhabi', community: 'Khalifa City A', latitude: 24.4130, longitude: 54.5820 },
    { name: 'Abu Dhabi International School', category: 'School', city: 'Abu Dhabi', community: 'Al Nahyan', latitude: 24.4350, longitude: 54.3780 },
    { name: 'GEMS American Academy Abu Dhabi', category: 'School', city: 'Abu Dhabi', community: 'Khalifa City A', latitude: 24.4200, longitude: 54.5690 },

    // ══════════════════════════════════════════════════════
    // HOSPITALS — 10 new real-world UAE hospitals
    // ══════════════════════════════════════════════════════
    { name: 'Cleveland Clinic Abu Dhabi', category: 'Hospital', city: 'Abu Dhabi', community: 'Al Maryah Island', latitude: 24.4983, longitude: 54.4030 },
    { name: 'Mediclinic City Hospital Dubai', category: 'Hospital', city: 'Dubai', community: 'Dubai Healthcare City', latitude: 25.2262, longitude: 55.3330 },
    { name: 'Aster Hospital Mankhool', category: 'Hospital', city: 'Dubai', community: 'Bur Dubai', latitude: 25.2362, longitude: 55.2865 },
    { name: 'NMC Royal Hospital Abu Dhabi', category: 'Hospital', city: 'Abu Dhabi', community: 'Khalifa City A', latitude: 24.4145, longitude: 54.5792 },
    { name: 'Saudi German Hospital Dubai', category: 'Hospital', city: 'Dubai', community: 'Al Barsha', latitude: 25.1090, longitude: 55.1987 },
    { name: 'Dubai Hospital (DHA)', category: 'Hospital', city: 'Dubai', community: 'Al Baraha', latitude: 25.2699, longitude: 55.3150 },
    { name: 'Rashid Hospital', category: 'Hospital', city: 'Dubai', community: 'Oud Metha', latitude: 25.2371, longitude: 55.3240 },
    { name: 'Burjeel Hospital Abu Dhabi', category: 'Hospital', city: 'Abu Dhabi', community: 'Muroor', latitude: 24.4490, longitude: 54.3753 },
    { name: 'Mediclinic Parkview Hospital', category: 'Hospital', city: 'Dubai', community: 'Umm Suqeim', latitude: 25.0565, longitude: 55.1892 },
    { name: 'Thumbay Hospital Dubai', category: 'Hospital', city: 'Dubai', community: 'Al Qusais', latitude: 25.2835, longitude: 55.3895 },

    // ══════════════════════════════════════════════════════
    // RETAIL (Malls) — 10 new real-world UAE malls
    // ══════════════════════════════════════════════════════
    { name: 'Mall of the Emirates', category: 'Retail', city: 'Dubai', community: 'Al Barsha', latitude: 25.1173, longitude: 55.2001 },
    { name: 'City Centre Mirdif', category: 'Retail', city: 'Dubai', community: 'Mirdif', latitude: 25.2145, longitude: 55.4140 },
    { name: 'City Centre Deira', category: 'Retail', city: 'Dubai', community: 'Deira', latitude: 25.2529, longitude: 55.3310 },
    { name: 'Al Ghurair Centre', category: 'Retail', city: 'Dubai', community: 'Deira', latitude: 25.2648, longitude: 55.3130 },
    { name: 'City Walk Dubai', category: 'Retail', city: 'Dubai', community: 'Al Wasl', latitude: 25.2039, longitude: 55.2512 },
    { name: 'Abu Dhabi Mall', category: 'Retail', city: 'Abu Dhabi', community: 'Al Zahiyah', latitude: 24.4987, longitude: 54.3808 },
    { name: 'Marina Mall Abu Dhabi', category: 'Retail', city: 'Abu Dhabi', community: 'Breakwater', latitude: 24.4873, longitude: 54.3233 },
    { name: 'Yas Mall', category: 'Retail', city: 'Abu Dhabi', community: 'Yas Island', latitude: 24.4870, longitude: 54.6085 },
    { name: 'World Trade Centre Mall', category: 'Retail', city: 'Abu Dhabi', community: 'Al Markaziyah', latitude: 24.4806, longitude: 54.3599 },
    { name: 'Dragon Mart Dubai', category: 'Retail', city: 'Dubai', community: 'International City', latitude: 25.1635, longitude: 55.4180 },

    // ══════════════════════════════════════════════════════
    // LEISURE (Entertainment) — 10 new real-world UAE venues
    // ══════════════════════════════════════════════════════
    { name: 'Atlantis Aquaventure Waterpark', category: 'Leisure', city: 'Dubai', community: 'The Palm Jumeirah', latitude: 25.1301, longitude: 55.1175 },
    { name: 'La Mer Dubai', category: 'Leisure', city: 'Dubai', community: 'Jumeirah', latitude: 25.2166, longitude: 55.2703 },
    { name: 'Global Village Dubai', category: 'Leisure', city: 'Dubai', community: 'Dubailand', latitude: 25.0705, longitude: 55.3049 },
    { name: 'Dubai Frame', category: 'Leisure', city: 'Dubai', community: 'Zabeel', latitude: 25.2348, longitude: 55.2997 },
    { name: 'Dubai Creek Golf & Yacht Club', category: 'Leisure', city: 'Dubai', community: 'Deira', latitude: 25.2352, longitude: 55.3338 },
    { name: 'Ferrari World Abu Dhabi', category: 'Leisure', city: 'Abu Dhabi', community: 'Yas Island', latitude: 24.4836, longitude: 54.6083 },
    { name: 'SeaWorld Abu Dhabi', category: 'Leisure', city: 'Abu Dhabi', community: 'Yas Island', latitude: 24.4822, longitude: 54.6100 },
    { name: 'The Green Planet Dubai', category: 'Leisure', city: 'Dubai', community: 'Al Wasl', latitude: 25.2025, longitude: 55.2524 },
    { name: 'Motiongate Dubai', category: 'Leisure', city: 'Dubai', community: 'Dubai Parks & Resorts', latitude: 24.9218, longitude: 55.0074 },
    { name: 'Al Forsan International Sports Resort', category: 'Leisure', city: 'Abu Dhabi', community: 'Khalifa City A', latitude: 24.4022, longitude: 54.5693 },

    // ══════════════════════════════════════════════════════
    // HOTELS — 10 new real-world UAE luxury hotels
    // ══════════════════════════════════════════════════════
    { name: 'Atlantis The Palm', category: 'Hotel', city: 'Dubai', community: 'The Palm Jumeirah', latitude: 25.1300, longitude: 55.1175 },
    { name: 'Burj Al Arab', category: 'Hotel', city: 'Dubai', community: 'Umm Suqeim', latitude: 25.1412, longitude: 55.1853 },
    { name: 'Four Seasons Resort Dubai', category: 'Hotel', city: 'Dubai', community: 'Jumeirah', latitude: 25.1760, longitude: 55.2295 },
    { name: 'One&Only The Palm', category: 'Hotel', city: 'Dubai', community: 'The Palm Jumeirah', latitude: 25.1012, longitude: 55.1420 },
    { name: 'Sofitel Dubai The Palm', category: 'Hotel', city: 'Dubai', community: 'The Palm Jumeirah', latitude: 25.1139, longitude: 55.1303 },
    { name: 'Emirates Palace Mandarin Oriental', category: 'Hotel', city: 'Abu Dhabi', community: 'Al Ras Al Akhdar', latitude: 24.4619, longitude: 54.3172 },
    { name: 'St. Regis Abu Dhabi', category: 'Hotel', city: 'Abu Dhabi', community: 'Al Maryah Island', latitude: 24.4979, longitude: 54.4013 },
    { name: 'Four Seasons Abu Dhabi', category: 'Hotel', city: 'Abu Dhabi', community: 'Al Maryah Island', latitude: 24.5013, longitude: 54.4049 },
    { name: 'Park Hyatt Abu Dhabi', category: 'Hotel', city: 'Abu Dhabi', community: 'Saadiyat Island', latitude: 24.5457, longitude: 54.4285 },
    { name: 'Fairmont Bab Al Bahr', category: 'Hotel', city: 'Abu Dhabi', community: 'Khor Al Maqta', latitude: 24.4091, longitude: 54.4916 },

    // ══════════════════════════════════════════════════════
    // CULTURE — 10 new real-world UAE cultural landmarks
    // ══════════════════════════════════════════════════════
    { name: 'Etihad Museum Dubai', category: 'Culture', city: 'Dubai', community: 'Jumeirah', latitude: 25.2180, longitude: 55.2625 },
    { name: 'Dubai Opera', category: 'Culture', city: 'Dubai', community: 'Downtown Dubai', latitude: 25.1952, longitude: 55.2789 },
    { name: 'Dubai Museum (Al Fahidi Fort)', category: 'Culture', city: 'Dubai', community: 'Al Fahidi', latitude: 25.2636, longitude: 55.2975 },
    { name: 'Al Hosn Palace (Qasr Al Hosn)', category: 'Culture', city: 'Abu Dhabi', community: 'Al Markaziyah', latitude: 24.4827, longitude: 54.3553 },
    { name: 'Alserkal Avenue', category: 'Culture', city: 'Dubai', community: 'Al Quoz', latitude: 25.1385, longitude: 55.2215 },
    { name: 'Guggenheim Abu Dhabi (under construction)', category: 'Culture', city: 'Abu Dhabi', community: 'Saadiyat Island', latitude: 24.5400, longitude: 54.4100 },
    { name: 'Dubai Design District (d3)', category: 'Culture', city: 'Dubai', community: 'Business Bay', latitude: 25.1894, longitude: 55.2871 },
    { name: 'Manarat Al Saadiyat', category: 'Culture', city: 'Abu Dhabi', community: 'Saadiyat Island', latitude: 24.5387, longitude: 54.4318 },
    { name: 'Coffee Museum Dubai', category: 'Culture', city: 'Dubai', community: 'Al Fahidi', latitude: 25.2640, longitude: 55.2999 },
    { name: 'Zayed National Museum', category: 'Culture', city: 'Abu Dhabi', community: 'Saadiyat Island', latitude: 24.5358, longitude: 54.4090 },

    // ══════════════════════════════════════════════════════
    // PARKS — 10 brand-new category: Public Green Spaces
    // ══════════════════════════════════════════════════════
    { name: 'Safa Park Dubai', category: 'Park', city: 'Dubai', community: 'Al Wasl', latitude: 25.1895, longitude: 55.2382 },
    { name: 'Zabeel Park', category: 'Park', city: 'Dubai', community: 'Zabeel', latitude: 25.2360, longitude: 55.2978 },
    { name: 'Al Barsha Pond Park', category: 'Park', city: 'Dubai', community: 'Al Barsha', latitude: 25.0940, longitude: 55.1895 },
    { name: 'Creek Park Dubai', category: 'Park', city: 'Dubai', community: 'Umm Hurair', latitude: 25.2246, longitude: 55.3245 },
    { name: 'Mushrif Park Dubai', category: 'Park', city: 'Dubai', community: 'Mirdif', latitude: 25.2150, longitude: 55.4230 },
    { name: 'Umm Al Emarat Park', category: 'Park', city: 'Abu Dhabi', community: 'Muroor', latitude: 24.4517, longitude: 54.4014 },
    { name: 'Khalifa Park Abu Dhabi', category: 'Park', city: 'Abu Dhabi', community: 'Al Mushrif', latitude: 24.4555, longitude: 54.4202 },
    { name: 'Corniche Promenade Park', category: 'Park', city: 'Abu Dhabi', community: 'Corniche Road', latitude: 24.4657, longitude: 54.3413 },
    { name: 'Al Ain Oasis', category: 'Park', city: 'Al Ain', community: 'Al Ain City', latitude: 24.2176, longitude: 55.7604 },
    { name: 'Al Mamzar Beach Park', category: 'Park', city: 'Dubai', community: 'Al Mamzar', latitude: 25.2919, longitude: 55.3512 },

    // ══════════════════════════════════════════════════════
    // BEACHES — 10 brand-new category: UAE Public Beaches
    // ══════════════════════════════════════════════════════
    { name: 'JBR Beach (The Beach)', category: 'Beach', city: 'Dubai', community: 'Jumeirah Beach Residence', latitude: 25.0775, longitude: 55.1327 },
    { name: 'Kite Beach Dubai', category: 'Beach', city: 'Dubai', community: 'Umm Suqeim', latitude: 25.1021, longitude: 55.1686 },
    { name: 'Jumeirah Public Beach', category: 'Beach', city: 'Dubai', community: 'Jumeirah', latitude: 25.1917, longitude: 55.2285 },
    { name: 'Sunset Beach Dubai', category: 'Beach', city: 'Dubai', community: 'Umm Suqeim', latitude: 25.1147, longitude: 55.1804 },
    { name: 'Al Mamzar Beach', category: 'Beach', city: 'Dubai', community: 'Al Mamzar', latitude: 25.2896, longitude: 55.3478 },
    { name: 'Saadiyat Public Beach', category: 'Beach', city: 'Abu Dhabi', community: 'Saadiyat Island', latitude: 24.5512, longitude: 54.4268 },
    { name: 'Corniche Beach Abu Dhabi', category: 'Beach', city: 'Abu Dhabi', community: 'Al Markaziyah', latitude: 24.4722, longitude: 54.3356 },
    { name: 'Yas Beach Abu Dhabi', category: 'Beach', city: 'Abu Dhabi', community: 'Yas Island', latitude: 24.4762, longitude: 54.5975 },
    { name: 'Hudayriat Island Beach', category: 'Beach', city: 'Abu Dhabi', community: 'Hudayriat Island', latitude: 24.3887, longitude: 54.4535 },
    { name: 'Al Bateen Beach Abu Dhabi', category: 'Beach', city: 'Abu Dhabi', community: 'Al Bateen', latitude: 24.4421, longitude: 54.3089 },

    // ══════════════════════════════════════════════════════
    // HYPERMARKETS — 10 brand-new category: UAE Grocery Giants
    // ══════════════════════════════════════════════════════
    { name: 'Carrefour Mall of the Emirates', category: 'Hypermarket', city: 'Dubai', community: 'Al Barsha', latitude: 25.1181, longitude: 55.2008 },
    { name: 'Carrefour Festival City', category: 'Hypermarket', city: 'Dubai', community: 'Dubai Festival City', latitude: 25.2219, longitude: 55.3512 },
    { name: 'Lulu Hypermarket Al Barsha', category: 'Hypermarket', city: 'Dubai', community: 'Al Barsha', latitude: 25.1135, longitude: 55.1948 },
    { name: 'Lulu Hypermarket Al Qusais', category: 'Hypermarket', city: 'Dubai', community: 'Al Qusais', latitude: 25.2710, longitude: 55.3815 },
    { name: 'Lulu Hypermarket Khalidiyah', category: 'Hypermarket', city: 'Abu Dhabi', community: 'Al Khalidiyah', latitude: 24.4808, longitude: 54.3509 },
    { name: 'Spinneys Jumeirah (Beach Road)', category: 'Hypermarket', city: 'Dubai', community: 'Jumeirah', latitude: 25.2013, longitude: 55.2422 },
    { name: 'Waitrose Dubai Mall', category: 'Hypermarket', city: 'Dubai', community: 'Downtown Dubai', latitude: 25.1978, longitude: 55.2779 },
    { name: 'Carrefour Yas Mall Abu Dhabi', category: 'Hypermarket', city: 'Abu Dhabi', community: 'Yas Island', latitude: 24.4862, longitude: 54.6080 },
    { name: 'Geant Hypermarket Ibn Battuta Mall', category: 'Hypermarket', city: 'Dubai', community: 'Jebel Ali', latitude: 25.0448, longitude: 55.1198 },
    { name: 'Carrefour Deira City Centre', category: 'Hypermarket', city: 'Dubai', community: 'Deira', latitude: 25.2526, longitude: 55.3318 },
];

async function seedExpansion() {
    console.log(`\n🚀 PSI MAPS — MEGA LANDMARK EXPANSION`);
    console.log(`📦 Injecting ${newLandmarks.length} new real-world locations across 9 categories...\n`);

    let ok = 0;
    let fail = 0;

    for (const landmark of newLandmarks) {
        try {
            const docId = landmark.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
            await db.collection('landmarks').doc(docId).set({
                ...landmark,
                isHidden: false,
                status: 'Active',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`  ✅ [${landmark.category.padEnd(12)}] ${landmark.name} — ${landmark.city}`);
            ok++;
        } catch (err) {
            console.error(`  ❌ FAILED: ${landmark.name}:`, err.message);
            fail++;
        }
    }

    const byCategory = newLandmarks.reduce((acc, l) => {
        acc[l.category] = (acc[l.category] || 0) + 1;
        return acc;
    }, {});

    console.log('\n══════════════════════════════════════════');
    console.log(`🔥 DONE: ${ok} injected | ${fail} failed`);
    console.log('\n📊 Breakdown by category:');
    Object.entries(byCategory).forEach(([cat, count]) => {
        console.log(`   ${cat.padEnd(14)} ${count} locations`);
    });
    console.log('══════════════════════════════════════════\n');
    process.exit(0);
}

seedExpansion();