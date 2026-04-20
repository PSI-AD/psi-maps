import type { Project } from '../types';

/**
 * Optimizes image URLs for performance by adding resize/quality parameters.
 * Supports:
 * - PSI CRM API       → appends width/height/quality params
 * - Unsplash          → auto=format&fit=crop&w=&q=
 * - Cloudinary        → /upload/w_,q_auto,f_auto/
 * - Generic pass-through for others
 */
export const getOptimizedImageUrl = (
    url: string | undefined | null,
    width: number,
    height?: number,
    quality = 80
): string => {
    if (!url) return '';

    // ── PSI CRM image API ──────────────────────────────────────────────────────
    // URLs like: https://psi.ae/.../image?...&width=0&height=0
    //        or: https://api.psi.ae/media/...
    if (url.includes('width=0&height=0')) {
        return url
            .replace('width=0&height=0', `width=${width}&height=${height || width}`)
            .replace('quality=0', `quality=${quality}`);
    }
    // PSI API with existing width param — replace with requested size
    if (url.match(/[?&]width=\d+/) && url.match(/psi\.ae|psicrm|psimaps/i)) {
        return url
            .replace(/([?&]width=)\d+/, `$1${width}`)
            .replace(/([?&]height=)\d+/, `$1${height || width}`);
    }

    // ── Unsplash ───────────────────────────────────────────────────────────────
    if (url.includes('images.unsplash.com')) {
        // Strip any existing resize params to avoid conflicts
        const base = url.split('?')[0];
        return `${base}?auto=format&fit=crop&w=${width}${height ? `&h=${height}` : ''}&q=${quality}`;
    }

    // ── Cloudinary ─────────────────────────────────────────────────────────────
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
        return url.replace(
            '/upload/',
            `/upload/w_${width},${height ? `h_${height},` : ''}q_auto,f_auto,c_fill/`
        );
    }

    // ── Default: pass through ──────────────────────────────────────────────────
    return url;
};

type ProjectThumbnailSource = Pick<Project, 'thumbnailUrl' | 'images' | 'optimizedGallery' | 'responsiveMedia'>;

export const getProjectThumbnailUrl = (
    project: Partial<ProjectThumbnailSource> | undefined | null,
    width: number,
    height?: number,
    quality = 80
): string => {
    if (!project) return '';

    const baseUrl =
        project.thumbnailUrl ||
        project.responsiveMedia?.thumb ||
        project.optimizedGallery?.[0]?.thumb ||
        project.images?.[0] ||
        '';

    return getOptimizedImageUrl(baseUrl, width, height, quality);
};
