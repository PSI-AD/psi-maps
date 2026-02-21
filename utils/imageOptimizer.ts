import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

/**
 * Downloads an image via CORS proxy, compresses it to WebP (max 1200px wide, 70% quality)
 * using the Canvas API, and uploads the result to Firebase Storage.
 *
 * @param originalUrl  - The external image URL to compress
 * @param projectId    - The Firestore project document ID (used for the storage path)
 * @param index        - Image index within the project gallery
 * @returns            - The Firebase Storage download URL, or null on failure
 */
export const optimizeAndUploadImage = async (
    originalUrl: string,
    projectId: string,
    index: number
): Promise<string | null> => {
    try {
        // Switched to codetabs proxy — more stable for large binary files
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(originalUrl)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Proxy fetch failed: ${response.statusText}`);
        const blob = await response.blob();

        // Load the blob into an <img> element so Canvas can draw it
        const image = new Image();
        image.src = URL.createObjectURL(blob);
        await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = reject;
        });

        // Resize to max 1200px width (crisp on Retina, small file on disk)
        const MAX_WIDTH = 1200;
        const scale = image.width > MAX_WIDTH ? MAX_WIDTH / image.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context unavailable');
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        // Revoke the object URL to free memory
        URL.revokeObjectURL(image.src);

        // Encode as WebP at 75% quality — massive savings over JPEG/PNG
        const compressedBlob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((b) => resolve(b), 'image/webp', 0.75);
        });

        if (!compressedBlob) throw new Error('Canvas toBlob returned null');

        // Intelligent filename extraction — preserves original base name
        let filename = `image_${index}`;
        try {
            const pathSegments = new URL(originalUrl).pathname.split('/');
            let baseName = pathSegments[pathSegments.length - 1] || filename;
            baseName = baseName.replace(/\.[^/.]+$/, '');        // strip extension
            baseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_'); // sanitise
            if (baseName.length > 0) filename = baseName;
        } catch {
            console.warn('Could not extract filename from URL, using generic fallback.');
        }
        const finalFileName = `${filename}_optimized.webp`;

        // Upload to Firebase Storage with meaningful filename
        const storageRef = ref(storage, `optimized_properties/${projectId}/${finalFileName}`);
        await uploadBytes(storageRef, compressedBlob);
        const optimizedUrl = await getDownloadURL(storageRef);

        return optimizedUrl;
    } catch (error) {
        console.error(`Image optimization failed for ${originalUrl}:`, error);
        return null;
    }
};

/**
 * Batch-optimizes the thumbnail image of up to `batchSize` un-optimized projects,
 * updating the `image` field in Firestore with the new Storage URL.
 *
 * @param projects   - Full project list to scan
 * @param batchSize  - Max projects to process in one call (default 10)
 * @param onProgress - Optional callback called after each project is processed
 */
export const batchOptimizeProjects = async (
    projects: { id: string; image?: string; thumbnailUrl?: string }[],
    batchSize = 10,
    onProgress?: (processed: number, total: number) => void
): Promise<{ optimized: number; failed: number }> => {
    const unoptimized = projects
        .filter((p) => {
            const url = p.image || p.thumbnailUrl;
            return url && !url.includes('optimized_properties') && !url.includes('firebasestorage');
        })
        .slice(0, batchSize);

    let optimized = 0;
    let failed = 0;

    for (let i = 0; i < unoptimized.length; i++) {
        const project = unoptimized[i];
        const originalUrl = (project.image || project.thumbnailUrl)!;

        const newUrl = await optimizeAndUploadImage(originalUrl, project.id, 0);

        if (newUrl) {
            try {
                await updateDoc(doc(db, 'projects', project.id), {
                    image: newUrl,
                    thumbnailUrl: newUrl,
                    originalImage: originalUrl, // Preserve backup reference
                });
                optimized++;
            } catch (e) {
                console.error(`Firestore update failed for ${project.id}:`, e);
                failed++;
            }
        } else {
            failed++;
        }

        onProgress?.(i + 1, unoptimized.length);
    }

    return { optimized, failed };
};
