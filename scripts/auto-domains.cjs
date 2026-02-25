// scripts/auto-domains.cjs
// Automatically populates the `domain` field on Firestore landmarks using
// the Clearbit Autocomplete API.
//
// Usage:
//   node scripts/auto-domains.cjs
//
// Prerequisites:
//   - scripts/serviceAccountKey.json must exist (download from Firebase Console)
//   - npm install firebase-admin  (already in devDependencies typically)

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Landmark names that are too generic for Clearbit to return a good match.
// These will be skipped to avoid false positives (e.g. "Mall" → google.com).
const SKIP_WORDS = new Set(['mall', 'park', 'beach', 'tower', 'street', 'road', 'centre', 'center', 'district', 'island']);

function buildQuery(name) {
    // Use the most distinctive word — usually the first proper noun.
    const words = name.split(' ').filter(w => w.length > 2 && !SKIP_WORDS.has(w.toLowerCase()));
    return encodeURIComponent(words.slice(0, 2).join(' ') || name.split(' ')[0]);
}

async function run() {
    const snapshot = await db.collection('landmarks').get();
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    console.log(`📍 Found ${snapshot.docs.length} landmarks to process...\n`);

    for (const doc of snapshot.docs) {
        const data = doc.data();

        if (data.domain) {
            console.log(`⏭  Already has domain [${data.domain}] — skipping: ${data.name}`);
            skippedCount++;
            continue;
        }

        try {
            const query = buildQuery(data.name);
            const res = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${query}`);

            if (!res.ok) throw new Error(`Clearbit responded ${res.status}`);

            const suggestions = await res.json();

            if (suggestions && suggestions.length > 0) {
                const domain = suggestions[0].domain;
                await db.collection('landmarks').doc(doc.id).update({ domain });
                console.log(`✅ ${data.name}  →  ${domain}`);
                updatedCount++;
            } else {
                console.log(`❌ No match found for: ${data.name}`);
                failedCount++;
            }
        } catch (err) {
            console.error(`💥 Error processing "${data.name}":`, err.message);
            failedCount++;
        }

        // Respect Clearbit rate limit (~10 req/s on free tier)
        await new Promise(r => setTimeout(r, 600));
    }

    console.log(`\n🎉 Done!`);
    console.log(`   Updated : ${updatedCount}`);
    console.log(`   Skipped : ${skippedCount}`);
    console.log(`   Failed  : ${failedCount}`);
    process.exit(0);
}

run();
