/**
 * PSI MAPS — TOP DUBAI TOURIST ATTRACTION INJECTOR
 * Adds curated Top-100 entries across Parks, Beaches, Leisure, Culture, Retail, Hotels.
 * Entries already seeded in the previous batch are skipped here to keep data clean.
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

const curated = [

    // ══════════════════════════════════════════════════════
    // PARKS — curated additions (Safa, Zabeel, Al Barsha Pond already seeded)
    // ══════════════════════════════════════════════════════
    {
        name: 'Quranic Park Dubai',
        category: 'Park', city: 'Dubai', community: 'Al Khail',
        latitude: 25.1988, longitude: 55.2685,
    },
    {
        name: 'JLT Lake Park',
        category: 'Park', city: 'Dubai', community: 'Jumeirah Lake Towers',
        latitude: 25.0674, longitude: 55.1426,
    },
    {
        name: 'Burj Park Lawn',
        category: 'Park', city: 'Dubai', community: 'Downtown Dubai',
        latitude: 25.1939, longitude: 55.2761,
    },

    // ══════════════════════════════════════════════════════
    // BEACHES — curated additions (Kite Beach, JBR already seeded)
    // ══════════════════════════════════════════════════════
    {
        name: 'Palm West Beach',
        category: 'Beach', city: 'Dubai', community: 'Palm Jumeirah',
        latitude: 25.1028, longitude: 55.1395,
    },
    {
        name: 'Al Sufouh Beach (Secret Beach)',
        category: 'Beach', city: 'Dubai', community: 'Al Sufouh',
        latitude: 25.0845, longitude: 55.1547,
    },
    {
        name: 'La Mer Beach',
        category: 'Beach', city: 'Dubai', community: 'La Mer, Jumeirah',
        latitude: 25.2305, longitude: 55.2617,
    },

    // ══════════════════════════════════════════════════════
    // LEISURE — curated additions (IMG, Motiongate, Global Village, Ski Dubai already seeded)
    // ══════════════════════════════════════════════════════
    {
        name: 'VR Park Dubai',
        category: 'Leisure', city: 'Dubai', community: 'Downtown Dubai',
        latitude: 25.1979, longitude: 55.2797,
    },
    {
        name: 'Dubai Dolphinarium',
        category: 'Leisure', city: 'Dubai', community: 'Umm Hurair',
        latitude: 25.2245, longitude: 55.3269,
    },

    // ══════════════════════════════════════════════════════
    // CULTURE — curated additions (Alserkal already seeded)
    // ══════════════════════════════════════════════════════
    {
        name: 'Al Fahidi Historical Neighbourhood',
        category: 'Culture', city: 'Dubai', community: 'Al Fahidi',
        latitude: 25.2641, longitude: 55.2970,
    },
    {
        name: 'Al Seef Heritage Promenade',
        category: 'Culture', city: 'Dubai', community: 'Al Seef',
        latitude: 25.2533, longitude: 55.3012,
    },
    {
        name: 'Jumeirah Mosque',
        category: 'Culture', city: 'Dubai', community: 'Jumeirah',
        latitude: 25.2200, longitude: 55.2587,
    },
    {
        name: 'Shindagha Heritage District',
        category: 'Culture', city: 'Dubai', community: 'Al Shindagha',
        latitude: 25.2704, longitude: 55.2961,
    },
    {
        name: 'Museum of the Future',
        category: 'Culture', city: 'Dubai', community: 'Sheikh Zayed Road',
        latitude: 25.2196, longitude: 55.2706,
    },

    // ══════════════════════════════════════════════════════
    // RETAIL — curated additions (Nakheel Mall, Ibn Battuta, City Walk, Dragon Mart already seeded)
    // ══════════════════════════════════════════════════════
    {
        name: 'Boxpark Dubai',
        category: 'Retail', city: 'Dubai', community: 'Al Wasl',
        latitude: 25.1847, longitude: 55.2598,
    },
    {
        name: 'Souk Madinat Jumeirah',
        category: 'Retail', city: 'Dubai', community: 'Umm Suqeim',
        latitude: 25.1317, longitude: 55.1843,
    },

    // ══════════════════════════════════════════════════════
    // HOTELS — curated additions (Burj Al Arab, Atlantis already seeded)
    // ══════════════════════════════════════════════════════
    {
        name: 'Jumeirah Beach Hotel',
        category: 'Hotel', city: 'Dubai', community: 'Umm Suqeim',
        latitude: 25.1379, longitude: 55.1874,
    },
    {
        name: 'Address Sky View Dubai',
        category: 'Hotel', city: 'Dubai', community: 'Downtown Dubai',
        latitude: 25.1983, longitude: 55.2765,
    },
    {
        name: 'Armani Hotel Dubai',
        category: 'Hotel', city: 'Dubai', community: 'Downtown Dubai',
        latitude: 25.1970, longitude: 55.2742,
    },
];

async function seedCurated() {
    console.log(`\n🌟 PSI MAPS — TOP DUBAI CURATED ATTRACTIONS`);
    console.log(`📦 Injecting ${curated.length} hand-picked landmark additions...\n`);

    let ok = 0;
    let fail = 0;

    for (const landmark of curated) {
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

            console.log(`  ✅ [${landmark.category.padEnd(12)}] ${landmark.name}`);
            ok++;
        } catch (err) {
            console.error(`  ❌ FAILED: ${landmark.name}:`, err.message);
            fail++;
        }
    }

    const byCategory = curated.reduce((acc, l) => {
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

seedCurated();