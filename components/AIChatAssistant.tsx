import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Sparkles, X, MapPin, Play, Building, Landmark as LandmarkIcon, Globe, CheckCircle, Hammer } from 'lucide-react';
import { Project, Landmark } from '../types';
import { calculateDistance } from '../utils/geo';

// ── Types ────────────────────────────────────────────────────────────────
interface AIChatAction {
    label: string;
    sublabel?: string;
    icon: React.ReactNode;
    color: string; // gradient bg class
    onClick: () => void;
}

interface AIChatAssistantProps {
    selectedProject?: Project | null;
    /** Currently selected community (from dropdown, breadcrumb, etc.) */
    selectedCommunity?: string;
    /** Currently selected city */
    selectedCity?: string;
    /** Currently selected developer filter */
    selectedDeveloper?: string;
    /** Currently selected landmark (from map click or search) */
    selectedLandmark?: Landmark | null;
    /** True when any tour/presentation is running — disables chat */
    isTourActive?: boolean;
    /** All live projects */
    allProjects?: Project[];
    /** All landmarks */
    allLandmarks?: Landmark[];
    /** Notify parent when open state changes */
    onOpenChange?: (isOpen: boolean) => void;
    /** Reset all map filters before executing an action */
    clearFilters?: () => void;
}

// ── Helper: capitalize first letter ──────────────────────────────────────
const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

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
    clearFilters,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isChatMinimized, setIsChatMinimized] = useState(false);
    const [isFading, setIsFading] = useState(false);
    const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Listen for global tour state changes
    const [isNeighborhoodTouring, setIsNeighborhoodTouring] = useState(false);
    const [isGlobalTouring, setIsGlobalTouring] = useState(false);

    useEffect(() => {
        const onNeighborhood = (e: Event) => setIsNeighborhoodTouring(!!(e as CustomEvent).detail?.active);
        const onGlobal = (e: Event) => setIsGlobalTouring(!!(e as CustomEvent).detail?.active);
        window.addEventListener('neighborhood-tour-changed', onNeighborhood);
        window.addEventListener('global-tour-changed', onGlobal);
        return () => {
            window.removeEventListener('neighborhood-tour-changed', onNeighborhood);
            window.removeEventListener('global-tour-changed', onGlobal);
        };
    }, []);

    const anyTourActive = isTourActive || isNeighborhoodTouring || isGlobalTouring;
    const AUTO_DISMISS_MS = 12_000;

    const resetTimer = useCallback(() => {
        setIsFading(false);
        if (dismissTimer.current) clearTimeout(dismissTimer.current);
        dismissTimer.current = setTimeout(() => {
            setIsFading(true);
            setTimeout(() => {
                setIsOpen(false);
                setIsChatMinimized(true);
                onOpenChange?.(false);
            }, 500);
        }, AUTO_DISMISS_MS);
    }, [onOpenChange]);

    useEffect(() => {
        return () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); };
    }, []);

    // ── Determine active context ─────────────────────────────────────────
    // Priority: Project > Landmark > Developer > Community > City
    const context = useMemo(() => {
        if (selectedProject) return 'project' as const;
        if (selectedLandmark) return 'landmark' as const;
        if (selectedDeveloper && selectedDeveloper !== 'All') return 'developer' as const;
        if (selectedCommunity) return 'community' as const;
        if (selectedCity) return 'city' as const;
        return null;
    }, [selectedProject, selectedLandmark, selectedDeveloper, selectedCommunity, selectedCity]);

    // ── Context-specific display name ────────────────────────────────────
    const contextName = useMemo(() => {
        if (context === 'project') return selectedProject?.name || '';
        if (context === 'landmark') return selectedLandmark?.name || '';
        if (context === 'developer') return selectedDeveloper || '';
        if (context === 'community') return selectedCommunity || '';
        if (context === 'city') return cap(selectedCity || '');
        return '';
    }, [context, selectedProject, selectedLandmark, selectedDeveloper, selectedCommunity, selectedCity]);

    // ── Build the chat question ──────────────────────────────────────────
    const chatQuestion = useMemo(() => {
        if (!contextName) return '';
        if (context === 'project') return `What would you like to explore about`;
        if (context === 'landmark') return `What would you like to discover near`;
        if (context === 'developer') return `What would you like to explore by`;
        if (context === 'community') return `What would you like to explore in`;
        if (context === 'city') return `What would you like to discover in`;
        return `What would you like to explore about`;
    }, [context, contextName]);

    // ── Compute remote-control actions based on context ───────────────────
    const actions = useMemo<AIChatAction[]>(() => {
        const result: AIChatAction[] = [];

        // ═══════════════════════════════════════════════════════════════════
        // CONTEXT: PROJECT
        // ═══════════════════════════════════════════════════════════════════
        if (context === 'project' && selectedProject) {
            const lat = Number(selectedProject.latitude);
            const lng = Number(selectedProject.longitude);
            const devName = selectedProject.developerName || '';
            const community = selectedProject.community || '';
            const city = selectedProject.city || '';

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
                    onClick: () => {
                        window.dispatchEvent(new CustomEvent('ai-expand-results-panel'));
                        window.dispatchEvent(new CustomEvent('global-tour-start', {
                            detail: { label: community, projects: communityProjects }
                        }));
                    },
                });
            }

            // 2. Nearby Landmarks
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
                    onClick: () => window.dispatchEvent(new CustomEvent('ai-open-neighborhood-tour')),
                });
            }

            // 3. Projects by same Developer
            if (devName && devName !== 'Exclusive' && devName !== 'Unknown Developer') {
                const devProjects = allProjects.filter(
                    p => p.id !== selectedProject.id && p.developerName === devName && p.latitude && p.longitude
                );
                if (devProjects.length > 0) {
                    result.push({
                        label: `Projects by ${devName}`,
                        sublabel: `${devProjects.length} project${devProjects.length === 1 ? '' : 's'}`,
                        icon: <Building className="w-4 h-4" />,
                        color: 'from-violet-500 to-purple-600',
                        onClick: () => {
                            window.dispatchEvent(new CustomEvent('ai-expand-results-panel'));
                            window.dispatchEvent(new CustomEvent('global-tour-start', {
                                detail: { label: `${devName} Showcase`, projects: devProjects.slice(0, 15) }
                            }));
                        },
                    });
                }
            }

            // 4. Off-Plan Projects nearby
            const offPlanNearby = communityProjects.filter(p => p.status?.toLowerCase() === 'off-plan');
            if (offPlanNearby.length > 0) {
                result.push({
                    label: 'Off-Plan Projects',
                    sublabel: `${offPlanNearby.length} in ${community}`,
                    icon: <Hammer className="w-4 h-4" />,
                    color: 'from-amber-500 to-orange-500',
                    onClick: () => {
                        window.dispatchEvent(new CustomEvent('ai-expand-results-panel'));
                        window.dispatchEvent(new CustomEvent('global-tour-start', {
                            detail: { label: `Off-Plan in ${community}`, projects: offPlanNearby }
                        }));
                    },
                });
            }

            // 5. Completed Projects nearby
            const completedNearby = communityProjects.filter(p => p.status?.toLowerCase() === 'completed');
            if (completedNearby.length > 0) {
                result.push({
                    label: 'Completed Projects',
                    sublabel: `${completedNearby.length} in ${community}`,
                    icon: <CheckCircle className="w-4 h-4" />,
                    color: 'from-teal-500 to-emerald-600',
                    onClick: () => {
                        window.dispatchEvent(new CustomEvent('ai-expand-results-panel'));
                        window.dispatchEvent(new CustomEvent('global-tour-start', {
                            detail: { label: `Ready in ${community}`, projects: completedNearby }
                        }));
                    },
                });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // CONTEXT: COMMUNITY
        // ═══════════════════════════════════════════════════════════════════
        if (context === 'community' && selectedCommunity) {
            const commProjects = allProjects.filter(
                p => p.community?.toLowerCase() === selectedCommunity.toLowerCase() && p.latitude && p.longitude
            );

            // 1. All projects in this community
            if (commProjects.length > 0) {
                result.push({
                    label: `Projects in ${selectedCommunity}`,
                    sublabel: `${commProjects.length} project${commProjects.length === 1 ? '' : 's'}`,
                    icon: <MapPin className="w-4 h-4" />,
                    color: 'from-blue-500 to-blue-600',
                    onClick: () => {
                        window.dispatchEvent(new CustomEvent('ai-expand-results-panel'));
                        window.dispatchEvent(new CustomEvent('global-tour-start', {
                            detail: { label: selectedCommunity, projects: commProjects }
                        }));
                    },
                });
            }

            // 2. Top 3 developers in this community
            const devCounts: Record<string, number> = {};
            commProjects.forEach(p => {
                const d = p.developerName;
                if (d && d !== 'Exclusive' && d !== 'Unknown Developer') {
                    devCounts[d] = (devCounts[d] || 0) + 1;
                }
            });
            const topDevs = Object.entries(devCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);

            for (const [devName, count] of topDevs) {
                const devProjects = commProjects.filter(p => p.developerName === devName);
                result.push({
                    label: `Projects by ${devName}`,
                    sublabel: `${count} project${count === 1 ? '' : 's'}`,
                    icon: <Building className="w-4 h-4" />,
                    color: 'from-violet-500 to-purple-600',
                    onClick: () => {
                        window.dispatchEvent(new CustomEvent('ai-expand-results-panel'));
                        window.dispatchEvent(new CustomEvent('global-tour-start', {
                            detail: { label: `${devName} in ${selectedCommunity}`, projects: devProjects }
                        }));
                    },
                });
            }

            // 3. Off-Plan Projects
            const offPlan = commProjects.filter(p => p.status?.toLowerCase() === 'off-plan');
            if (offPlan.length > 0) {
                result.push({
                    label: 'Off-Plan Projects',
                    sublabel: `${offPlan.length} project${offPlan.length === 1 ? '' : 's'}`,
                    icon: <Hammer className="w-4 h-4" />,
                    color: 'from-amber-500 to-orange-500',
                    onClick: () => {
                        window.dispatchEvent(new CustomEvent('ai-expand-results-panel'));
                        window.dispatchEvent(new CustomEvent('global-tour-start', {
                            detail: { label: `Off-Plan in ${selectedCommunity}`, projects: offPlan }
                        }));
                    },
                });
            }

            // 4. Completed Projects
            const completed = commProjects.filter(p => p.status?.toLowerCase() === 'completed');
            if (completed.length > 0) {
                result.push({
                    label: 'Completed Projects',
                    sublabel: `${completed.length} project${completed.length === 1 ? '' : 's'}`,
                    icon: <CheckCircle className="w-4 h-4" />,
                    color: 'from-teal-500 to-emerald-600',
                    onClick: () => {
                        window.dispatchEvent(new CustomEvent('ai-expand-results-panel'));
                        window.dispatchEvent(new CustomEvent('global-tour-start', {
                            detail: { label: `Ready in ${selectedCommunity}`, projects: completed }
                        }));
                    },
                });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // CONTEXT: DEVELOPER
        // ═══════════════════════════════════════════════════════════════════
        if (context === 'developer' && selectedDeveloper && selectedDeveloper !== 'All') {
            const devProjects = allProjects.filter(
                p => p.developerName === selectedDeveloper && p.latitude && p.longitude
            );

            // 1. All projects by this developer
            if (devProjects.length > 0) {
                result.push({
                    label: `${selectedDeveloper} Projects`,
                    sublabel: `${devProjects.length} project${devProjects.length === 1 ? '' : 's'}`,
                    icon: <Building className="w-4 h-4" />,
                    color: 'from-violet-500 to-purple-600',
                    onClick: () => {
                        window.dispatchEvent(new CustomEvent('ai-expand-results-panel'));
                        window.dispatchEvent(new CustomEvent('global-tour-start', {
                            detail: { label: `${selectedDeveloper} Showcase`, projects: devProjects.slice(0, 15) }
                        }));
                    },
                });
            }

            // 2. Developer projects by city
            const cityCounts: Record<string, number> = {};
            devProjects.forEach(p => {
                if (p.city) cityCounts[p.city.toLowerCase()] = (cityCounts[p.city.toLowerCase()] || 0) + 1;
            });
            const topCities = Object.entries(cityCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);

            for (const [cityKey, count] of topCities) {
                const cityDevProjects = devProjects.filter(p => p.city?.toLowerCase() === cityKey);
                result.push({
                    label: `${selectedDeveloper} in ${cap(cityKey)}`,
                    sublabel: `${count} project${count === 1 ? '' : 's'}`,
                    icon: <Globe className="w-4 h-4" />,
                    color: 'from-blue-500 to-indigo-600',
                    onClick: () => {
                        window.dispatchEvent(new CustomEvent('ai-expand-results-panel'));
                        window.dispatchEvent(new CustomEvent('global-tour-start', {
                            detail: { label: `${selectedDeveloper} in ${cap(cityKey)}`, projects: cityDevProjects }
                        }));
                    },
                });
            }

            // 3. Off-Plan by this developer
            const offPlan = devProjects.filter(p => p.status?.toLowerCase() === 'off-plan');
            if (offPlan.length > 0) {
                result.push({
                    label: `Off-Plan ${selectedDeveloper}`,
                    sublabel: `${offPlan.length} project${offPlan.length === 1 ? '' : 's'}`,
                    icon: <Hammer className="w-4 h-4" />,
                    color: 'from-amber-500 to-orange-500',
                    onClick: () => {
                        window.dispatchEvent(new CustomEvent('ai-expand-results-panel'));
                        window.dispatchEvent(new CustomEvent('global-tour-start', {
                            detail: { label: `Off-Plan by ${selectedDeveloper}`, projects: offPlan }
                        }));
                    },
                });
            }

            // 4. Completed by this developer
            const completed = devProjects.filter(p => p.status?.toLowerCase() === 'completed');
            if (completed.length > 0) {
                result.push({
                    label: `Completed ${selectedDeveloper}`,
                    sublabel: `${completed.length} project${completed.length === 1 ? '' : 's'}`,
                    icon: <CheckCircle className="w-4 h-4" />,
                    color: 'from-teal-500 to-emerald-600',
                    onClick: () => {
                        window.dispatchEvent(new CustomEvent('ai-expand-results-panel'));
                        window.dispatchEvent(new CustomEvent('global-tour-start', {
                            detail: { label: `Completed by ${selectedDeveloper}`, projects: completed }
                        }));
                    },
                });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // CONTEXT: LANDMARK (Nearby Place)
        // ═══════════════════════════════════════════════════════════════════
        if (context === 'landmark' && selectedLandmark) {
            const lLat = Number(selectedLandmark.latitude);
            const lLng = Number(selectedLandmark.longitude);
            const landmarkName = selectedLandmark.name || 'Landmark';

            // Get projects sorted by distance from landmark
            const nearbyProjects = allProjects
                .filter(p => p.latitude && p.longitude)
                .map(p => ({
                    ...p,
                    dist: calculateDistance(lLat, lLng, Number(p.latitude), Number(p.longitude))
                }))
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 15);

            // 1. Projects near this landmark
            if (nearbyProjects.length > 0) {
                result.push({
                    label: `Projects Near ${landmarkName}`,
                    sublabel: `${nearbyProjects.length} nearby`,
                    icon: <MapPin className="w-4 h-4" />,
                    color: 'from-blue-500 to-blue-600',
                    onClick: () => {
                        window.dispatchEvent(new CustomEvent('ai-expand-results-panel'));
                        window.dispatchEvent(new CustomEvent('global-tour-start', {
                            detail: { label: `Near ${landmarkName}`, projects: nearbyProjects }
                        }));
                    },
                });
            }

            // 2. Off-Plan near landmark
            const offPlanNearby = nearbyProjects.filter(p => p.status?.toLowerCase() === 'off-plan');
            if (offPlanNearby.length > 0) {
                result.push({
                    label: `Off-Plan Near ${landmarkName}`,
                    sublabel: `${offPlanNearby.length} project${offPlanNearby.length === 1 ? '' : 's'}`,
                    icon: <Hammer className="w-4 h-4" />,
                    color: 'from-amber-500 to-orange-500',
                    onClick: () => {
                        window.dispatchEvent(new CustomEvent('ai-expand-results-panel'));
                        window.dispatchEvent(new CustomEvent('global-tour-start', {
                            detail: { label: `Off-Plan Near ${landmarkName}`, projects: offPlanNearby }
                        }));
                    },
                });
            }

            // 3. Completed near landmark
            const completedNearby = nearbyProjects.filter(p => p.status?.toLowerCase() === 'completed');
            if (completedNearby.length > 0) {
                result.push({
                    label: `Completed Near ${landmarkName}`,
                    sublabel: `${completedNearby.length} project${completedNearby.length === 1 ? '' : 's'}`,
                    icon: <CheckCircle className="w-4 h-4" />,
                    color: 'from-teal-500 to-emerald-600',
                    onClick: () => {
                        window.dispatchEvent(new CustomEvent('ai-expand-results-panel'));
                        window.dispatchEvent(new CustomEvent('global-tour-start', {
                            detail: { label: `Ready Near ${landmarkName}`, projects: completedNearby }
                        }));
                    },
                });
            }

            // 4. Top developers near landmark
            const devCounts: Record<string, number> = {};
            nearbyProjects.forEach(p => {
                const d = p.developerName;
                if (d && d !== 'Exclusive' && d !== 'Unknown Developer') {
                    devCounts[d] = (devCounts[d] || 0) + 1;
                }
            });
            const topDevs = Object.entries(devCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);

            for (const [devName, count] of topDevs) {
                const devNearby = nearbyProjects.filter(p => p.developerName === devName);
                result.push({
                    label: `${devName} Near ${landmarkName}`,
                    sublabel: `${count} project${count === 1 ? '' : 's'}`,
                    icon: <Building className="w-4 h-4" />,
                    color: 'from-violet-500 to-purple-600',
                    onClick: () => {
                        window.dispatchEvent(new CustomEvent('ai-expand-results-panel'));
                        window.dispatchEvent(new CustomEvent('global-tour-start', {
                            detail: { label: `${devName} Near ${landmarkName}`, projects: devNearby }
                        }));
                    },
                });
            }
        }

        return result;
    }, [context, selectedProject?.id, selectedCommunity, selectedDeveloper, selectedCity, selectedLandmark?.id, allProjects, allLandmarks]);

    // ── Unique trigger key — changes when context changes ────────────────
    const triggerKey = useMemo(() => {
        if (context === 'project') return `project-${selectedProject?.id}`;
        if (context === 'landmark') return `landmark-${selectedLandmark?.id}`;
        if (context === 'developer') return `developer-${selectedDeveloper}`;
        if (context === 'community') return `community-${selectedCommunity}`;
        if (context === 'city') return `city-${selectedCity}`;
        return '';
    }, [context, selectedProject?.id, selectedLandmark?.id, selectedDeveloper, selectedCommunity, selectedCity]);

    // ── Open chat whenever context changes (and actions exist) ───────────
    useEffect(() => {
        if (anyTourActive) {
            setIsOpen(false);
            onOpenChange?.(false);
            return;
        }

        if (context && actions.length > 0) {
            setIsOpen(true);
            setIsChatMinimized(false);
            setIsFading(false);
            onOpenChange?.(true);
            // Start auto-dismiss timer
            if (dismissTimer.current) clearTimeout(dismissTimer.current);
            dismissTimer.current = setTimeout(() => {
                setIsFading(true);
                setTimeout(() => {
                    setIsOpen(false);
                    setIsChatMinimized(true);
                    onOpenChange?.(false);
                }, 500);
            }, AUTO_DISMISS_MS);
        } else {
            setIsOpen(false);
            setIsChatMinimized(false);
            onOpenChange?.(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [triggerKey, actions.length, anyTourActive]);

    // ── HARD GUARD: No rendering during tours ────────────────────────────
    if (anyTourActive) return null;

    // ── Floating re-open button (when chat is minimized) ─────────────────
    if (isChatMinimized && context && actions.length > 0) {
        return (
            <button
                onClick={() => {
                    setIsChatMinimized(false);
                    setIsOpen(true);
                    setIsFading(false);
                    onOpenChange?.(true);
                    resetTimer();
                }}
                className="fixed bottom-[110px] left-4 md:left-6 z-[6000] w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 group"
                style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)',
                    boxShadow: '0 6px 24px rgba(79, 70, 229, 0.4)',
                }}
                title="Reopen AI suggestions"
                aria-label="Open AI chat assistant"
            >
                <Sparkles className="w-5 h-5 text-white group-hover:animate-pulse" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-[8px] font-black text-white">{actions.length}</span>
                </span>
            </button>
        );
    }

    if (!isOpen || actions.length === 0) return null;

    return (
        <div
            className="fixed bottom-[110px] left-4 md:left-6 z-[6000] max-w-[380px] flex flex-col items-start gap-3 pointer-events-none"
            style={{
                opacity: isFading ? 0 : 1,
                transform: isFading ? 'translateY(12px) scale(0.96)' : 'translateY(0) scale(1)',
                transition: 'opacity 0.5s ease, transform 0.5s ease',
            }}
            onMouseEnter={resetTimer}
            onClick={resetTimer}
        >
            {/* ── AI Chat Bubble ──────────────────────────────────────────── */}
            <div className="flex items-start gap-3 pointer-events-auto">
                {/* AI Avatar */}
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center relative overflow-hidden"
                        style={{
                            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)',
                            boxShadow: '0 4px 20px rgba(79, 70, 229, 0.35)',
                        }}
                    >
                        <Sparkles className="w-5 h-5 text-indigo-100" />
                        <div className="absolute inset-0 rounded-2xl animate-ping opacity-20 bg-indigo-400" style={{ animationDuration: '3s' }} />
                    </div>
                </div>

                {/* Message */}
                <div className="relative bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl rounded-tl-none px-4 py-3 shadow-xl max-w-[300px]">
                    <p className="text-[13px] font-bold text-slate-800 leading-relaxed">
                        {chatQuestion}{' '}
                        <span className="text-indigo-600 font-black">{contextName}</span>?
                    </p>
                    <button
                        onClick={() => { setIsOpen(false); setIsChatMinimized(true); onOpenChange?.(false); }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-700 hover:scale-110 transition-all"
                        aria-label="Dismiss AI chat"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* ── Action Buttons (max 6 shown to avoid clutter) ─────────── */}
            <div className="flex flex-col gap-2 pl-[52px] pointer-events-auto w-full max-w-[320px]">
                {actions.slice(0, 6).map((act, i) => (
                    <button
                        key={i}
                        onClick={() => {
                            if (clearFilters) clearFilters();
                            setTimeout(() => act.onClick(), 50);
                            setIsOpen(false);
                            setIsChatMinimized(false);
                            onOpenChange?.(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/60 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group text-left"
                    >
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${act.color} flex items-center justify-center shrink-0 shadow-md group-hover:shadow-lg transition-shadow`}>
                            <span className="text-white">{act.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-sm font-black text-slate-800 tracking-tight block truncate">
                                {act.label}
                            </span>
                            {act.sublabel && (
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {act.sublabel}
                                </span>
                            )}
                        </div>
                        <Play className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0 fill-current" />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default AIChatAssistant;
