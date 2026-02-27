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
        console.log('📡 Fetching projects from live Firestore...');
        const projectsSnapshot = await db.collection('projects').get();

        if (projectsSnapshot.empty) {
            console.log('❌ No projects found in the live database.');
            return;
        }

        const projects = projectsSnapshot.docs.map(doc => doc.data());
        console.log(`✅ Successfully pulled ${projects.length} projects.`);

        // 1. Extract Unique Developers (checking both key variants for compatibility)
        const developers = [...new Set(projects.map(p => p.masterDeveloper || p.developerName).filter(Boolean))];
        console.log(`🚀 Found ${developers.length} unique developers in live data.`);

        // 2. Extract Unique Communities
        const communities = [...new Set(projects.map(p => p.community).filter(Boolean))];
        console.log(`📍 Found ${communities.length} unique communities in live data.`);

        // Batch helper — flushes every 450 writes (safely under Firestore's 500 limit)
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
            console.log(`✨ Successfully synced ${count} items to ${collectionName}.`);
        };

        await commitInBatches(developers, 'entities_developers');
        await commitInBatches(communities, 'locations_communities', true);

    } catch (error) {
        console.error('❌ Error during sync:', error);
    }
};

seedEntities();
