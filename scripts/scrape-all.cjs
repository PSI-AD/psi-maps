const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const SITEMAP_URL = 'https://www.psinv.net/sitemap.xml';
const API_BASE_URL = 'https://www.psinv.net/api/external/allprojects';

// Helper: Clean ID Generation (Consistent with seed.cjs)
const cleanKey = (str) => str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const scrapeAndSync = async () => {
    try {
        console.log(`🚀 Starting sitemap scrape from: ${SITEMAP_URL}`);

        // 1. Fetch Sitemap
        const response = await fetch(SITEMAP_URL);
        const sitemapText = await response.text();

        // 2. Parse Slugs via Regex
        const slugRegex = /<loc>https:\/\/www\.psinv\.net\/en\/projects\/([^<]+)<\/loc>/g;
        const slugs = new Set();
        let match;

        while ((match = slugRegex.exec(sitemapText)) !== null) {
            if (match[1]) {
                const rawPath = match[1];
                const parts = rawPath.split('/');
                let cleanSlug = "";

                // Logic: The project name usually follows "subcommunity"
                // e.g. /projects/abu-dhabi/al-reem-island/subcommunity/marina-heights-1/payment-plan
                const subIndex = parts.indexOf('subcommunity');
                if (subIndex !== -1 && parts.length > subIndex + 1) {
                    cleanSlug = parts[subIndex + 1];
                } else {
                    // Fallback: Remove known sub-pages and grab the last segment
                    const ignoreList = ['payment-plan', 'photo-gallery', 'faqs', 'floor-plan', 'location-map', 'video-tour', 'brochure', 'amenities'];
                    const filteredParts = parts.filter(p => !ignoreList.includes(p));
                    if (filteredParts.length > 0) {
                        cleanSlug = filteredParts[filteredParts.length - 1];
                    }
                }

                if (cleanSlug) {
                    slugs.add(cleanSlug);
                }
            }
        }

        console.log(`✅ Found ${slugs.size} unique project slugs in sitemap.`);

        // 3. Iterate and Sync
        let successCount = 0;
        let errorCount = 0;
        let index = 0;
        const total = slugs.size;

        for (const slug of slugs) {
            index++;
            // Rate Limiting Delay
            await new Promise(r => setTimeout(r, 500));

            try {
                // Fix: API expects spaces, not hyphens
                const cleanName = slug.replace(/-/g, ' ');
                const apiUrl = `${API_BASE_URL}?page=1&propertyname=${encodeURIComponent(cleanName)}`;
                const apiRes = await fetch(apiUrl);
                const apiJson = await apiRes.json();

                if (apiJson.result && Array.isArray(apiJson.result) && apiJson.result.length > 0) {
                    const project = apiJson.result[0];
                    const docId = project.slug || slug || String(project.propertyID);

                    // Upload Project
                    await db.collection('projects').doc(docId).set({
                        ...project,
                        id: docId,
                        lastSynced: new Date().toISOString(),
                        source: 'scrape-script'
                    }, { merge: true });

                    // Extract & Sync Metadata (Taxonomy)
                    if (project.city) {
                        await db.collection('locations_cities').doc(cleanKey(project.city)).set({ name: project.city }, { merge: true });
                    }
                    if (project.community) {
                        await db.collection('locations_communities').doc(cleanKey(project.community)).set({ name: project.community }, { merge: true });
                    }
                    if (project.masterDeveloper) {
                        await db.collection('entities_developers').doc(cleanKey(project.masterDeveloper)).set({ name: project.masterDeveloper }, { merge: true });
                    }

                    console.log(`[${index}/${total}] ✅ Synced: ${slug}`);
                    successCount++;
                } else {
                    console.warn(`[${index}/${total}] ⚠️ No data found for slug: ${slug}`);
                }

            } catch (err) {
                console.error(`[${index}/${total}] ❌ Failed to sync slug: ${slug}`, err.message);
                errorCount++;
            }
        }

        console.log(`\n🎉 Scrape & Sync Complete!`);
        console.log(`✅ Success: ${successCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Critical Script Error:', error);
        process.exit(1);
    }
};

scrapeAndSync();
