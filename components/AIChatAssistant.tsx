import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Sparkles, X, MapPin, Play, Building, Landmark as LandmarkIcon, Globe } from 'lucide-react';
import { Project, Landmark } from '../types';
import { calculateDistance } from '../utils/geo';

// ── Types ────────────────────────────────────────────────────────────────
interface AIChatAction {
    label: string;
    sublabel?: string;
    icon: React.ReactNode;
    color: string; // gradient or solid bg class
    onClick: () => void;
}

interface AIChatAssistantProps {
    selectedProject?: Project | null;
    /** True when any tour/presentation is running — disables chat */
    isTourActive?: boolean;
    /** All live projects — used to compute nearby, developer, and city subsets */
    allProjects?: Project[];
    /** All landmarks — used for Nearby Landmarks count check */
    allLandmarks?: Landmark[];
    /** Notify parent when open state changes */
    onOpenChange?: (isOpen: boolean) => void;
    /** Reset all map filters before executing an action */
    clearFilters?: () => void;
}

// ── Component ────────────────────────────────────────────────────────────
const AIChatAssistant: React.FC<AIChatAssistantProps> = ({
    selectedProject,
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

    // ── Compute "remote control" actions based on selected project ────────
    const actions = useMemo<AIChatAction[]>(() => {
        if (!selectedProject) return [];

        const lat = Number(selectedProject.latitude);
        const lng = Number(selectedProject.longitude);
        const devName = selectedProject.developerName || '';
        const community = selectedProject.community || '';
        const city = selectedProject.city || '';
        const result: AIChatAction[] = [];

        // 1. Nearby Projects — filter by same community
        const communityProjects = allProjects.filter(
            p => p.id !== selectedProject.id &&
                p.community?.toLowerCase() === community.toLowerCase() &&
                p.latitude && p.longitude
        );
        if (communityProjects.length > 0) {
            result.push({
                label: 'Nearby Projects',
                sublabel: `${communityProjects.length} in ${community}`,
                icon: <MapPin className="w-4 h-4" />,
                color: 'from-blue-500 to-blue-600',
                onClick: () => {
                    // Same as pressing the Community Play Button
                    window.dispatchEvent(new CustomEvent('ai-expand-results-panel'));
                    window.dispatchEvent(new CustomEvent('global-tour-start', {
                        detail: { label: community, projects: communityProjects }
                    }));
                },
            });
        }

        // 2. Nearby Landmarks — check if landmarks exist near the project
        const nearbyLandmarks = allLandmarks
            .filter(l => l.latitude && l.longitude && !l.isHidden)
            .map(l => ({
                ...l,
                dist: calculateDistance(lat, lng, Number(l.latitude), Number(l.longitude))
            }))
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 15);

        if (nearbyLandmarks.length > 0) {
            result.push({
                label: 'Nearby Landmarks',
                sublabel: `${nearbyLandmarks.length} places`,
                icon: <LandmarkIcon className="w-4 h-4" />,
                color: 'from-emerald-500 to-emerald-600',
                onClick: () => {
                    // Same as pressing Explore Neighborhood → Play
                    window.dispatchEvent(new CustomEvent('ai-open-neighborhood-tour'));
                },
            });
        }

        // 3. Projects by the Same Developer
        if (devName && devName !== 'Exclusive' && devName !== 'Unknown Developer') {
            const devProjects = allProjects.filter(
                p => p.id !== selectedProject.id &&
                    p.developerName === devName &&
                    p.latitude && p.longitude
            );
            if (devProjects.length > 0) {
                result.push({
                    label: `Projects by ${devName}`,
                    sublabel: `${devProjects.length} project${devProjects.length === 1 ? '' : 's'}`,
                    icon: <Building className="w-4 h-4" />,
                    color: 'from-violet-500 to-purple-600',
                    onClick: () => {
                        // Community Play Button with developer filter
                        window.dispatchEvent(new CustomEvent('ai-expand-results-panel'));
                        window.dispatchEvent(new CustomEvent('global-tour-start', {
                            detail: { label: `${devName} Showcase`, projects: devProjects.slice(0, 15) }
                        }));
                    },
                });
            }
        }

        // 4. Projects in the same City
        if (city) {
            const cityProjects = allProjects.filter(
                p => p.id !== selectedProject.id &&
                    p.city?.toLowerCase() === city.toLowerCase() &&
                    p.latitude && p.longitude
            );
            if (cityProjects.length > 0) {
                result.push({
                    label: `Projects in ${city.charAt(0).toUpperCase() + city.slice(1)}`,
                    sublabel: `${cityProjects.length} project${cityProjects.length === 1 ? '' : 's'}`,
                    icon: <Globe className="w-4 h-4" />,
                    color: 'from-amber-500 to-orange-500',
                    onClick: () => {
                        // Community Play Button with city filter
                        window.dispatchEvent(new CustomEvent('ai-expand-results-panel'));
                        window.dispatchEvent(new CustomEvent('global-tour-start', {
                            detail: { label: `${city} Tour`, projects: cityProjects.slice(0, 15) }
                        }));
                    },
                });
            }
        }

        return result;
    }, [selectedProject?.id, allProjects, allLandmarks]);

    // ── Open chat whenever a project is selected (and actions exist) ──────
    useEffect(() => {
        if (anyTourActive) {
            setIsOpen(false);
            onOpenChange?.(false);
            return;
        }

        if (selectedProject && actions.length > 0) {
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
    }, [selectedProject?.id, actions.length, anyTourActive]);

    // ── HARD GUARD: No rendering during tours ────────────────────────────
    if (anyTourActive) return null;

    // ── Floating re-open button (when chat is minimized) ─────────────────
    if (isChatMinimized && selectedProject && actions.length > 0) {
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
                {/* Notification dot */}
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
                        {/* Subtle pulse ring */}
                        <div className="absolute inset-0 rounded-2xl animate-ping opacity-20 bg-indigo-400" style={{ animationDuration: '3s' }} />
                    </div>
                </div>

                {/* Message */}
                <div className="bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl rounded-tl-none px-4 py-3 shadow-xl max-w-[300px]">
                    <p className="text-[13px] font-bold text-slate-800 leading-relaxed">
                        What would you like to explore about{' '}
                        <span className="text-indigo-600 font-black">{selectedProject?.name}</span>?
                    </p>
                    {/* Close */}
                    <button
                        onClick={() => { setIsOpen(false); setIsChatMinimized(true); onOpenChange?.(false); }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-700 hover:scale-110 transition-all"
                        aria-label="Dismiss AI chat"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* ── Action Buttons ───────────────────────────────────────── */}
            <div className="flex flex-col gap-2 pl-[52px] pointer-events-auto w-full max-w-[320px]">
                {actions.map((act, i) => (
                    <button
                        key={i}
                        onClick={() => {
                            // 1. Clear existing filters
                            if (clearFilters) clearFilters();
                            // 2. Trigger the existing system button after state clears
                            setTimeout(() => act.onClick(), 50);
                            // 3. Close the chat
                            setIsOpen(false);
                            setIsChatMinimized(false);
                            onOpenChange?.(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/60 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group text-left"
                    >
                        {/* Icon pill */}
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${act.color} flex items-center justify-center shrink-0 shadow-md group-hover:shadow-lg transition-shadow`}>
                            <span className="text-white">{act.icon}</span>
                        </div>

                        {/* Text */}
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

                        {/* Play indicator */}
                        <Play className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0 fill-current" />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default AIChatAssistant;
