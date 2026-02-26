const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin (Uses default credentials like seed.cjs)
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
}
const db = admin.firestore();

const seedEntities = async () => {
    try {
        const projectsPath = path.join(__dirname, '../data/master_projects.json');
        const projectsData = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));

        // Extract unique developers
        const developers = [...new Set(projectsData.map(p => p.developerName).filter(Boolean))];
        console.log(`Found ${developers.length} unique developers.`);

        // Extract unique communities
        const communities = [...new Set(projectsData.map(p => p.community).filter(Boolean))];
        console.log(`Found ${communities.length} unique communities.`);

        // Batch write Developers
        let devBatch = db.batch();
        developers.forEach(name => {
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const ref = db.collection('entities_developers').doc(slug);
            devBatch.set(ref, { name, logoUrl: `https://www.google.com/s2/favicons?domain=${name.toLowerCase().replace(/\s+/g, '')}.com&sz=128`, description: '' }, { merge: true });
        });
        await devBatch.commit();
        console.log('Successfully seeded Developers!');

        // Batch write Communities
        let commBatch = db.batch();
        communities.forEach(name => {
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const ref = db.collection('locations_communities').doc(slug);
            // Try to find an associated city from the first project in that community
            const sampleProj = projectsData.find(p => p.community === name);
            commBatch.set(ref, { name, city: sampleProj?.city || 'Abu Dhabi', imageUrl: '', description: '' }, { merge: true });
        });
        await commBatch.commit();
        console.log('Successfully seeded Communities!');

    } catch (error) {
        console.error('Error seeding entities:', error);
    }
};

seedEntities();
