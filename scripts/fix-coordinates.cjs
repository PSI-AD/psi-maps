const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = require(path.join(__dirname, 'service-account.json'));

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function fixCoordinates() {
    console.log("🛠️ Fixing coordinate formats for all landmarks...");
    const snapshot = await db.collection('landmarks').get();
    let fixedCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        // If the data has my nested coordinates, pull them out to the root level
        if (data.coordinates && data.coordinates.lat) {
            await doc.ref.update({
                latitude: data.coordinates.lat,
                longitude: data.coordinates.lng
            });
            fixedCount++;
        }
    }
    console.log(`✅ Success! Instantly fixed ${fixedCount} landmarks. Refresh your Admin panel!`);
}

fixCoordinates();
