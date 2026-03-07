import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, X, Eye, Navigation, Map, Compass, Volume2, VolumeX, LocateFixed } from 'lucide-react';
import { Project } from '../types';

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
    /** Notify parent when open state changes */
    onOpenChange?: (isOpen: boolean) => void;
    /** Reset all map filters before executing an action */
    clearFilters?: () => void;
}

const AIChatAssistant: React.FC<AIChatAssistantProps> = ({
    selectedProject,
    selectedCommunity,
    selectedCity,
    onFilterDeveloper,
    onFilterCommunity,
    onFitBounds,
    onFlyTo,
    allProjects = [],
    onOpenChange,
    clearFilters,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isFading, setIsFading] = useState(false);
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const [chatMessage, setChatMessage] = useState<{ text: string; actions: ChatAction[] } | null>(null);
    const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const AUTO_DISMISS_MS = 10_000;

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
        let actions: ChatAction[] = [];

        if (selectedProject) {
            name = selectedProject.name;
            const devName = selectedProject.developerName || '';
            const community = selectedProject.community || '';
            const neighborProjects = allProjects.filter(
                (p) => p.community?.toLowerCase() === community.toLowerCase() && p.id !== selectedProject.id
            );

            actions = [
                {
                    label: 'Neighboring Projects',
                    icon: <Map className="w-3.5 h-3.5" />,
                    onClick: () => {
                        if (neighborProjects.length > 0 && onFitBounds) {
                            onFitBounds(neighborProjects);
                        } else if (community && onFilterCommunity) {
                            onFilterCommunity(community);
                        }
                    },
                },
                {
                    label: '20-Min Walk Radius',
                    icon: <Navigation className="w-3.5 h-3.5" />,
                    onClick: () => {
                        if (onFlyTo && selectedProject.latitude && selectedProject.longitude) {
                            onFlyTo(Number(selectedProject.longitude), Number(selectedProject.latitude), 15);
                        }
                    },
                },
                ...(devName
                    ? [
                        {
                            label: 'Developer Portfolio',
                            icon: <Compass className="w-3.5 h-3.5" />,
                            onClick: () => onFilterDeveloper?.(devName),
                        } as ChatAction,
                    ]
                    : []),
                { label: 'No thanks', icon: <X className="w-3.5 h-3.5" />, isDismiss: true },
            ];
        } else if (selectedCommunity) {
            name = selectedCommunity;
            const communityProjects = allProjects.filter(
                (p) => p.community?.toLowerCase() === selectedCommunity.toLowerCase()
            );

            actions = [
                {
                    label: 'Flyover Tour',
                    icon: <Eye className="w-3.5 h-3.5" />,
                    onClick: () => {
                        if (communityProjects.length > 0 && onFitBounds) {
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
        }

        if (name) {
            setChatMessage({ text: `For ${name}`, actions });
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
    }, [selectedProject?.id, selectedCommunity, selectedCity, allProjects.length]);

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
