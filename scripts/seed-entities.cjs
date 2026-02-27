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

        // Access the 'result' array which contains the projects
        const projectsData = Array.isArray(rawData.result) ? rawData.result : [];

        if (projectsData.length === 0) {
            console.error("❌ No projects found in the 'result' array of the JSON file.");
            return;
        }
        console.log(`📦 Loaded ${projectsData.length} projects from JSON.`);

        // 1. Extract and Clean Unique Developers
        const developers = [...new Set(projectsData.map(p => p.masterDeveloper).filter(Boolean))];
        console.log(`🚀 Found ${developers.length} unique developers in JSON.`);

        // 2. Extract and Clean Unique Communities
        const communities = [...new Set(projectsData.map(p => p.community).filter(Boolean))];
        console.log(`📍 Found ${communities.length} unique communities in JSON.`);

        // Helper: process items in batches of 450 (safely under the 500 Firestore limit)
        const commitInBatches = async (items, collectionName, isCommunity = false) => {
            let count = 0;
            let batch = db.batch();

            for (const name of items) {
                const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const ref = db.collection(collectionName).doc(slug);

                const data = isCommunity ? {
                    name,
                    city: projectsData.find(p => p.community === name)?.city || 'Abu Dhabi',
                    imageUrl: '',
                    description: ''
                } : {
                    name,
                    logoUrl: `https://www.google.com/s2/favicons?domain=${name.toLowerCase().replace(/\s+/g, '')}.com&sz=128`,
                    description: ''
                };

                batch.set(ref, data, { merge: true });
                count++;

                if (count % 450 === 0) {
                    await batch.commit();
                    batch = db.batch();
                    console.log(`✅ Progress: Committed ${count} items to ${collectionName}...`);
                }
            }

            await batch.commit(); // Commit final remainder
            console.log(`✨ Total ${count} records seeded to ${collectionName}.`);
        };

        // Run seeding
        await commitInBatches(developers, 'entities_developers');
        await commitInBatches(communities, 'locations_communities', true);

    } catch (error) {
        console.error('❌ Error seeding entities:', error);
    }
};

seedEntities();
