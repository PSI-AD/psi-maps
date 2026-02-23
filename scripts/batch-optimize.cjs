/**
 * PSI MAPS - BATCH IMAGE OPTIMIZER
 * * HOW TO RUN THIS LOCALLY:
 * 1. Open your terminal in this project folder.
 * 2. Run: npm install firebase-admin sharp axios
 * 3. Go to Firebase Console -> Project Settings -> Service Accounts -> Generate New Private Key.
 * 4. Save the downloaded JSON file in this `scripts` folder and name it `service-account.json`.
 * 5. Run the script: node scripts/batch-optimize.cjs
 */

const admin = require('firebase-admin');
const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Helper to create clean, SEO-friendly strings
const sanitize = (str) => {
    if (!str) return 'unknown';
    return str.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

// 1. Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ ERROR: service-account.json not found in the scripts folder.");
    console.log("Please download it from Firebase Console -> Project Settings -> Service Accounts.");
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// CORRECT BUCKET NAME APPLIED HERE
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "psimaps-pro.firebasestorage.app"
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function optimizeImages() {
    console.log("🚀 Starting Batch Image Optimization...");

    try {
        const projectsSnapshot = await db.collection('projects').get();
        console.log(`📦 Found ${projectsSnapshot.docs.length} projects to process.`);

        let processedCount = 0;

        for (const doc of projectsSnapshot.docs) {
            const data = doc.data();
            const rawImages = data.generalImages || data.featuredImages || [];
            const mainImageUrl = rawImages[0]?.imageURL || data.thumbnailUrl;

            // Skip if no image, or if it's already an optimized webp
            if (!mainImageUrl || mainImageUrl.includes('optimized%2F') || mainImageUrl.includes('.webp')) {
                continue;
            }

            console.log(`⏳ Processing: ${data.name || doc.id}`);

            try {
                // Download image
                const response = await axios({ url: mainImageUrl, responseType: 'arraybuffer' });
                const imageBuffer = Buffer.from(response.data, 'binary');

                // Compress with Sharp
                const optimizedBuffer = await sharp(imageBuffer)
                    .resize({ width: 600, withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toBuffer();

                // Generate clean SEO filename including City
                const safeName = sanitize(data.name || data.propertyName);
                const safeCommunity = sanitize(data.community);
                const safeCity = sanitize(data.city);
                const safeDeveloper = sanitize(data.developerName || data.masterDeveloper || data.Developer);
                const dateStr = new Date().toISOString().split('T')[0];

                const fileName = `optimized/${safeName}-${safeCommunity}-${safeCity}-${safeDeveloper}-${dateStr}-optimized.webp`;
                const file = bucket.file(fileName);

                // Upload to Firebase Storage
                await file.save(optimizedBuffer, {
                    metadata: { contentType: 'image/webp' },
                    public: true
                });

                // Get public URL
                const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;

                // Update Firestore
                await doc.ref.update({
                    thumbnailUrl: publicUrl
                });

                console.log(`✅ Success: ${data.name || doc.id} optimized and updated.`);
                processedCount++;

            } catch (imgError) {
                console.error(`⚠️ Failed to process image for ${data.name || doc.id}:`, imgError.message);
            }
        }

        console.log(`🎉 Optimization Complete! Successfully processed ${processedCount} images.`);

    } catch (error) {
        console.error("❌ Fatal Error during optimization:", error);
    }
}

optimizeImages();