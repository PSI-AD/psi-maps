/**
 * Optimizes image URLs for performance by adding query parameters if supported.
 * Currently supports:
 * - Unsplash (auto=format&fit=crop&w=width&q=quality)
 * - Generic pass-through for others
 */
export const getOptimizedImageUrl = (url: string | undefined | null, width: number, height?: number, quality = 80): string => {
    if (!url) return '';

    // Check if it's an Unsplash URL (common placeholder)
    if (url.includes('images.unsplash.com')) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}auto=format&fit=crop&w=${width}&q=${quality}${height ? `&h=${height}` : ''}`;
    }

    // Add other provider logic here if known (e.g. Contentful, Cloudinary)

    // Default: Return original URL
    return url;
};
