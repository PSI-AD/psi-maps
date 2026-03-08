import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Sparkles, X, MapPin, Play, Building, Landmark as LandmarkIcon, Globe, CheckCircle, Hammer, MessageSquare, Search } from 'lucide-react';
import { Project, Landmark } from '../types';
import { calculateDistance } from '../utils/geo';

// ── Types ────────────────────────────────────────────────────────────────
interface AIChatAction {
    label: string;
    sublabel?: string;
    icon: React.ReactNode;
    color: string;
    onClick: () => void;
}

type ChatStyle = 'classic' | 'modern';

interface AIChatAssistantProps {
    selectedProject?: Project | null;
    selectedCommunity?: string;
    selectedCity?: string;
    selectedDeveloper?: string;
    selectedLandmark?: Landmark | null;
    isTourActive?: boolean;
    allProjects?: Project[];
    allLandmarks?: Landmark[];
    onOpenChange?: (isOpen: boolean) => void;
    /** Apply filters atomically — resets unspecified filters to defaults */
    onApplyFilters?: (filters: { developer?: string; status?: string; community?: string; city?: string }) => void;
    clearFilters?: () => void; // kept for backwards compat but NOT used
}

// ── Helpers ──────────────────────────────────────────────────────────────
const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

const isExcludedDeveloper = (name?: string): boolean => {
    if (!name) return true;
    const lower = name.toLowerCase().trim();
    return ['none', 'exclusive', 'unknown', 'unknown developer', 'n/a', '', 'na', 'tba', 'tbd'].includes(lower);
};

const getSavedStyle = (): ChatStyle => {
    try { return (localStorage.getItem('psi_ai_chat_style') as ChatStyle) || 'modern'; }
    catch { return 'modern'; }
};

// ── Component ────────────────────────────────────────────────────────────
const AIChatAssistant: React.FC<AIChatAssistantProps> = ({
    selectedProject,
    selectedCommunity,
    selectedCity,
    selectedDeveloper,
    selectedLandmark,
    isTourActive = false,
    allProjects = [],
    allLandmarks = [],
    onOpenChange,
    onApplyFilters,
}) => {
    // isOpen = whether the suggestions PANEL is expanded
    const [isOpen, setIsOpen] = useState(false);
    const [isFading, setIsFading] = useState(false);
    const [chatStyle, setChatStyle] = useState<ChatStyle>(getSavedStyle);
    const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── ROBUST tour guard ────────────────────────────────────────────────
    const tourActiveRef = useRef(false);
    const [isNeighborhoodTouring, setIsNeighborhoodTouring] = useState(false);
    const [isGlobalTouring, setIsGlobalTouring] = useState(false);
    const [isTourStarting, setIsTourStarting] = useState(false);

    useEffect(() => {
        const onNeighborhood = (e: Event) => {
            const active = !!(e as CustomEvent).detail?.active;
            tourActiveRef.current = active || isGlobalTouring || isTourActive;
            setIsNeighborhoodTouring(active);
            if (!active) setIsTourStarting(false);
        };
        const onGlobal = (e: Event) => {
            const active = !!(e as CustomEvent).detail?.active;
            tourActiveRef.current = active || isNeighborhoodTouring || isTourActive;
            setIsGlobalTouring(active);
            if (!active) setIsTourStarting(false);
        };
        const onTourStart = () => {
            tourActiveRef.current = true;
            setIsTourStarting(true);
            setIsOpen(false);
            onOpenChange?.(false);
        };
        const onNeighborhoodStart = () => {
            tourActiveRef.current = true;
            setIsTourStarting(true);
            setIsOpen(false);
            onOpenChange?.(false);
        };

        window.addEventListener('neighborhood-tour-changed', onNeighborhood);
        window.addEventListener('global-tour-changed', onGlobal);
        window.addEventListener('global-tour-start', onTourStart);
        window.addEventListener('ai-open-neighborhood-tour', onNeighborhoodStart);
        return () => {
            window.removeEventListener('neighborhood-tour-changed', onNeighborhood);
            window.removeEventListener('global-tour-changed', onGlobal);
            window.removeEventListener('global-tour-start', onTourStart);
            window.removeEventListener('ai-open-neighborhood-tour', onNeighborhoodStart);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isGlobalTouring, isNeighborhoodTouring, isTourActive]);

    const anyTourActive = isTourActive || isNeighborhoodTouring || isGlobalTouring || isTourStarting;
    useEffect(() => { tourActiveRef.current = anyTourActive; }, [anyTourActive]);

    // Listen for style changes from settings
    useEffect(() => {
        const handler = (e: Event) => {
            const style = (e as CustomEvent).detail?.style;
            if (style === 'classic' || style === 'modern') {
                setChatStyle(style);
                localStorage.setItem('psi_ai_chat_style', style);
            }
        };
        window.addEventListener('ai-chat-style-changed', handler);
        return () => window.removeEventListener('ai-chat-style-changed', handler);
    }, []);

    const AUTO_DISMISS_MS = 14_000;

    const resetTimer = useCallback(() => {
        setIsFading(false);
        if (dismissTimer.current) clearTimeout(dismissTimer.current);
        dismissTimer.current = setTimeout(() => {
            setIsFading(true);
            setTimeout(() => {
                setIsOpen(false);
                onOpenChange?.(false);
            }, 500);
        }, AUTO_DISMISS_MS);
    }, [onOpenChange]);

    useEffect(() => {
        return () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); };
    }, []);

    // ── Determine active context ─────────────────────────────────────────
    const context = useMemo(() => {
        if (selectedProject) return 'project' as const;
        if (selectedLandmark) return 'landmark' as const;
        if (selectedDeveloper && selectedDeveloper !== 'All') return 'developer' as const;
        if (selectedCommunity) return 'community' as const;
        if (selectedCity) return 'city' as const;
        return null;
    }, [selectedProject, selectedLandmark, selectedDeveloper, selectedCommunity, selectedCity]);

    const contextName = useMemo(() => {
        if (context === 'project') return selectedProject?.name || '';
        if (context === 'landmark') return selectedLandmark?.name || '';
        if (context === 'developer') return selectedDeveloper || '';
        if (context === 'community') return selectedCommunity || '';
        if (context === 'city') return cap(selectedCity || '');
        return '';
    }, [context, selectedProject, selectedLandmark, selectedDeveloper, selectedCommunity, selectedCity]);

    const chatQuestion = useMemo(() => {
        if (context === 'project') return `What would you like to explore about`;
        if (context === 'landmark') return `What would you like to discover near`;
        if (context === 'developer') return `What would you like to explore by`;
        if (context === 'community') return `What would you like to explore in`;
        if (context === 'city') return `What would you like to discover in`;
        return '';
    }, [context]);

    // ── Helper: dispatch tour + apply filters atomically ─────────────────
    const startTourWithFilters = useCallback((
        label: string,
        projects: Project[],
        filters: { developer?: string; status?: string; community?: string; city?: string } = {},
        expandPanel: boolean = true,
    ) => {
        // Atomic filter application: sets specified values, resets others to default
        if (onApplyFilters) onApplyFilters(filters);

        // Small delay for React to process filter state before starting tour
        setTimeout(() => {
            if (expandPanel) {
                window.dispatchEvent(new CustomEvent('ai-expand-results-panel'));
            }
            window.dispatchEvent(new CustomEvent('global-tour-start', {
                detail: { label, projects }
            }));
        }, 60);
    }, [onApplyFilters]);

    // ── Compute remote-control actions ───────────────────────────────────
    const actions = useMemo<AIChatAction[]>(() => {
        const result: AIChatAction[] = [];

        // ══════════════════ CONTEXT: PROJECT ══════════════════
        if (context === 'project' && selectedProject) {
            const lat = Number(selectedProject.latitude);
            const lng = Number(selectedProject.longitude);
            const devName = selectedProject.developerName || '';
            const community = selectedProject.community || '';

            // 1. Nearby Projects (same community)
            const communityProjects = allProjects.filter(
                p => p.id !== selectedProject.id &&
                    p.community?.toLowerCase() === community.toLowerCase() &&
                    p.latitude && p.longitude
            );
            if (communityProjects.length > 0) {
                result.push({
                    label: `Projects in ${community}`,
                    sublabel: `${communityProjects.length} nearby`,
                    icon: <MapPin className="w-4 h-4" />,
                    color: 'from-blue-500 to-blue-600',
                    onClick: () => startTourWithFilters(community, communityProjects, { community }),
                });
            }

            // 2. Nearby Landmarks — NO panel expansion
            const nearbyLandmarks = allLandmarks
                .filter(l => l.latitude && l.longitude && !l.isHidden)
                .map(l => ({ ...l, dist: calculateDistance(lat, lng, Number(l.latitude), Number(l.longitude)) }))
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 15);
            if (nearbyLandmarks.length > 0) {
                result.push({
                    label: 'Nearby Landmarks',
                    sublabel: `${nearbyLandmarks.length} places`,
                    icon: <LandmarkIcon className="w-4 h-4" />,
                    color: 'from-emerald-500 to-emerald-600',
                    onClick: () => {
                        // Landmark tour: do NOT expand panel, just trigger neighbourhood
                        window.dispatchEvent(new CustomEvent('ai-open-neighborhood-tour'));
                    },
                });
            }

            // 3. Projects by same Developer
            if (!isExcludedDeveloper(devName)) {
                const devProjects = allProjects.filter(
                    p => p.id !== selectedProject.id && p.developerName === devName && p.latitude && p.longitude
                );
                if (devProjects.length > 0) {
                    result.push({
                        label: `Projects by ${devName}`,
                        sublabel: `${devProjects.length} project${devProjects.length === 1 ? '' : 's'}`,
                        icon: <Building className="w-4 h-4" />,
                        color: 'from-violet-500 to-purple-600',
                        onClick: () => startTourWithFilters(`${devName} Showcase`, devProjects.slice(0, 15), { developer: devName }),
                    });
                }
            }

            // 4. Off-Plan nearby
            const offPlanNearby = communityProjects.filter(p => p.status?.toLowerCase() === 'off-plan');
            if (offPlanNearby.length > 0) {
                result.push({
                    label: 'Off-Plan Projects',
                    sublabel: `${offPlanNearby.length} in ${community}`,
                    icon: <Hammer className="w-4 h-4" />,
                    color: 'from-amber-500 to-orange-500',
                    onClick: () => startTourWithFilters(`Off-Plan in ${community}`, offPlanNearby, { community, status: 'Off-Plan' }),
                });
            }

            // 5. Completed nearby
            const completedNearby = communityProjects.filter(p => p.status?.toLowerCase() === 'completed');
            if (completedNearby.length > 0) {
                result.push({
                    label: 'Completed Projects',
                    sublabel: `${completedNearby.length} in ${community}`,
                    icon: <CheckCircle className="w-4 h-4" />,
                    color: 'from-teal-500 to-emerald-600',
                    onClick: () => startTourWithFilters(`Ready in ${community}`, completedNearby, { community, status: 'Completed' }),
                });
            }
        }

        // ══════════════════ CONTEXT: COMMUNITY ══════════════════
        if (context === 'community' && selectedCommunity) {
            const commProjects = allProjects.filter(
                p => p.community?.toLowerCase() === selectedCommunity.toLowerCase() && p.latitude && p.longitude
            );

            if (commProjects.length > 0) {
                result.push({
                    label: `Projects in ${selectedCommunity}`,
                    sublabel: `${commProjects.length} project${commProjects.length === 1 ? '' : 's'}`,
                    icon: <MapPin className="w-4 h-4" />,
                    color: 'from-blue-500 to-blue-600',
                    onClick: () => startTourWithFilters(selectedCommunity, commProjects, { community: selectedCommunity }),
                });
            }

            // Top 3 developers
            const devCounts: Record<string, number> = {};
            commProjects.forEach(p => {
                if (!isExcludedDeveloper(p.developerName)) {
                    devCounts[p.developerName!] = (devCounts[p.developerName!] || 0) + 1;
                }
            });
            Object.entries(devCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).forEach(([devName, count]) => {
                const devProjects = commProjects.filter(p => p.developerName === devName);
                result.push({
                    label: `Projects by ${devName}`,
                    sublabel: `${count} project${count === 1 ? '' : 's'}`,
                    icon: <Building className="w-4 h-4" />,
                    color: 'from-violet-500 to-purple-600',
                    onClick: () => startTourWithFilters(`${devName} in ${selectedCommunity}`, devProjects, { community: selectedCommunity, developer: devName }),
                });
            });

            const offPlan = commProjects.filter(p => p.status?.toLowerCase() === 'off-plan');
            if (offPlan.length > 0) {
                result.push({
                    label: 'Off-Plan Projects',
                    sublabel: `${offPlan.length} project${offPlan.length === 1 ? '' : 's'}`,
                    icon: <Hammer className="w-4 h-4" />,
                    color: 'from-amber-500 to-orange-500',
                    onClick: () => startTourWithFilters(`Off-Plan in ${selectedCommunity}`, offPlan, { community: selectedCommunity, status: 'Off-Plan' }),
                });
            }

            const completed = commProjects.filter(p => p.status?.toLowerCase() === 'completed');
            if (completed.length > 0) {
                result.push({
                    label: 'Completed Projects',
                    sublabel: `${completed.length} project${completed.length === 1 ? '' : 's'}`,
                    icon: <CheckCircle className="w-4 h-4" />,
                    color: 'from-teal-500 to-emerald-600',
                    onClick: () => startTourWithFilters(`Ready in ${selectedCommunity}`, completed, { community: selectedCommunity, status: 'Completed' }),
                });
            }
        }

        // ══════════════════ CONTEXT: DEVELOPER ══════════════════
        if (context === 'developer' && selectedDeveloper && selectedDeveloper !== 'All') {
            const devProjects = allProjects.filter(
                p => p.developerName === selectedDeveloper && p.latitude && p.longitude
            );

            if (devProjects.length > 0) {
                result.push({
                    label: `${selectedDeveloper} Projects`,
                    sublabel: `${devProjects.length} project${devProjects.length === 1 ? '' : 's'}`,
                    icon: <Building className="w-4 h-4" />,
                    color: 'from-violet-500 to-purple-600',
                    onClick: () => startTourWithFilters(`${selectedDeveloper} Showcase`, devProjects.slice(0, 15), { developer: selectedDeveloper }),
                });
            }

            const cityCounts: Record<string, number> = {};
            devProjects.forEach(p => { if (p.city) cityCounts[p.city.toLowerCase()] = (cityCounts[p.city.toLowerCase()] || 0) + 1; });
            Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).forEach(([cityKey, count]) => {
                const cityDevProjects = devProjects.filter(p => p.city?.toLowerCase() === cityKey);
                result.push({
                    label: `${selectedDeveloper} in ${cap(cityKey)}`,
                    sublabel: `${count} project${count === 1 ? '' : 's'}`,
                    icon: <Globe className="w-4 h-4" />,
                    color: 'from-blue-500 to-indigo-600',
                    onClick: () => startTourWithFilters(`${selectedDeveloper} in ${cap(cityKey)}`, cityDevProjects, { developer: selectedDeveloper, city: cityKey }),
                });
            });

            const offPlan = devProjects.filter(p => p.status?.toLowerCase() === 'off-plan');
            if (offPlan.length > 0) {
                result.push({
                    label: `Off-Plan ${selectedDeveloper}`,
                    sublabel: `${offPlan.length} project${offPlan.length === 1 ? '' : 's'}`,
                    icon: <Hammer className="w-4 h-4" />,
                    color: 'from-amber-500 to-orange-500',
                    onClick: () => startTourWithFilters(`Off-Plan by ${selectedDeveloper}`, offPlan, { developer: selectedDeveloper, status: 'Off-Plan' }),
                });
            }

            const completed = devProjects.filter(p => p.status?.toLowerCase() === 'completed');
            if (completed.length > 0) {
                result.push({
                    label: `Completed ${selectedDeveloper}`,
                    sublabel: `${completed.length} project${completed.length === 1 ? '' : 's'}`,
                    icon: <CheckCircle className="w-4 h-4" />,
                    color: 'from-teal-500 to-emerald-600',
                    onClick: () => startTourWithFilters(`Completed by ${selectedDeveloper}`, completed, { developer: selectedDeveloper, status: 'Completed' }),
                });
            }
        }

        // ══════════════════ CONTEXT: LANDMARK ══════════════════
        if (context === 'landmark' && selectedLandmark) {
            const lLat = Number(selectedLandmark.latitude);
            const lLng = Number(selectedLandmark.longitude);
            const landmarkName = selectedLandmark.name || 'Landmark';

            const nearbyProjects = allProjects
                .filter(p => p.latitude && p.longitude)
                .map(p => ({ ...p, dist: calculateDistance(lLat, lLng, Number(p.latitude), Number(p.longitude)) }))
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 15);

            if (nearbyProjects.length > 0) {
                result.push({
                    label: `Projects Near ${landmarkName}`,
                    sublabel: `${nearbyProjects.length} nearby`,
                    icon: <MapPin className="w-4 h-4" />,
                    color: 'from-blue-500 to-blue-600',
                    onClick: () => startTourWithFilters(`Near ${landmarkName}`, nearbyProjects),
                });
            }

            const offPlanNearby = nearbyProjects.filter(p => p.status?.toLowerCase() === 'off-plan');
            if (offPlanNearby.length > 0) {
                result.push({
                    label: `Off-Plan Near ${landmarkName}`,
                    sublabel: `${offPlanNearby.length} project${offPlanNearby.length === 1 ? '' : 's'}`,
                    icon: <Hammer className="w-4 h-4" />,
                    color: 'from-amber-500 to-orange-500',
                    onClick: () => startTourWithFilters(`Off-Plan Near ${landmarkName}`, offPlanNearby, { status: 'Off-Plan' }),
                });
            }

            const completedNearby = nearbyProjects.filter(p => p.status?.toLowerCase() === 'completed');
            if (completedNearby.length > 0) {
                result.push({
                    label: `Completed Near ${landmarkName}`,
                    sublabel: `${completedNearby.length} project${completedNearby.length === 1 ? '' : 's'}`,
                    icon: <CheckCircle className="w-4 h-4" />,
                    color: 'from-teal-500 to-emerald-600',
                    onClick: () => startTourWithFilters(`Ready Near ${landmarkName}`, completedNearby, { status: 'Completed' }),
                });
            }

            const devCounts: Record<string, number> = {};
            nearbyProjects.forEach(p => {
                if (!isExcludedDeveloper(p.developerName)) {
                    devCounts[p.developerName!] = (devCounts[p.developerName!] || 0) + 1;
                }
            });
            Object.entries(devCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).forEach(([devName, count]) => {
                const devNearby = nearbyProjects.filter(p => p.developerName === devName);
                result.push({
                    label: `${devName} Near ${landmarkName}`,
                    sublabel: `${count} project${count === 1 ? '' : 's'}`,
                    icon: <Building className="w-4 h-4" />,
                    color: 'from-violet-500 to-purple-600',
                    onClick: () => startTourWithFilters(`${devName} Near ${landmarkName}`, devNearby, { developer: devName }),
                });
            });
        }

        return result;
    }, [context, selectedProject?.id, selectedCommunity, selectedDeveloper, selectedCity, selectedLandmark?.id, allProjects, allLandmarks, startTourWithFilters]);

    // ── Trigger key ─────────────────────────────────────────────────────
    const triggerKey = useMemo(() => {
        if (context === 'project') return `project-${selectedProject?.id}`;
        if (context === 'landmark') return `landmark-${selectedLandmark?.id}`;
        if (context === 'developer') return `developer-${selectedDeveloper}`;
        if (context === 'community') return `community-${selectedCommunity}`;
        if (context === 'city') return `city-${selectedCity}`;
        return 'none';
    }, [context, selectedProject?.id, selectedLandmark?.id, selectedDeveloper, selectedCommunity, selectedCity]);

    // ── Auto-open panel when context changes (NEVER during tour) ─────────
    useEffect(() => {
        if (anyTourActive || tourActiveRef.current) {
            setIsOpen(false);
            onOpenChange?.(false);
            return;
        }

        if (context && actions.length > 0) {
            setIsOpen(true);
            setIsFading(false);
            onOpenChange?.(true);
            if (dismissTimer.current) clearTimeout(dismissTimer.current);
            dismissTimer.current = setTimeout(() => {
                setIsFading(true);
                setTimeout(() => {
                    setIsOpen(false);
                    onOpenChange?.(false);
                }, 500);
            }, AUTO_DISMISS_MS);
        } else {
            setIsOpen(false);
            onOpenChange?.(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [triggerKey, actions.length, anyTourActive]);

    // ═══════════════════════════════════════════════════════════════════════
    // RENDERING
    // ═══════════════════════════════════════════════════════════════════════

    // HARD GUARD: nothing renders during tours
    if (anyTourActive || tourActiveRef.current) return null;

    const handleAction = (act: AIChatAction) => {
        act.onClick();
        setIsOpen(false);
        onOpenChange?.(false);
    };

    const openPanel = () => {
        if (tourActiveRef.current || anyTourActive) return;
        setIsOpen(true);
        setIsFading(false);
        onOpenChange?.(true);
        resetTimer();
    };

    const closePanel = () => {
        setIsOpen(false);
        onOpenChange?.(false);
    };

    const hasContext = context && actions.length > 0;
    const shownActions = actions.slice(0, 6);

    const fadeStyle = {
        opacity: isFading ? 0 : 1,
        transform: isFading ? 'translateY(12px) scale(0.96)' : 'translateY(0) scale(1)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
    };

    // ── FLOATING BUTTON — ALWAYS VISIBLE (except during tours) ──────────
    if (!isOpen) {
        return (
            <button
                onClick={openPanel}
                className="fixed bottom-[110px] left-4 md:left-6 z-[6000] w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 group"
                style={{
                    background: hasContext
                        ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)'
                        : 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
                    boxShadow: hasContext
                        ? '0 6px 24px rgba(79, 70, 229, 0.4)'
                        : '0 4px 16px rgba(100, 116, 139, 0.3)',
                }}
                title={hasContext ? `AI suggestions for ${contextName}` : 'AI Assistant'}
                aria-label="Open AI chat assistant"
            >
                <Sparkles className="w-5 h-5 text-white group-hover:animate-pulse" />
                {hasContext && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center">
                        <span className="text-[8px] font-black text-white">{actions.length > 6 ? '6+' : actions.length}</span>
                    </span>
                )}
            </button>
        );
    }

    // ── NO CONTEXT — Generic prompt ─────────────────────────────────────
    if (!hasContext) {
        return (
            <div
                className="fixed bottom-[110px] left-4 md:left-6 z-[6000] pointer-events-auto"
                style={fadeStyle}
            >
                <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)' }}>
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                    </div>
                    <div className="relative bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl rounded-tl-none px-4 py-3 shadow-xl max-w-[280px]">
                        <p className="text-[13px] font-bold text-slate-600 leading-relaxed flex items-center gap-2">
                            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            Search for a project, community, or developer to get AI suggestions.
                        </p>
                        <button
                            onClick={closePanel}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-700 hover:scale-110 transition-all"
                            aria-label="Close"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STYLE 1: Classic — Card panel
    // ═══════════════════════════════════════════════════════════════════════
    if (chatStyle === 'classic') {
        return (
            <div
                className="fixed bottom-[110px] left-4 md:left-6 z-[6000] w-[340px] pointer-events-auto"
                style={fadeStyle}
                onMouseEnter={resetTimer}
                onClick={resetTimer}
            >
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 px-5 py-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/30 backdrop-blur flex items-center justify-center shrink-0">
                            <MessageSquare className="w-4.5 h-4.5 text-indigo-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">AI Assistant</p>
                            <p className="text-sm font-bold text-white truncate mt-0.5">{contextName}</p>
                        </div>
                        <button onClick={closePanel}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all shrink-0"
                            aria-label="Close">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                        <p className="text-[13px] font-bold text-slate-600 leading-relaxed">
                            {chatQuestion} <span className="text-indigo-600 font-black">{contextName}</span>?
                        </p>
                    </div>
                    <div className="p-3 space-y-1.5 max-h-[320px] overflow-y-auto">
                        {shownActions.map((act, i) => (
                            <button key={i} onClick={() => handleAction(act)}
                                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-slate-50 transition-all group text-left">
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${act.color} flex items-center justify-center shrink-0 shadow-sm group-hover:shadow-md transition-shadow`}>
                                    <span className="text-white">{act.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[13px] font-bold text-slate-800 block truncate">{act.label}</span>
                                    {act.sublabel && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{act.sublabel}</span>}
                                </div>
                                <Play className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0 fill-current" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STYLE 2: Modern — Floating bubble
    // ═══════════════════════════════════════════════════════════════════════
    return (
        <div
            className="fixed bottom-[110px] left-4 md:left-6 z-[6000] max-w-[380px] flex flex-col items-start gap-3 pointer-events-none"
            style={fadeStyle}
            onMouseEnter={resetTimer}
            onClick={resetTimer}
        >
            <div className="flex items-start gap-3 pointer-events-auto">
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center relative overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)', boxShadow: '0 4px 20px rgba(79, 70, 229, 0.35)' }}>
                        <Sparkles className="w-5 h-5 text-indigo-100" />
                        <div className="absolute inset-0 rounded-2xl animate-ping opacity-20 bg-indigo-400" style={{ animationDuration: '3s' }} />
                    </div>
                </div>
                <div className="relative bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl rounded-tl-none px-4 py-3 shadow-xl max-w-[300px]">
                    <p className="text-[13px] font-bold text-slate-800 leading-relaxed">
                        {chatQuestion}{' '}
                        <span className="text-indigo-600 font-black">{contextName}</span>?
                    </p>
                    <button onClick={closePanel}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-700 hover:scale-110 transition-all"
                        aria-label="Close">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            <div className="flex flex-col gap-2 pl-[52px] pointer-events-auto w-full max-w-[320px]">
                {shownActions.map((act, i) => (
                    <button key={i} onClick={() => handleAction(act)}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/60 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group text-left">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${act.color} flex items-center justify-center shrink-0 shadow-md group-hover:shadow-lg transition-shadow`}>
                            <span className="text-white">{act.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-sm font-black text-slate-800 tracking-tight block truncate">{act.label}</span>
                            {act.sublabel && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{act.sublabel}</span>}
                        </div>
                        <Play className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0 fill-current" />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default AIChatAssistant;
