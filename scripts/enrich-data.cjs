/**
 * PSI Maps — Data Enrichment Engine
 * ───────────────────────────────────
 * Usage:  node scripts/enrich-data.cjs
 *
 * Requirements:
 *   • service-account.json in the project root (Firebase Admin SDK key)
 *   • .env.local with VITE_GOOGLE_MAPS_API_KEY set
 *   • npm install firebase-admin axios dotenv  (if not already present)
 */

'use strict';

require('dotenv').config({ path: '.env.local' });

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const axios = require('axios');
const path = require('path');

// ── Firebase Admin init ─────────────────────────────────────────────────────
let serviceAccount;
try {
    serviceAccount = require(path.join(__dirname, '../service-account.json'));
} catch {
    console.error('❌  service-account.json not found in the project root.');
    console.error('    Download it from Firebase Console → Project Settings → Service Accounts.');
    process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const GOOGLE_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;
if (!GOOGLE_KEY) {
    console.error('❌  VITE_GOOGLE_MAPS_API_KEY is missing from .env.local');
    process.exit(1);
}

// ── Helper: sleep ───────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 1. Enrich Communities via Google Places API ─────────────────────────────
async function enrichCommunity(name, city) {
    try {
        console.log(`\n🔍  Searching Google Places: "${name}, ${city}"…`);

        // Step 1 — Find Place ID
        const findRes = await axios.get(
            'https://maps.googleapis.com/maps/api/place/findplacefromtext/json',
            {
                params: {
                    input: `${name} ${city} UAE`,
                    inputtype: 'textquery',
                    fields: 'place_id',
                    key: GOOGLE_KEY,
                },
            }
        );

        if (!findRes.data.candidates?.length) {
            console.warn(`  ⚠️  No Google Places result for "${name}"`);
            return;
        }

        const placeId = findRes.data.candidates[0].place_id;

        // Step 2 — Get Details
        const detailRes = await axios.get(
            'https://maps.googleapis.com/maps/api/place/details/json',
            {
                params: {
                    place_id: placeId,
                    fields: 'editorial_summary,geometry,photos,name',
                    key: GOOGLE_KEY,
                },
            }
        );

        const details = detailRes.data.result || {};
        const description = details.editorial_summary?.overview || '';
        const lat = details.geometry?.location?.lat ?? null;
        const lng = details.geometry?.location?.lng ?? null;

        // Step 3 — Build photo URLs (up to 5, max-width 1200 px)
        const images = (details.photos || []).slice(0, 5).map(
            (p) =>
                `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${p.photo_reference}&key=${GOOGLE_KEY}`
        );

        const docId = name.replace(/\s+/g, '_').toLowerCase();
        await db
            .collection('communities')
            .doc(docId)
            .set(
                { name, city, description, latitude: lat, longitude: lng, images, placeId },
                { merge: true }
            );

        console.log(`  ✅  Saved Community: ${name} (${images.length} photos, id: ${docId})`);
    } catch (err) {
        console.error(`  ❌  Error scraping community "${name}":`, err.message);
    }

    // Be polite to the API
    await sleep(500);
}

// ── 2. Enrich Developers via Google Favicon API ──────────────────────────────
async function enrichDeveloper(name, domain) {
    try {
        console.log(`\n🏗️   Enriching Developer: "${name}" (${domain})…`);

        const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        const docId = name.replace(/\s+/g, '_').toLowerCase();

        await db
            .collection('developers')
            .doc(docId)
            .set(
                {
                    name,
                    logoUrl,
                    website: `https://www.${domain}`,
                    tags: ['Real Estate Developer'],
                },
                { merge: true }
            );

        console.log(`  ✅  Saved Developer: ${name} → ${logoUrl}`);
    } catch (err) {
        console.error(`  ❌  Error saving developer "${name}":`, err.message);
    }
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n🚀  PSI Maps — Data Enrichment Engine starting…');
    console.log('📡  Fetching live entities from Firestore…\n');

    // ── Fetch live developers from Firestore ─────────────────────────────────
    const devsSnapshot = await db.collection('entities_developers').get();
    const DEVELOPERS = devsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`🏗️   Loaded ${DEVELOPERS.length} developers from Firestore.`);

    // ── Fetch live communities from Firestore ────────────────────────────────
    const commsSnapshot = await db.collection('locations_communities').get();
    const COMMUNITIES = commsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`📍  Loaded ${COMMUNITIES.length} communities from Firestore.\n`);

    // ── Phase 1: Developers — derive domain from name, skip if unresolvable ──
    console.log('── Phase 1: Developers ────────────────────────────────');
    for (const dev of DEVELOPERS) {
        // Use stored domain or derive a best-guess from the developer name
        const domain = dev.domain
            || `${dev.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`;

        if (!domain) {
            console.warn(`  ⚠️   Skipping "${dev.name}" — no domain available.`);
            continue;
        }
        await enrichDeveloper(dev.name, domain);
        await sleep(500);
    }

    // ── Phase 2: Communities — slower (Google Places round-trip per entry) ───
    console.log('\n── Phase 2: Communities ───────────────────────────────');
    for (const comm of COMMUNITIES) {
        await enrichCommunity(comm.name, comm.city || 'Abu Dhabi');
        // sleep already called inside enrichCommunity
    }

    console.log('\n✨  Enrichment complete! Refresh the AdminDashboard to see results.\n');
    process.exit(0);
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
