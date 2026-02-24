/**
 * PSI MAPS — ABU DHABI PREMIUM DESTINATIONS INJECTOR
 * 30 curated Abu Dhabi landmarks across Parks, Beaches, Leisure, Culture, Retail, Hotels.
 * Firestore .set() = upsert — safe to run even if some docs already exist.
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

const abuDhabiLandmarks = [

    // ═══════════════════════════════════════════════════════
    // PARKS
    // ═══════════════════════════════════════════════════════
    {
        name: 'Umm Al Emarat Park',
        category: 'Park', city: 'Abu Dhabi', community: 'Muroor',
        latitude: 24.4517, longitude: 54.4014,
    },
    {
        name: 'Jubail Mangrove Park',
        category: 'Park', city: 'Abu Dhabi', community: 'Jubail Island',
        latitude: 24.5125, longitude: 54.4217,
    },
    {
        name: 'Reem Central Park',
        category: 'Park', city: 'Abu Dhabi', community: 'Al Reem Island',
        latitude: 24.4950, longitude: 54.4043,
    },
    {
        name: 'Yas Gateway Park',
        category: 'Park', city: 'Abu Dhabi', community: 'Yas Island',
        latitude: 24.4836, longitude: 55.6084,
    },
    {
        name: 'Khalifa Park',
        category: 'Park', city: 'Abu Dhabi', community: 'Al Mushrif',
        latitude: 24.4555, longitude: 54.4202,
    },

    // ═══════════════════════════════════════════════════════
    // BEACHES
    // ═══════════════════════════════════════════════════════
    {
        name: 'Saadiyat Public Beach',
        category: 'Beach', city: 'Abu Dhabi', community: 'Saadiyat Island',
        latitude: 24.5512, longitude: 54.4268,
    },
    {
        name: 'Corniche Beach Abu Dhabi',
        category: 'Beach', city: 'Abu Dhabi', community: 'Al Markaziyah',
        latitude: 24.4722, longitude: 54.3356,
    },
    {
        name: 'Yas Beach Abu Dhabi',
        category: 'Beach', city: 'Abu Dhabi', community: 'Yas Island',
        latitude: 24.4762, longitude: 54.5975,
    },
    {
        name: 'Mamsha Beach (Soul Beach)',
        category: 'Beach', city: 'Abu Dhabi', community: 'Al Reem Island',
        latitude: 24.5060, longitude: 54.4115,
    },
    {
        name: 'Al Bateen Beach Abu Dhabi',
        category: 'Beach', city: 'Abu Dhabi', community: 'Al Bateen',
        latitude: 24.4421, longitude: 54.3089,
    },

    // ═══════════════════════════════════════════════════════
    // LEISURE
    // ═══════════════════════════════════════════════════════
    {
        name: 'Ferrari World Abu Dhabi',
        category: 'Leisure', city: 'Abu Dhabi', community: 'Yas Island',
        latitude: 24.4836, longitude: 54.6083,
    },
    {
        name: 'Warner Bros. World Abu Dhabi',
        category: 'Leisure', city: 'Abu Dhabi', community: 'Yas Island',
        latitude: 24.4905, longitude: 54.5983,
    },
    {
        name: 'SeaWorld Abu Dhabi',
        category: 'Leisure', city: 'Abu Dhabi', community: 'Yas Island',
        latitude: 24.4822, longitude: 54.6100,
    },
    {
        name: 'Yas Waterworld',
        category: 'Leisure', city: 'Abu Dhabi', community: 'Yas Island',
        latitude: 24.4844, longitude: 54.5986,
    },
    {
        name: 'Snow Abu Dhabi',
        category: 'Leisure', city: 'Abu Dhabi', community: 'Al Reem Island',
        latitude: 24.4963, longitude: 54.3889,
    },

    // ═══════════════════════════════════════════════════════
    // CULTURE
    // ═══════════════════════════════════════════════════════
    {
        name: 'Sheikh Zayed Grand Mosque',
        category: 'Culture', city: 'Abu Dhabi', community: 'Abu Dhabi Gate City',
        latitude: 24.4128, longitude: 54.4750,
    },
    {
        name: 'Louvre Abu Dhabi',
        category: 'Culture', city: 'Abu Dhabi', community: 'Saadiyat Island',
        latitude: 24.5338, longitude: 54.3983,
    },
    {
        name: 'Qasr Al Watan',
        category: 'Culture', city: 'Abu Dhabi', community: 'Al Ras Al Akhdar',
        latitude: 24.4618, longitude: 54.3171,
    },
    {
        name: 'Abrahamic Family House',
        category: 'Culture', city: 'Abu Dhabi', community: 'Saadiyat Island',
        latitude: 24.5302, longitude: 54.4296,
    },
    {
        name: 'Heritage Village Abu Dhabi',
        category: 'Culture', city: 'Abu Dhabi', community: 'Al Bateen',
        latitude: 24.4657, longitude: 54.3132,
    },

    // ═══════════════════════════════════════════════════════
    // RETAIL
    // ═══════════════════════════════════════════════════════
    {
        name: 'Yas Mall',
        category: 'Retail', city: 'Abu Dhabi', community: 'Yas Island',
        latitude: 24.4870, longitude: 54.6085,
    },
    {
        name: 'The Galleria Al Maryah Island',
        category: 'Retail', city: 'Abu Dhabi', community: 'Al Maryah Island',
        latitude: 24.5007, longitude: 54.4023,
    },
    {
        name: 'Marina Mall Abu Dhabi',
        category: 'Retail', city: 'Abu Dhabi', community: 'Breakwater',
        latitude: 24.4873, longitude: 54.3233,
    },
    {
        name: 'Abu Dhabi Mall',
        category: 'Retail', city: 'Abu Dhabi', community: 'Al Zahiyah',
        latitude: 24.4987, longitude: 54.3808,
    },
    {
        name: 'Dalma Mall',
        category: 'Retail', city: 'Abu Dhabi', community: 'Mussafah',
        latitude: 24.3560, longitude: 54.5145,
    },

    // ═══════════════════════════════════════════════════════
    // HOTELS
    // ═══════════════════════════════════════════════════════
    {
        name: 'Emirates Palace Mandarin Oriental',
        category: 'Hotel', city: 'Abu Dhabi', community: 'Al Ras Al Akhdar',
        latitude: 24.4619, longitude: 54.3172,
    },
    {
        name: 'The St. Regis Saadiyat Island Resort',
        category: 'Hotel', city: 'Abu Dhabi', community: 'Saadiyat Island',
        latitude: 24.5452, longitude: 54.4275,
    },
    {
        name: 'W Abu Dhabi Yas Island',
        category: 'Hotel', city: 'Abu Dhabi', community: 'Yas Island',
        latitude: 24.4758, longitude: 54.5944,
    },
    {
        name: 'Park Hyatt Abu Dhabi',
        category: 'Hotel', city: 'Abu Dhabi', community: 'Saadiyat Island',
        latitude: 24.5457, longitude: 54.4285,
    },
    {
        name: 'Rosewood Abu Dhabi',
        category: 'Hotel', city: 'Abu Dhabi', community: 'Al Maryah Island',
        latitude: 24.5023, longitude: 54.4052,
    },
];

async function seedAbuDhabi() {
    console.log('\n🏛️  PSI MAPS — ABU DHABI PREMIUM DESTINATIONS');
    console.log(`📦 Injecting ${abuDhabiLandmarks.length} curated Abu Dhabi landmarks...\n`);

    let ok = 0;
    let fail = 0;

    for (const landmark of abuDhabiLandmarks) {
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

            console.log(`  ✅ [${landmark.category.padEnd(10)}] ${landmark.name}`);
            ok++;
        } catch (err) {
            console.error(`  ❌ FAILED: ${landmark.name}:`, err.message);
            fail++;
        }
    }

    const byCategory = abuDhabiLandmarks.reduce((acc, l) => {
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

seedAbuDhabi();