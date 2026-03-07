import React, { useState, useEffect } from 'react';
import { Sparkles, X, Eye, Navigation, Map, Compass, Volume2, VolumeX, LocateFixed } from 'lucide-react';
import { Project } from '../types';

interface AIChatAssistantProps {
    selectedProject?: Project | null;
    selectedCommunity?: string;
    selectedCity?: string;
}

const AIChatAssistant: React.FC<AIChatAssistantProps> = ({ selectedProject, selectedCommunity, selectedCity }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const [chatMessage, setChatMessage] = useState<{ text: string; actions: { label: string; icon: React.ReactNode; isDismiss?: boolean }[] } | null>(null);

    useEffect(() => {
        let name = '';
        let actions: { label: string; icon: React.ReactNode; isDismiss?: boolean }[] = [];

        if (selectedProject) {
            name = selectedProject.name;
            actions = [
                { label: 'Neighboring Projects', icon: <Map className="w-3.5 h-3.5" /> },
                { label: '20-Min Walk Radius', icon: <Navigation className="w-3.5 h-3.5" /> },
                { label: 'Developer Portfolio', icon: <Compass className="w-3.5 h-3.5" /> },
                { label: 'No thanks', icon: <X className="w-3.5 h-3.5" />, isDismiss: true },
            ];
        } else if (selectedCommunity) {
            name = selectedCommunity;
            actions = [
                { label: 'Flyover Tour', icon: <Eye className="w-3.5 h-3.5" /> },
                { label: 'Show Distances', icon: <Navigation className="w-3.5 h-3.5" /> },
                { label: 'All Projects Here', icon: <LocateFixed className="w-3.5 h-3.5" /> },
                { label: 'No thanks', icon: <X className="w-3.5 h-3.5" />, isDismiss: true },
            ];
        } else if (selectedCity) {
            name = selectedCity;
            actions = [
                { label: 'Top Communities', icon: <Map className="w-3.5 h-3.5" /> },
                { label: 'Show Distances', icon: <Navigation className="w-3.5 h-3.5" /> },
                { label: 'No thanks', icon: <X className="w-3.5 h-3.5" />, isDismiss: true },
            ];
        }

        if (name) {
            setChatMessage({ text: `Here are the options for ${name}:`, actions });
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }, [selectedProject, selectedCommunity, selectedCity]);

    if (!isOpen || !chatMessage) return null;

    return (
        <div className="fixed bottom-[110px] left-4 md:left-6 z-[6000] max-w-[380px] flex flex-col items-start gap-3 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-300">

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
                        onClick={() => (act.isDismiss ? setIsOpen(false) : undefined)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-bold tracking-wide rounded-full shadow-lg transition-all duration-200 border ${act.isDismiss
                                ? 'bg-white/90 backdrop-blur-md border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                : 'text-indigo-50 hover:scale-105'
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
