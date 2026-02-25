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

// ── 2. Enrich Developers via Clearbit Logo API ──────────────────────────────
async function enrichDeveloper(name, domain) {
    try {
        console.log(`\n🏗️   Enriching Developer: "${name}" (${domain})…`);

        const logoUrl = `https://logo.clearbit.com/${domain}`;
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

// ── Seed Data ───────────────────────────────────────────────────────────────
// Add more entries here as needed. Communities use Google Places; Developers use Clearbit.

const COMMUNITIES = [
    { name: 'Saadiyat Island', city: 'Abu Dhabi' },
    { name: 'Yas Island', city: 'Abu Dhabi' },
    { name: 'Al Reem Island', city: 'Abu Dhabi' },
    { name: 'Al Maryah Island', city: 'Abu Dhabi' },
    { name: 'Khalifa City', city: 'Abu Dhabi' },
    { name: 'Mohammed Bin Zayed', city: 'Abu Dhabi' },
    { name: 'Al Ghadeer', city: 'Abu Dhabi' },
    { name: 'Masdar City', city: 'Abu Dhabi' },
    { name: 'Downtown Dubai', city: 'Dubai' },
    { name: 'Dubai Marina', city: 'Dubai' },
    { name: 'Palm Jumeirah', city: 'Dubai' },
    { name: 'Business Bay', city: 'Dubai' },
    { name: 'Arabian Ranches', city: 'Dubai' },
    { name: 'Jumeirah Village Circle', city: 'Dubai' },
];

const DEVELOPERS = [
    { name: 'Emaar', domain: 'emaar.com' },
    { name: 'Aldar', domain: 'aldar.com' },
    { name: 'Damac', domain: 'damacproperties.com' },
    { name: 'Nakheel', domain: 'nakheel.com' },
    { name: 'Sobha', domain: 'sobharealty.com' },
    { name: 'Meraas', domain: 'meraas.com' },
    { name: 'Binghatti', domain: 'binghatti.com' },
    { name: 'Danube', domain: 'danubeproperties.ae' },
    { name: 'Imkan', domain: 'imkan.ae' },
    { name: 'Reportage', domain: 'reportageuae.com' },
    { name: 'Ellington', domain: 'ellingtonproperties.ae' },
    { name: 'Bloom', domain: 'bloomholding.com' },
    { name: 'Azizi', domain: 'azizidevelopments.com' },
];

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n🚀  PSI Maps — Data Enrichment Engine starting…');
    console.log(`    ${COMMUNITIES.length} communities · ${DEVELOPERS.length} developers\n`);

    // Developers first — fast (just Clearbit writes)
    console.log('── Phase 1: Developers ────────────────────────────────');
    for (const dev of DEVELOPERS) {
        await enrichDeveloper(dev.name, dev.domain);
    }

    // Communities — slower (Google Places round-trip per entry)
    console.log('\n── Phase 2: Communities ───────────────────────────────');
    for (const comm of COMMUNITIES) {
        await enrichCommunity(comm.name, comm.city);
    }

    console.log('\n✨  Enrichment complete! Refresh the AdminDashboard to see results.\n');
    process.exit(0);
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
