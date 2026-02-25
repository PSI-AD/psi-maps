import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    Image,
    StyleSheet,
    Font,
} from '@react-pdf/renderer';
import { Project, Landmark } from '../../types';
import { formatParagraphs } from '../../utils/projectHelpers';

// Register a clean sans-serif font stack via CDN
Font.register({
    family: 'Inter',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2' },
        {
            src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiA.woff2',
            fontWeight: 'bold',
        },
    ],
});

const BRAND_BLUE = '#2563eb';
const DARK = '#1e293b';
const MID = '#475569';
const LIGHT = '#94a3b8';
const BG_SOFT = '#f8fafc';

const styles = StyleSheet.create({
    page: { fontFamily: 'Inter', backgroundColor: '#ffffff', padding: 0 },

    /* ── Cover page ─────────────────────────────── */
    coverImage: { width: '100%', height: '58%', objectFit: 'cover' },
    coverContent: { padding: 40, backgroundColor: DARK, flex: 1, justifyContent: 'flex-end' },
    coverBadge: { color: LIGHT, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
    coverTitle: { fontSize: 32, color: '#ffffff', fontWeight: 'bold', marginBottom: 6 },
    coverLocation: { fontSize: 13, color: LIGHT, marginBottom: 24 },
    priceBadge: { backgroundColor: BRAND_BLUE, alignSelf: 'flex-start', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 4 },
    priceText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },

    /* ── Page header ────────────────────────────── */
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 30, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    headerLabel: { fontSize: 10, color: LIGHT, textTransform: 'uppercase', letterSpacing: 2 },
    headerBrand: { fontSize: 10, color: BRAND_BLUE, fontWeight: 'bold' },

    /* ── Content ────────────────────────────────── */
    body: { padding: 30 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: DARK, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 },
    para: { fontSize: 10.5, color: MID, lineHeight: 1.7, marginBottom: 8 },
    divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 20 },

    /* ── Fact grid ──────────────────────────────── */
    factGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    factCard: { width: '30%', backgroundColor: BG_SOFT, padding: 12, borderRadius: 6 },
    factLabel: { fontSize: 8, color: LIGHT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    factValue: { fontSize: 13, fontWeight: 'bold', color: DARK },

    /* ── Map image ──────────────────────────────── */
    mapImage: { width: '100%', height: 260, borderRadius: 8, objectFit: 'cover' },

    /* ── Amenity chip ───────────────────────────── */
    amenityRow: { width: '48%', flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: BG_SOFT, borderRadius: 6, marginBottom: 6 },
    amenityDot: { width: 26, height: 26, backgroundColor: '#dbeafe', borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    amenityCode: { fontSize: 7, fontWeight: 'bold', color: BRAND_BLUE },
    amenityName: { fontSize: 10, fontWeight: 'bold', color: DARK },
    amenitySub: { fontSize: 8, color: LIGHT },

    /* ── Related project row ────────────────────── */
    relatedRow: { flexDirection: 'row', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    relatedThumb: { width: 56, height: 56, borderRadius: 6, objectFit: 'cover', marginRight: 12 },
    relatedMeta: { justifyContent: 'center' },
    relatedName: { fontSize: 11, fontWeight: 'bold', color: DARK, marginBottom: 3 },
    relatedSub: { fontSize: 9, color: LIGHT },

    /* ── Two-column overview ────────────────────── */
    twoCol: { flexDirection: 'row', gap: 24 },
    col: { flex: 1 },
});

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const PageHeader = ({ label }: { label: string }) => (
    <View style={styles.header}>
        <Text style={styles.headerLabel}>{label}</Text>
        <Text style={styles.headerBrand}>PSI Maps · Brochure</Text>
    </View>
);

/* ── Props ───────────────────────────────────────────────────────────────── */
interface PdfProps {
    project: Project;
    mapSnapshotUrl: string;
    nearbys: Landmark[];
    related: { sameDeveloper: (Project & { distance: number })[]; otherDevelopers: (Project & { distance: number })[] };
    communityBrief?: string;
    developerBrief?: string;
}

/* ── Document ────────────────────────────────────────────────────────────── */
const ProjectPdfDocument: React.FC<PdfProps> = ({
    project,
    mapSnapshotUrl,
    nearbys,
    related,
    communityBrief,
    developerBrief,
}) => {
    const briefs = formatParagraphs(
        project.description ||
        'A premier destination featuring world-class architecture and design, attracting residents and investors from around the globe.'
    );

    const coverImage =
        project.optimizedGallery?.[0]?.large ||
        project.responsiveMedia?.large ||
        project.images?.[0] ||
        project.thumbnailUrl ||
        '';

    return (
        <Document title={`${project.name} — Property Brochure`} author="PSI Maps">

            {/* ════════════ PAGE 1: COVER ════════════ */}
            <Page size="A4" style={styles.page}>
                {coverImage ? (
                    <Image src={coverImage} style={styles.coverImage} />
                ) : (
                    <View style={[styles.coverImage, { backgroundColor: '#334155' }]} />
                )}
                <View style={styles.coverContent}>
                    <Text style={styles.coverBadge}>{project.developerName} Presents</Text>
                    <Text style={styles.coverTitle}>{project.name}</Text>
                    <Text style={styles.coverLocation}>
                        {[project.community, project.city].filter(Boolean).join(', ')}
                    </Text>
                    {project.priceRange && (
                        <View style={styles.priceBadge}>
                            <Text style={styles.priceText}>{project.priceRange}</Text>
                        </View>
                    )}
                </View>
            </Page>

            {/* ════════════ PAGE 2: DETAILS & MAP ════════════ */}
            <Page size="A4" style={styles.page}>
                <PageHeader label="Project Details & Location" />
                <View style={styles.body}>

                    <Text style={styles.sectionTitle}>Executive Brief</Text>
                    {briefs.map((para, i) => <Text key={i} style={styles.para}>{para}</Text>)}

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>Key Specifications</Text>
                    <View style={styles.factGrid}>
                        {project.type && (
                            <View style={styles.factCard}>
                                <Text style={styles.factLabel}>Type</Text>
                                <Text style={styles.factValue}>{project.type}</Text>
                            </View>
                        )}
                        {project.bedrooms && (
                            <View style={styles.factCard}>
                                <Text style={styles.factLabel}>Bedrooms</Text>
                                <Text style={styles.factValue}>{String(project.bedrooms)}</Text>
                            </View>
                        )}
                        {project.completionDate && (
                            <View style={styles.factCard}>
                                <Text style={styles.factLabel}>Completion</Text>
                                <Text style={styles.factValue}>{project.completionDate}</Text>
                            </View>
                        )}
                        {project.builtupArea && (
                            <View style={styles.factCard}>
                                <Text style={styles.factLabel}>Built-up Area</Text>
                                <Text style={styles.factValue}>{String(project.builtupArea)} sqft</Text>
                            </View>
                        )}
                        {project.status && (
                            <View style={styles.factCard}>
                                <Text style={styles.factLabel}>Status</Text>
                                <Text style={styles.factValue}>{project.status}</Text>
                            </View>
                        )}
                        {project.city && (
                            <View style={styles.factCard}>
                                <Text style={styles.factLabel}>Emirate</Text>
                                <Text style={styles.factValue}>{project.city}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>Spatial Context</Text>
                    {mapSnapshotUrl && <Image src={mapSnapshotUrl} style={styles.mapImage} />}
                </View>
            </Page>

            {/* ════════════ PAGE 3: NEARBY ECOSYSTEM ════════════ */}
            <Page size="A4" style={styles.page}>
                <PageHeader label="Lifestyle & Amenities" />
                <View style={styles.body}>
                    <Text style={styles.sectionTitle}>Proximity Highlights</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {nearbys.slice(0, 16).map((l, i) => (
                            <View key={i} style={styles.amenityRow}>
                                <View style={styles.amenityDot}>
                                    <Text style={styles.amenityCode}>
                                        {(l.category || 'LM').substring(0, 2).toUpperCase()}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={styles.amenityName} numberOfLines={1}>{l.name}</Text>
                                    <Text style={styles.amenitySub}>{l.category}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </Page>

            {/* ════════════ PAGE 4: DEVELOPER & RELATED ════════════ */}
            <Page size="A4" style={styles.page}>
                <PageHeader label="Market Context" />
                <View style={styles.body}>

                    {/* Developer + Community briefs */}
                    <View style={styles.twoCol}>
                        <View style={styles.col}>
                            <Text style={styles.sectionTitle}>The Developer</Text>
                            <Text style={styles.para}>
                                {developerBrief ||
                                    `${project.developerName} is a prominent developer renowned for delivering high-quality residential and commercial properties across the UAE.`}
                            </Text>
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.sectionTitle}>The Community</Text>
                            <Text style={styles.para}>
                                {communityBrief ||
                                    `${project.community || 'This community'} is a master-planned enclave offering a blend of luxury living, convenient amenities, and strategic connectivity.`}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Same developer */}
                    {related.sameDeveloper.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>More from {project.developerName}</Text>
                            {related.sameDeveloper.map(p => (
                                <View key={p.id} style={styles.relatedRow}>
                                    {(p.thumbnailUrl || p.images?.[0]) ? (
                                        <Image src={p.thumbnailUrl || p.images![0]} style={styles.relatedThumb} />
                                    ) : (
                                        <View style={[styles.relatedThumb, { backgroundColor: '#e2e8f0' }]} />
                                    )}
                                    <View style={styles.relatedMeta}>
                                        <Text style={styles.relatedName}>{p.name}</Text>
                                        <Text style={styles.relatedSub}>
                                            {[p.community, p.city].filter(Boolean).join(' · ')}
                                            {p.priceRange ? ` · ${p.priceRange}` : ''}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </>
                    )}

                    {/* Other developers */}
                    {related.otherDevelopers.length > 0 && (
                        <>
                            <View style={styles.divider} />
                            <Text style={styles.sectionTitle}>Other Nearby Opportunities</Text>
                            {related.otherDevelopers.map(p => (
                                <View key={p.id} style={styles.relatedRow}>
                                    {(p.thumbnailUrl || p.images?.[0]) ? (
                                        <Image src={p.thumbnailUrl || p.images![0]} style={styles.relatedThumb} />
                                    ) : (
                                        <View style={[styles.relatedThumb, { backgroundColor: '#e2e8f0' }]} />
                                    )}
                                    <View style={styles.relatedMeta}>
                                        <Text style={styles.relatedName}>{p.name}</Text>
                                        <Text style={styles.relatedSub}>
                                            {p.developerName} · {p.distance.toFixed(1)} km away
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </>
                    )}

                </View>
            </Page>

        </Document>
    );
};

export default ProjectPdfDocument;
