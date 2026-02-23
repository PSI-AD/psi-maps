/**
 * PSI MAPS — BATCH IMAGE OPTIMIZER
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO RUN THIS LOCALLY:
 *
 *   1. Open your terminal in the root project folder (psi-maps/).
 *   2. Install the required dependencies (one-time):
 *        npm install firebase-admin sharp axios
 *   3. Go to Firebase Console → Project Settings → Service Accounts
 *      → "Generate New Private Key" → save the downloaded JSON as:
 *        scripts/service-account.json
 *      (This file is already in .gitignore — never commit it.)
 *   4. Run the script:
 *        node scripts/batch-optimize.cjs
 *
 * WHAT IT DOES:
 *   • Loops every document in the `projects` Firestore collection.
 *   • Skips documents that already have an optimized WebP thumbnail.
 *   • Downloads the raw image via HTTP.
 *   • Compresses it to 600 px wide WebP (quality 80) using sharp.
 *   • Uploads the result to Firebase Storage at: optimized/<docId>_thumb.webp
 *   • Updates `doc.thumbnailUrl` in Firestore with the new public CDN URL.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const admin = require('firebase-admin');
const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ── 1. Guard: ensure service-account.json is present ────────────────────────
const serviceAccountPath = path.join(__dirname, 'service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('\n❌  ERROR: scripts/service-account.json not found.');
    console.error('    Download it from Firebase Console → Project Settings → Service Accounts.\n');
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// ── 2. Initialize Firebase Admin ─────────────────────────────────────────────
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // Falls back to <project_id>.appspot.com — override here if your bucket name differs.
    storageBucket: `${serviceAccount.project_id}.appspot.com`,
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// ── 3. Helpers ───────────────────────────────────────────────────────────────

/**
 * Returns true if a URL already points at an optimized WebP in our pipeline,
 * so we never reprocess the same image twice.
 */
function isAlreadyOptimized(url) {
    return url.includes('optimized%2F') || url.endsWith('.webp');
}

/**
 * Extracts the best available source image URL from a Firestore project document.
 * Priority: generalImages[0] → featuredImages[0] → thumbnailUrl field.
 */
function extractSourceUrl(data) {
    const fromGeneral = (data.generalImages || [])[0]?.imageURL;
    const fromFeatured = (data.featuredImages || [])[0]?.imageURL;
    return fromGeneral || fromFeatured || data.thumbnailUrl || null;
}

// ── 4. Main processing loop ───────────────────────────────────────────────────
async function optimizeImages() {
    console.log('\n🚀  PSI Maps — Batch Image Optimization starting…\n');

    const snapshot = await db.collection('projects').get();
    const total = snapshot.docs.length;
    console.log(`📦  Found ${total} project documents.\n`);

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const label = data.name || doc.id;
        const sourceUrl = extractSourceUrl(data);

        // — Skip: no image or already a WebP ——————————————————————————————————
        if (!sourceUrl) {
            console.log(`⏭️   Skipping (no image):      ${label}`);
            skipped++;
            continue;
        }
        if (isAlreadyOptimized(sourceUrl)) {
            console.log(`⏭️   Skipping (already webp):  ${label}`);
            skipped++;
            continue;
        }

        console.log(`⏳  Processing:               ${label}`);

        try {
            // — Download ────────────────────────────────────────────────────────
            const response = await axios({
                url: sourceUrl,
                responseType: 'arraybuffer',
                timeout: 15_000, // 15 s per image
                headers: {
                    // Some CDNs reject requests without a UA
                    'User-Agent': 'PSI-Maps-Optimizer/1.0',
                },
            });

            // — Compress ────────────────────────────────────────────────────────
            const optimizedBuffer = await sharp(Buffer.from(response.data, 'binary'))
                .resize({ width: 600, withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();

            // — Upload to Firebase Storage ──────────────────────────────────────
            const storagePath = `optimized/${doc.id}_thumb.webp`;
            const file = bucket.file(storagePath);

            await file.save(optimizedBuffer, {
                metadata: { contentType: 'image/webp' },
                public: true,
                resumable: false, // small files — no need for resumable upload
            });

            // — Build public CDN URL ────────────────────────────────────────────
            const publicUrl =
                `https://firebasestorage.googleapis.com/v0/b/${bucket.name}` +
                `/o/${encodeURIComponent(storagePath)}?alt=media`;

            // — Patch Firestore ─────────────────────────────────────────────────
            await doc.ref.update({ thumbnailUrl: publicUrl });

            const kbSaved = ((response.data.byteLength - optimizedBuffer.length) / 1024).toFixed(1);
            console.log(`✅  Done (saved ~${kbSaved} KB):    ${label}`);
            processed++;

        } catch (err) {
            console.error(`⚠️   Failed: ${label} — ${err.message}`);
            failed++;
        }
    }

    console.log('\n────────────────────────────────────────────────────');
    console.log(`🎉  Optimization complete!`);
    console.log(`    ✅ Processed : ${processed}`);
    console.log(`    ⏭️  Skipped   : ${skipped}`);
    console.log(`    ⚠️  Failed    : ${failed}`);
    console.log(`    📦 Total     : ${total}`);
    console.log('────────────────────────────────────────────────────\n');

    process.exit(0);
}

// ── 5. Top-level error catch ──────────────────────────────────────────────────
optimizeImages().catch((err) => {
    console.error('\n❌  Fatal error:', err);
    process.exit(1);
});
