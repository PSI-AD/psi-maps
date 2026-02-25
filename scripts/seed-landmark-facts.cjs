// scripts/seed-landmark-facts.cjs
// Seeds Burj Khalifa and Louvre Abu Dhabi in Firestore with hero images & fun facts.
//
// Usage:  node scripts/seed-landmark-facts.cjs
// Prereq: scripts/serviceAccountKey.json must exist (Firebase Console → Service Accounts)

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const LANDMARK_PAYLOADS = [
    {
        // Query key — must match the `name` field stored in Firestore for this landmark
        nameMatch: 'Burj Khalifa',
        imageUrl:
            'https://images.unsplash.com/photo-1597659840241-37e2b9c2f55f?q=80&w=1200&auto=format&fit=crop',
        facts: [
            'Standing at 828 meters, it is the tallest building in the world, piercing the clouds of Dubai.',
            'The unique Y-shaped structural design is inspired by the Spider Lily, a regional desert flower.',
            'It takes a dedicated team approximately 3 months to clean all 24,000+ windows from the top down.',
            'The elevators are among the fastest in the world, travelling at blistering speeds of 10 metres per second.',
            'At its peak, the tower is designed to sway roughly 1.5 metres in the wind to prevent structural damage.',
        ],
    },
    {
        nameMatch: 'Louvre Abu Dhabi',
        imageUrl:
            'https://images.unsplash.com/photo-1616423640778-28d1b53229bd?q=80&w=1200&auto=format&fit=crop',
        facts: [
            "The 'rain of light' dome weighs 7,500 tons — almost exactly the same as the Eiffel Tower in Paris.",
            'The intricate dome consists of 7,850 unique metal stars set in a complex, overlapping geometric pattern.',
            'It is the first universal museum in the Arab world, born from an unprecedented UAE–France cultural agreement.',
            'The museum appears to float on the waters of Saadiyat Island, blending sky, water, and sand seamlessly.',
            'It features a micro-climate under the dome, naturally cooling outdoor plazas by up to 5 degrees Celsius.',
        ],
    },
];

async function run() {
    const snapshot = await db.collection('landmarks').get();
    let updatedCount = 0;

    for (const payload of LANDMARK_PAYLOADS) {
        // Case-insensitive name match
        const match = snapshot.docs.find(
            (d) => d.data().name?.toLowerCase() === payload.nameMatch.toLowerCase()
        );

        if (!match) {
            console.log(`⚠️  No landmark found matching name: "${payload.nameMatch}"`);
            continue;
        }

        await db.collection('landmarks').doc(match.id).update({
            imageUrl: payload.imageUrl,
            facts: payload.facts,
        });

        console.log(`✅  Updated "${payload.nameMatch}" (doc: ${match.id})`);
        updatedCount++;
    }

    console.log(`\n🎉 Done! Updated ${updatedCount} / ${LANDMARK_PAYLOADS.length} landmarks.`);
    process.exit(0);
}

run().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
