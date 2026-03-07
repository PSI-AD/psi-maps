import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, X, Eye, Navigation, Map, Compass, Volume2, VolumeX, LocateFixed, Landmark as LandmarkIcon, Film, Play } from 'lucide-react';
import { Project, Landmark, ClientPresentation } from '../types';
import { calculateDistance } from '../utils/geo';

interface ChatAction {
    label: string;
    icon: React.ReactNode;
    isDismiss?: boolean;
    onClick?: () => void;
}

interface AIChatAssistantProps {
    selectedProject?: Project | null;
    selectedCommunity?: string;
    selectedCity?: string;
    /** Currently selected landmark (for landmark chat) */
    selectedLandmark?: Landmark | null;
    /** True when any tour/presentation is running — disables chat completely */
    isTourActive?: boolean;
    /** Filter the developer column to a specific developer */
    onFilterDeveloper?: (developer: string) => void;
    /** Fly the camera + filter to a specific community */
    onFilterCommunity?: (community: string) => void;
    /** Fly the camera to a list of projects */
    onFitBounds?: (projects: Project[]) => void;
    /** Fly the camera to a specific location */
    onFlyTo?: (lng: number, lat: number, zoom?: number) => void;
    /** All live projects — used to build filter subsets */
    allProjects?: Project[];
    /** All landmarks — used for Nearby Landmarks tour */
    allLandmarks?: Landmark[];
    /** Notify parent when open state changes */
    onOpenChange?: (isOpen: boolean) => void;
    /** Reset all map filters before executing an action */
    clearFilters?: () => void;
    /** Cinematic sequential tour through stops (fallback for non-project entities) */
    startCinematicTour?: (stops: { lng: number; lat: number; name?: string }[], zoom?: number) => void;
    /** Launch a presentation (existing Play button engine) */
    onLaunchPresentation?: (pres: ClientPresentation) => void;
}

const AIChatAssistant: React.FC<AIChatAssistantProps> = ({
    selectedProject,
    selectedCommunity,
    selectedCity,
    selectedLandmark,
    isTourActive = false,
    onFilterDeveloper,
    onFilterCommunity,
    onFitBounds,
    onFlyTo,
    allProjects = [],
    allLandmarks = [],
    onOpenChange,
    clearFilters,
    startCinematicTour,
    onLaunchPresentation,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isFading, setIsFading] = useState(false);
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const [chatMessage, setChatMessage] = useState<{ text: string; actions: ChatAction[] } | null>(null);
    const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const AUTO_DISMISS_MS = 8_000;

    // Start / reset the 10-second auto-dismiss countdown
    const resetTimer = useCallback(() => {
        setIsFading(false);
        if (dismissTimer.current) clearTimeout(dismissTimer.current);
        dismissTimer.current = setTimeout(() => {
            setIsFading(true); // start fade-out
            setTimeout(() => setIsOpen(false), 500); // unmount after animation
        }, AUTO_DISMISS_MS);
    }, []);

    // Clear timer on unmount
    useEffect(() => {
        return () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); };
    }, []);

    // Notify parent when open state changes — called directly, not via a separate effect
    // (A separate useEffect on chatMessage caused infinite re-renders because chatMessage
    //  is a new object on every render.)

    useEffect(() => {
        let name = '';
        let question = '';
        let actions: ChatAction[] = [];

        if (selectedProject) {
            name = selectedProject.name;
            question = `What would you like to explore about ${name}?`;

            const lat = Number(selectedProject.latitude);
            const lng = Number(selectedProject.longitude);
            const devName = selectedProject.developerName || '';

            // 1️⃣ Nearby Projects Tour — 5 closest by distance
            const nearby = allProjects
                .filter(p => p.id !== selectedProject.id && p.latitude && p.longitude)
                .map(p => ({ ...p, dist: calculateDistance(lat, lng, Number(p.latitude), Number(p.longitude)) }))
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 5);

            // 2️⃣ Developer Portfolio Tour
            const devPortfolio = allProjects.filter(p => p.developerName === devName && p.id !== selectedProject.id);

            // 3️⃣ Nearby Landmarks Tour — 5 closest
            const nearbyLandmarks = allLandmarks
                .filter(l => l.latitude && l.longitude)
                .map(l => ({ ...l, dist: calculateDistance(lat, lng, l.latitude, l.longitude) }))
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 5);

            actions = [
                {
                    label: 'Tour Nearby',
                    icon: <Play className="w-3.5 h-3.5" />,
                    onClick: () => {
                        if (onLaunchPresentation && nearby.length > 0) {
                            onLaunchPresentation({
                                id: `ai-nearby-${Date.now()}`,
                                title: `Nearby ${name}`,
                                projectIds: nearby.map(p => p.id),
                                intervalSeconds: 5,
                                createdAt: new Date().toISOString(),
                            });
                        } else {
                            onFitBounds?.(nearby);
                        }
                    },
                },
                ...(devName && devName !== 'Exclusive' ? [{
                    label: `${devName} Tour`,
                    icon: <Play className="w-3.5 h-3.5" />,
                    onClick: () => {
                        if (onLaunchPresentation && devPortfolio.length > 0) {
                            onLaunchPresentation({
                                id: `ai-dev-${Date.now()}`,
                                title: `${devName} Showcase`,
                                projectIds: devPortfolio.slice(0, 10).map(p => p.id),
                                intervalSeconds: 5,
                                createdAt: new Date().toISOString(),
                            });
                        } else {
                            onFitBounds?.(devPortfolio);
                        }
                    },
                } as ChatAction] : []),
                {
                    label: 'Landmark Tour',
                    icon: <LandmarkIcon className="w-3.5 h-3.5" />,
                    onClick: () => {
                        // Landmarks are not Projects, so use cinematic tour fallback
                        if (startCinematicTour && nearbyLandmarks.length > 0) {
                            startCinematicTour(nearbyLandmarks.map(l => ({ lng: l.longitude, lat: l.latitude, name: l.name })), 15);
                        } else {
                            onFlyTo?.(lng, lat, 14);
                        }
                    },
                },
                {
                    label: 'Bird\'s Eye',
                    icon: <Eye className="w-3.5 h-3.5" />,
                    onClick: () => onFlyTo?.(lng, lat, 12),
                },
                {
                    label: 'Explore Area',
                    icon: <Navigation className="w-3.5 h-3.5" />,
                    onClick: () => onFlyTo?.(lng, lat, 15),
                },
                { label: 'No thanks', icon: <X className="w-3.5 h-3.5" />, isDismiss: true },
            ];
        } else if (selectedCommunity) {
            name = selectedCommunity;
            question = `What would you like to explore in ${name}?`;
            const communityProjects = allProjects.filter(
                (p) => p.community?.toLowerCase() === selectedCommunity.toLowerCase()
            );

            actions = [
                {
                    label: 'Flyover Tour',
                    icon: <Play className="w-3.5 h-3.5" />,
                    onClick: () => {
                        if (onLaunchPresentation && communityProjects.length > 0) {
                            onLaunchPresentation({
                                id: `ai-community-${Date.now()}`,
                                title: `${name} Tour`,
                                projectIds: communityProjects.slice(0, 10).map(p => p.id),
                                intervalSeconds: 5,
                                createdAt: new Date().toISOString(),
                            });
                        } else if (communityProjects.length > 0 && onFitBounds) {
                            onFitBounds(communityProjects);
                        }
                    },
                },
                {
                    label: 'Show Distances',
                    icon: <Navigation className="w-3.5 h-3.5" />,
                    onClick: () => {
                        if (communityProjects[0] && onFlyTo) {
                            onFlyTo(Number(communityProjects[0].longitude), Number(communityProjects[0].latitude), 14);
                        }
                    },
                },
                {
                    label: 'All Projects Here',
                    icon: <LocateFixed className="w-3.5 h-3.5" />,
                    onClick: () => onFilterCommunity?.(selectedCommunity),
                },
                { label: 'No thanks', icon: <X className="w-3.5 h-3.5" />, isDismiss: true },
            ];
        } else if (selectedCity) {
            name = selectedCity;
            question = `What would you like to discover in ${name}?`;
            const cityProjects = allProjects.filter(
                (p) => p.city?.toLowerCase() === selectedCity.toLowerCase()
            );
            // Get unique communities
            const communities = [...new Set(cityProjects.map((p) => p.community).filter(Boolean))];

            actions = [
                {
                    label: 'Top Communities',
                    icon: <Map className="w-3.5 h-3.5" />,
                    onClick: () => {
                        if (cityProjects.length > 0 && onFitBounds) {
                            onFitBounds(cityProjects);
                        }
                    },
                },
                ...(communities.length > 0
                    ? [
                        {
                            label: `${communities.length} Areas`,
                            icon: <LocateFixed className="w-3.5 h-3.5" />,
                            onClick: () => {
                                if (communities[0] && onFilterCommunity) {
                                    onFilterCommunity(communities[0]);
                                }
                            },
                        } as ChatAction,
                    ]
                    : []),
                { label: 'No thanks', icon: <X className="w-3.5 h-3.5" />, isDismiss: true },
            ];
        } else if (selectedLandmark) {
            // Landmark selected — show landmark-specific actions
            name = selectedLandmark.name || 'Landmark';
            question = `What would you like to explore near ${name}?`;
            const lLat = Number(selectedLandmark.latitude);
            const lLng = Number(selectedLandmark.longitude);

            // Nearby projects within proximity
            const nearbyToLandmark = allProjects
                .filter(p => p.latitude && p.longitude)
                .map(p => ({ ...p, dist: calculateDistance(lLat, lLng, Number(p.latitude), Number(p.longitude)) }))
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 5);

            actions = [
                {
                    label: 'Nearby Projects',
                    icon: <Map className="w-3.5 h-3.5" />,
                    onClick: () => onFitBounds?.(nearbyToLandmark),
                },
                {
                    label: 'Tour Projects',
                    icon: <Play className="w-3.5 h-3.5" />,
                    onClick: () => {
                        if (onLaunchPresentation && nearbyToLandmark.length > 0) {
                            onLaunchPresentation({
                                id: `ai-landmark-${Date.now()}`,
                                title: `Near ${name}`,
                                projectIds: nearbyToLandmark.map(p => p.id),
                                intervalSeconds: 5,
                                createdAt: new Date().toISOString(),
                            });
                        }
                    },
                },
                {
                    label: 'Bird\'s Eye',
                    icon: <Eye className="w-3.5 h-3.5" />,
                    onClick: () => onFlyTo?.(lLng, lLat, 13),
                },
                { label: 'No thanks', icon: <X className="w-3.5 h-3.5" />, isDismiss: true },
            ];
        }

        // ── TOUR GUARD: If a tour is running, suppress ALL chat ──
        if (isTourActive) {
            setIsOpen(false);
            onOpenChange?.(false);
            return;
        }

        if (name) {
            setChatMessage({ text: question || `What would you like to explore about ${name}?`, actions });
            setIsOpen(true);
            setIsFading(false);
            onOpenChange?.(true);
            // kick off the auto-dismiss countdown
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
    }, [selectedProject?.id, selectedCommunity, selectedCity, selectedLandmark?.id, allProjects.length, isTourActive]);

    if (!isOpen || !chatMessage) return null;

    return (
        <div
            className="fixed bottom-[110px] left-4 md:left-6 z-[6000] max-w-[380px] flex flex-col items-start gap-3 pointer-events-none"
            style={{
                opacity: isFading ? 0 : 1,
                transform: isFading ? 'translateY(12px)' : 'translateY(0)',
                transition: 'opacity 0.5s ease, transform 0.5s ease',
            }}
            onMouseEnter={resetTimer}
            onClick={resetTimer}
        >
            {/* AI Chat Bubble */}
            <div className="flex items-start gap-3 pointer-events-auto">
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div
                        className="w-9 h-9 rounded-full flex items-center justify-center"
                        style={{
                            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                            boxShadow: '0 4px 16px rgba(79, 70, 229, 0.35)',
                        }}
                    >
                        <Sparkles className="w-4 h-4 text-indigo-100" />
                    </div>
                    <button
                        onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                        className="p-1.5 bg-white/90 backdrop-blur-md hover:bg-white rounded-full text-slate-500 hover:text-indigo-600 shadow-sm transition-colors border border-slate-200/60"
                        title={isAudioEnabled ? 'Mute Voice' : 'Enable Voice'}
                    >
                        {isAudioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    </button>
                </div>

                <div className="bg-white/90 backdrop-blur-md border border-slate-200/60 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-slate-800 font-semibold shadow-xl">
                    {chatMessage.text}
                </div>
            </div>

            {/* Action Chips */}
            <div className="flex flex-wrap gap-2 pl-[48px] pointer-events-auto">
                {chatMessage.actions.map((act, i) => (
                    <button
                        key={i}
                        onClick={() => {
                            if (act.isDismiss) {
                                setIsOpen(false);
                                onOpenChange?.(false);
                            } else if (act.onClick) {
                                // 1. Wipe the slate clean
                                if (clearFilters) clearFilters();
                                // 2. Execute the new action after a tiny delay so state clears
                                setTimeout(() => {
                                    act.onClick!();
                                }, 50);
                                setIsOpen(false);
                                onOpenChange?.(false);
                            }
                        }}
                        className={`flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-bold tracking-wide rounded-full shadow-lg transition-all duration-200 border ${act.isDismiss
                            ? 'bg-white/90 backdrop-blur-md border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            : 'shiny-effect text-indigo-50 hover:scale-105'
                            }`}
                        style={
                            act.isDismiss
                                ? undefined
                                : {
                                    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                                    border: '1px solid rgba(99, 102, 241, 0.6)',
                                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                                }
                        }
                    >
                        {act.icon}
                        {act.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default AIChatAssistant;
