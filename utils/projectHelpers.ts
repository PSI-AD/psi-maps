import { Project } from '../types';

/**
 * Returns two related project lists for a given project:
 *  - sameDeveloper: up to 5 other projects by the same developer, sorted by distance
 *  - otherDevelopers: up to 5 nearest projects by different developers
 */
export const getRelatedProjects = (current: Project, allProjects: Project[]) => {
    if (!current.latitude || !current.longitude) {
        return { sameDeveloper: [], otherDevelopers: [] };
    }

    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const others = allProjects
        .filter(p => p.id !== current.id && p.latitude && p.longitude)
        .map(p => ({
            ...p,
            distance: haversineKm(current.latitude, current.longitude, p.latitude, p.longitude),
        }))
        .sort((a, b) => a.distance - b.distance);

    const sameDeveloper = others
        .filter(p => p.developerName === current.developerName)
        .slice(0, 5);

    const otherDevelopers = others
        .filter(p => p.developerName !== current.developerName)
        .slice(0, 5);

    return { sameDeveloper, otherDevelopers };
};

/** Splits a long description into sentence-level paragraphs for PDF rendering. */
export const formatParagraphs = (text?: string): string[] => {
    if (!text) return [];
    return text
        .split('. ')
        .filter(s => s.trim().length > 0)
        .map(s => (s.endsWith('.') ? s.trim() : s.trim() + '.'));
};
