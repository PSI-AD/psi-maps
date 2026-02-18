const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');
const rawData = require('../data/master_projects.json');
const projects = rawData.result || rawData;

console.log(`🔍 Inspecting data structure... Found ${projects.length || 0} items.`);

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const generateCleanId = (project) => {
    const name = project.name || 'untitled-project';
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const seedDatabase = async () => {
    try {
        console.log(`🚀 Starting seeding process for ${projects.length} projects...`);

        // Sets for unique values
        const cities = new Set();
        const communities = new Set();
        const developers = new Set();

        let successCount = 0;

        for (const project of projects) {
            // Priority: slug -> propertyID -> skip
            const docId = project.slug || String(project.propertyID);

            if (!docId || docId === 'null' || docId === 'undefined') {
                console.warn(`⚠️ Skipping project (missing ID): ${JSON.stringify(project).substring(0, 50)}...`);
                continue;
            }

            // Extract Metadata for Taxonomy Collections
            if (project.city) cities.add(project.city);
            if (project.community) communities.add(project.community);
            if (project.masterDeveloper) developers.add(project.masterDeveloper);

            // Upload Project (Full Object)
            await db.collection('projects').doc(docId).set({
                ...project,
                id: docId,
                lastSynced: new Date().toISOString()
            }, { merge: true });

            successCount++;
            if (successCount % 10 === 0) process.stdout.write('.');
        }

        console.log(`\n✅ Successfully synced ${successCount} projects to Firestore.`);

        // Upload Meta Collections
        console.log('📦 Syncing Metadata Collections...');

        const cleanKey = (str) => str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

        for (const city of cities) {
            if (city) await db.collection('locations_cities').doc(cleanKey(city)).set({ name: city }, { merge: true });
        }
        for (const comm of communities) {
            if (comm) await db.collection('locations_communities').doc(cleanKey(comm)).set({ name: comm }, { merge: true });
        }
        for (const dev of developers) {
            if (dev) await db.collection('entities_developers').doc(cleanKey(dev)).set({ name: dev }, { merge: true });
        }

        console.log('🎉 Seeding Complete!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Seeding Failed:', error);
        process.exit(1);
    }
};

seedDatabase();
