/**
 * PSI MAPS - BATCH IMAGE OPTIMIZER (STRICT SEO + BULLETPROOF EDITION)
 */

const admin = require('firebase-admin');
const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const sanitize = (str) => {
    if (!str) return 'unknown';
    return str.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

const serviceAccountPath = path.join(__dirname, 'service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ ERROR: service-account.json not found.");
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "psimaps-pro.firebasestorage.app"
    });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function optimizeImages() {
    console.log("🚀 Starting Full Gallery Batch Optimization (Bulletproof Edition)...");

    try {
        const projectsSnapshot = await db.collection('projects').get();
        console.log(`📦 Found ${projectsSnapshot.docs.length} projects to process.`);

        let processedCount = 0;

        for (const doc of projectsSnapshot.docs) {
            const data = doc.data();
            const rawImages = data.generalImages || data.featuredImages || [];

            if (rawImages.length === 0 && !data.thumbnailUrl) continue;

            const safeName = sanitize(data.name || data.propertyName);

            const isAlreadyClean = data.optimizedGallery &&
                data.optimizedGallery.length > 0 &&
                data.optimizedGallery[0].thumb.includes(`${safeName}-`);

            if (isAlreadyClean) {
                continue; // Skip already perfect ones
            }

            const safeCommunity = sanitize(data.community);
            const safeCity = sanitize(data.city);
            const safeDeveloper = sanitize(data.developerName || data.masterDeveloper || data.Developer);
            const dateStr = new Date().toISOString().split('T')[0];

            const baseName = `${safeName}-${safeCommunity}-${safeCity}-${safeDeveloper}-${dateStr}`;
            const folderPath = `optimized/${safeName}`;

            console.log(`\n⏳ Processing Project: ${data.name || doc.id}`);

            let optimizedGallery = [];

            // CRITICAL FIX: Ensure strict null fallbacks to prevent Firestore crashes
            let mainThumb = data.thumbnailUrl || null;
            let mainResponsive = data.responsiveMedia || null;
            let isFirstSuccess = true;

            const imagesToProcess = rawImages.slice(0, 10);

            for (let i = 0; i < imagesToProcess.length; i++) {
                const imgUrl = imagesToProcess[i]?.imageURL || imagesToProcess[i];
                if (!imgUrl || typeof imgUrl !== 'string' || imgUrl.includes('optimized%2F')) continue;

                try {
                    console.log(`  -> Downloading image ${i + 1}/${imagesToProcess.length}...`);
                    const response = await axios({ url: imgUrl, responseType: 'arraybuffer' });
                    const imageBuffer = Buffer.from(response.data, 'binary');

                    const imageIndex = i + 1;
                    const thumbFileName = `${folderPath}/${baseName}-gallery-${imageIndex}-thumb.webp`;
                    const largeFileName = `${folderPath}/${baseName}-gallery-${imageIndex}-large.webp`;

                    const thumbBuffer = await sharp(imageBuffer).resize({ width: 400, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
                    const thumbFile = bucket.file(thumbFileName);
                    await thumbFile.save(thumbBuffer, { metadata: { contentType: 'image/webp' } });
                    const thumbPublicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(thumbFileName)}?alt=media`;

                    const largeBuffer = await sharp(imageBuffer).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
                    const largeFile = bucket.file(largeFileName);
                    await largeFile.save(largeBuffer, { metadata: { contentType: 'image/webp' } });
                    const largePublicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(largeFileName)}?alt=media`;

                    optimizedGallery.push({ thumb: thumbPublicUrl, large: largePublicUrl });

                    // CRITICAL FIX: Attach main images to the FIRST SUCCESSFUL download, bypassing corrupt images
                    if (isFirstSuccess) {
                        const mediumFileName = `${folderPath}/${baseName}-gallery-${imageIndex}-medium.webp`;
                        const mediumBuffer = await sharp(imageBuffer).resize({ width: 800, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
                        const mediumFile = bucket.file(mediumFileName);
                        await mediumFile.save(mediumBuffer, { metadata: { contentType: 'image/webp' } });
                        const mediumPublicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(mediumFileName)}?alt=media`;

                        mainThumb = thumbPublicUrl;
                        mainResponsive = { thumb: thumbPublicUrl, medium: mediumPublicUrl, large: largePublicUrl };
                        isFirstSuccess = false;
                    }

                } catch (err) {
                    console.error(`  ⚠️ Failed image ${i + 1}: ${err.message} (Skipping...)`);
                }
            }

            if (optimizedGallery.length > 0) {
                // Now safely passing valid strings or nulls, never undefined.
                await doc.ref.update({
                    thumbnailUrl: mainThumb,
                    responsiveMedia: mainResponsive,
                    optimizedGallery: optimizedGallery
                });
                console.log(`✅ Success: ${data.name || doc.id} folder populated with PERFECT SEO naming.`);
                processedCount++;
            }
        }

        console.log(`\n🎉 Complete! Fixed and upgraded ${processedCount} projects to full SEO responsive galleries.`);

    } catch (error) {
        console.error("❌ Fatal Error:", error);
    }
}

optimizeImages();