import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { Project, Landmark } from '../../types';

/* ── Colour tokens ──────────────────────────────────────────────────────── */
const C = {
    navy: '#1e293b',
    blue: '#2563eb',
    slate: '#64748b',
    dark: '#0f172a',
    light: '#f1f5f9',
    soft: '#f8fafc',
    white: '#ffffff',
    border: '#e2e8f0',
};

/* ── Styles ─────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
    page: { backgroundColor: C.soft, paddingBottom: 40 },

    /* Brand header */
    brandHeader: { backgroundColor: C.navy, paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    brandLogo: { color: C.white, fontSize: 22, fontWeight: 'bold', letterSpacing: 3 },
    brandTagline: { color: '#94a3b8', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5 },

    /* Image gallery */
    heroImage: { width: '100%', height: 300, objectFit: 'cover' },
    galleryRow: { flexDirection: 'row', height: 100 },
    galleryImg: { flex: 1, objectFit: 'cover', borderRight: '2px solid #ffffff' },

    /* Title card floats over gallery bottom */
    titleCard: { backgroundColor: C.white, marginHorizontal: 24, marginTop: -32, marginBottom: 16, borderRadius: 10, padding: 24, borderTopWidth: 4, borderTopColor: C.blue },
    devTag: { color: C.blue, fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 },
    projectTitle: { fontSize: 28, fontWeight: 'bold', color: C.dark, marginBottom: 4 },
    projectLoc: { fontSize: 11, color: C.slate, marginBottom: 16 },
    priceBox: { backgroundColor: C.light, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
    priceText: { color: C.dark, fontSize: 14, fontWeight: 'bold' },

    /* Section wrapper */
    section: { backgroundColor: C.white, marginHorizontal: 24, marginBottom: 14, padding: 22, borderRadius: 10, borderWidth: 1, borderColor: C.border },
    sectionTitle: { fontSize: 11, fontWeight: 'bold', color: C.dark, textTransform: 'uppercase', letterSpacing: 1.5, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 8, marginBottom: 16 },

    /* Spec grid */
    specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    specItem: { width: '30%', backgroundColor: C.soft, padding: 12, borderRadius: 6, borderWidth: 1, borderColor: C.border },
    specLabel: { fontSize: 7, color: C.slate, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
    specVal: { fontSize: 12, fontWeight: 'bold', color: C.dark },

    /* Map */
    mapWrap: { width: '100%', height: 220, borderRadius: 6, overflow: 'hidden', backgroundColor: C.border, position: 'relative' },
    mapImg: { width: '100%', height: '100%', objectFit: 'cover' },
    mapPin: { position: 'absolute', top: '50%', left: '50%', width: 22, height: 22, backgroundColor: C.blue, borderRadius: 11, borderWidth: 3, borderColor: C.white },

    /* Amenities */
    amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    catBlock: { width: '45%' },
    catLabel: { fontSize: 9, fontWeight: 'bold', color: C.navy, textTransform: 'uppercase', letterSpacing: 1, backgroundColor: C.light, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 8 },
    amenityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    amenityDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.blue, marginRight: 8 },
    amenityName: { fontSize: 9, color: '#1e293b', flex: 1 },
    amenityDist: { fontSize: 9, color: C.slate, fontWeight: 'bold' },

    /* Related projects */
    relatedGrid: { flexDirection: 'row', gap: 12 },
    relatedCard: { flex: 1, backgroundColor: C.soft, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: C.border },
    relatedName: { fontSize: 10, fontWeight: 'bold', color: C.dark, marginBottom: 3 },
    relatedSub: { fontSize: 8, color: C.slate },

    /* Footer */
    footer: { position: 'absolute', bottom: 12, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    footerText: { fontSize: 8, color: C.slate },
});

/* ── Props ───────────────────────────────────────────────────────────────── */
interface PdfProps {
    project: Project;
    mapSnapshotUrl: string;
    categorizedAmenities: { category: string; items: (Landmark & { distance: number })[] }[];
    related: { sameDeveloper: Project[]; otherDevelopers: Project[] };
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
/** Pull up to N distinct images from every available field, fall back to thumbnailUrl. */
const getImages = (project: Project, count: number): string[] => {
    const pool: string[] = [];
    if (project.optimizedGallery?.length) {
        project.optimizedGallery.forEach(g => { if (g.large) pool.push(g.large); });
    }
    if (project.images?.length) {
        project.images.forEach(url => { if (url && !pool.includes(url)) pool.push(url); });
    }
    if (project.responsiveMedia?.large && !pool.includes(project.responsiveMedia.large)) {
        pool.push(project.responsiveMedia.large);
    }
    if (project.thumbnailUrl && !pool.includes(project.thumbnailUrl)) pool.push(project.thumbnailUrl);
    // Pad with repeated images rather than blank
    while (pool.length < count && pool.length > 0) pool.push(pool[0]);
    return pool.slice(0, count);
};

/* ── Document ────────────────────────────────────────────────────────────── */
const ProjectPdfDocument: React.FC<PdfProps> = ({ project, mapSnapshotUrl, categorizedAmenities, related }) => {
    const imgs = getImages(project, 4);
    const heroImg = imgs[0] || '';
    const gridImgs = imgs.slice(1, 4); // 3 tiles under hero

    const specs = [
        { label: 'Property Type', val: project.type },
        { label: 'Bedrooms', val: project.bedrooms != null ? String(project.bedrooms) : null },
        { label: 'Bathrooms', val: project.bathrooms != null ? String(project.bathrooms) : null },
        { label: 'Built-up Area', val: project.builtupArea != null ? `${String(project.builtupArea)} sqft` : null },
        { label: 'Status', val: project.status },
        { label: 'Completion', val: project.completionDate },
    ].filter(s => s.val);

    return (
        <Document title={`${project.name} — Property Brochure`} author="PSI Maps">
            <Page size="A4" style={styles.page}>

                {/* ── Brand header ── */}
                <View style={styles.brandHeader}>
                    <Text style={styles.brandLogo}>PSI.</Text>
                    <Text style={styles.brandTagline}>Premier Project Portfolio</Text>
                </View>

                {/* ── Hero image ── */}
                {heroImg ? (
                    <Image src={heroImg} style={styles.heroImage} />
                ) : (
                    <View style={[styles.heroImage, { backgroundColor: '#334155' }]} />
                )}

                {/* ── Gallery strip ── */}
                {gridImgs.length > 0 && (
                    <View style={styles.galleryRow}>
                        {gridImgs.map((src, i) => (
                            <Image key={i} src={src} style={styles.galleryImg} />
                        ))}
                    </View>
                )}

                {/* ── Title card ── */}
                <View style={styles.titleCard} wrap={false}>
                    <Text style={styles.devTag}>{project.developerName}</Text>
                    <Text style={styles.projectTitle}>{project.name}</Text>
                    <Text style={styles.projectLoc}>
                        {[project.community, project.city].filter(Boolean).join(', ')}
                    </Text>
                    {project.priceRange && (
                        <View style={styles.priceBox}>
                            <Text style={styles.priceText}>{project.priceRange}</Text>
                        </View>
                    )}
                </View>

                {/* ── Key specs ── */}
                {specs.length > 0 && (
                    <View style={styles.section} wrap={false}>
                        <Text style={styles.sectionTitle}>Key Specifications</Text>
                        <View style={styles.specGrid}>
                            {specs.map(s => (
                                <View key={s.label} style={styles.specItem}>
                                    <Text style={styles.specLabel}>{s.label}</Text>
                                    <Text style={styles.specVal}>{s.val}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* ── Location & map ── */}
                <View style={styles.section} wrap={false}>
                    <Text style={styles.sectionTitle}>Location Context</Text>
                    <View style={styles.mapWrap}>
                        {mapSnapshotUrl ? (
                            <Image src={mapSnapshotUrl} style={styles.mapImg} />
                        ) : (
                            <View style={[styles.mapImg, { backgroundColor: '#cbd5e1' }]} />
                        )}
                        {/* Centred graphical pin overlay */}
                        <View style={styles.mapPin} />
                    </View>
                </View>

                {/* ── Local ecosystem (sorted by distance, grouped by category) ── */}
                {categorizedAmenities.length > 0 && (
                    <View style={styles.section} wrap={false}>
                        <Text style={styles.sectionTitle}>Local Ecosystem</Text>
                        <View style={styles.amenityGrid}>
                            {categorizedAmenities.slice(0, 6).map(cat => (
                                <View key={cat.category} style={styles.catBlock}>
                                    <Text style={styles.catLabel}>{cat.category}</Text>
                                    {cat.items.map(item => (
                                        <View key={item.id} style={styles.amenityRow}>
                                            <View style={styles.amenityDot} />
                                            <Text style={styles.amenityName} numberOfLines={1}>{item.name}</Text>
                                            <Text style={styles.amenityDist}>{item.distance.toFixed(1)} km</Text>
                                        </View>
                                    ))}
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* ── More by same developer ── */}
                {related.sameDeveloper.length > 0 && (
                    <View style={styles.section} wrap={false}>
                        <Text style={styles.sectionTitle}>More by {project.developerName}</Text>
                        <View style={styles.relatedGrid}>
                            {related.sameDeveloper.slice(0, 3).map(p => (
                                <View key={p.id} style={styles.relatedCard}>
                                    <Text style={styles.relatedName} numberOfLines={1}>{p.name}</Text>
                                    <Text style={styles.relatedSub}>
                                        {[p.community, p.city].filter(Boolean).join(' · ')}
                                        {p.priceRange ? `\n${p.priceRange}` : ''}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* ── Footer ── */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>PSI MAPS · Advanced Spatial Intelligence</Text>
                    <Text style={styles.footerText}>© 2026 Property Shop Investment</Text>
                </View>

            </Page>
        </Document>
    );
};

export default ProjectPdfDocument;
