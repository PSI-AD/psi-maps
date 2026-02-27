const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin using local service account (matches other seed scripts)
const serviceAccount = require('../service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

const seedEntities = async () => {
    try {
        const projectsPath = path.join(__dirname, '../data/master_projects.json');
        const rawData = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));

        // Target the 'result' array where the real data is stored
        const projects = Array.isArray(rawData.result) ? rawData.result : [];

        if (projects.length === 0) {
            console.log("❌ The JSON file appears to be empty or missing the 'result' array.");
            return;
        }
        console.log(`📦 Loaded ${projects.length} projects from JSON.`);

        // 1. Extract Unique Developers (using 'masterDeveloper' key)
        const developers = [...new Set(projects.map(p => p.masterDeveloper).filter(Boolean))];
        console.log(`🚀 Found ${developers.length} unique developers.`);

        // 2. Extract Unique Communities
        const communities = [...new Set(projects.map(p => p.community).filter(Boolean))];
        console.log(`📍 Found ${communities.length} unique communities.`);

        // Batch helper — flushes every 450 writes (under Firestore's 500 limit)
        const commitInBatches = async (items, collectionName, isCommunity = false) => {
            let count = 0;
            let batch = db.batch();

            for (const name of items) {
                const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const ref = db.collection(collectionName).doc(slug);

                const data = isCommunity ? {
                    name,
                    city: projects.find(p => p.community === name)?.city || 'Abu Dhabi',
                    isActive: true
                } : {
                    name,
                    logoUrl: `https://www.google.com/s2/favicons?domain=${name.toLowerCase().replace(/\s+/g, '')}.com&sz=128`,
                    isActive: true
                };

                batch.set(ref, data, { merge: true });
                count++;

                if (count % 450 === 0) {
                    await batch.commit();
                    batch = db.batch();
                    console.log(`✅ Progress: Committed ${count} items to ${collectionName}...`);
                }
            }
            await batch.commit();
            console.log(`✨ Seeded ${count} items to ${collectionName}.`);
        };

        await commitInBatches(developers, 'entities_developers');
        await commitInBatches(communities, 'locations_communities', true);

    } catch (error) {
        console.error('❌ Error:', error);
    }
};

seedEntities();
