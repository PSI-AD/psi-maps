import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Navigation, Map, Eye, Compass, Volume2, VolumeX } from 'lucide-react';

interface ChatAction {
    label: string;
    icon: React.ReactNode;
    isDismiss?: boolean;
}

interface ChatMessage {
    role: 'ai' | 'user';
    text: string;
    actions?: ChatAction[];
}

const AIChatAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'ai',
            text: 'Welcome to PSI Maps! I can guide you through the area. What would you like to do?',
            actions: [
                { label: 'Flyover Tour', icon: <Eye className="w-3 h-3" /> },
                { label: 'Show Distances', icon: <Navigation className="w-3 h-3" /> },
                { label: 'All Projects Here', icon: <Map className="w-3 h-3" /> },
                { label: 'Nearby Areas', icon: <Compass className="w-3 h-3" /> },
                { label: 'No thanks', icon: <X className="w-3 h-3" />, isDismiss: true },
            ],
        },
    ]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (!inputValue.trim()) return;
        const userMsg: ChatMessage = { role: 'user', text: inputValue.trim() };
        setMessages((prev) => [...prev, userMsg]);
        setInputValue('');

        // Simulate AI response
        setTimeout(() => {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'ai',
                    text: "I'm currently in preview mode. Full AI capabilities are coming soon! Use the map's built-in tools to explore properties and amenities.",
                    actions: [
                        { label: 'Show Distances', icon: <Navigation className="w-3 h-3" /> },
                        { label: 'Explore Map', icon: <Map className="w-3 h-3" /> },
                        { label: 'No thanks', icon: <X className="w-3 h-3" />, isDismiss: true },
                    ],
                },
            ]);
        }, 800);
    };

    const handleActionClick = (action: ChatAction) => {
        if (action.isDismiss) {
            setIsOpen(false);
            return;
        }

        const userMsg: ChatMessage = { role: 'user', text: action.label };
        setMessages((prev) => [...prev, userMsg]);

        setTimeout(() => {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'ai',
                    text: `The "${action.label}" feature is coming soon! Our AI assistant will control the map, calculate routes, and provide intelligent recommendations — all through conversation.`,
                    actions: [
                        { label: 'Try Something Else', icon: <Sparkles className="w-3 h-3" /> },
                        { label: 'No thanks', icon: <X className="w-3 h-3" />, isDismiss: true },
                    ],
                },
            ]);
        }, 600);
    };

    // Floating trigger button
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 z-[2000] flex items-center gap-2.5 px-5 py-3 rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95"
                style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)',
                    boxShadow: '0 8px 32px rgba(79, 70, 229, 0.35), 0 2px 8px rgba(0,0,0,0.2)',
                }}
            >
                <Sparkles className="w-5 h-5 text-indigo-100" />
                <span className="font-bold text-sm tracking-wide text-indigo-50">AI Guide</span>
                {/* Pulse ring */}
                <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: 'linear-gradient(135deg, #4f46e5, #818cf8)' }} />
            </button>
        );
    }

    return (
        <div
            className="fixed bottom-8 right-8 z-[2000] w-[400px] max-h-[600px] flex flex-col rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
            style={{
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                border: '1px solid rgba(100, 116, 139, 0.25)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(100, 116, 139, 0.1)',
            }}
        >
            {/* ── Header ── */}
            <div
                className="flex items-center justify-between px-5 py-4 shrink-0"
                style={{
                    background: 'rgba(30, 41, 59, 0.6)',
                    borderBottom: '1px solid rgba(100, 116, 139, 0.2)',
                }}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(129, 140, 248, 0.15))' }}>
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-slate-100 font-bold text-sm tracking-wide">Map Assistant</h3>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.15em]">Powered by AI</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-200 rounded-xl transition-all duration-200"
                    style={{ background: 'rgba(51, 65, 85, 0.5)' }}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* ── Chat Area ── */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-5 space-y-5 min-h-[300px]"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(100,116,139,0.3) transparent' }}
            >
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col gap-2.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            {/* Avatar + Audio Toggle (AI only) */}
                            {msg.role === 'ai' ? (
                                <div className="flex flex-col items-center gap-2 shrink-0">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center"
                                        style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)' }}
                                    >
                                        <Sparkles className="w-4 h-4 text-indigo-100" />
                                    </div>
                                    {/* Audio Toggle — show only on the first AI message */}
                                    {idx === messages.filter(m => m.role === 'ai').length - 1 && (
                                        <button
                                            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                                            className="p-1.5 rounded-full text-slate-400 hover:text-indigo-400 transition-all duration-200"
                                            style={{ background: 'rgba(51, 65, 85, 0.5)' }}
                                            title={isAudioEnabled ? 'Mute AI Voice' : 'Enable AI Voice'}
                                        >
                                            {isAudioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black text-slate-200"
                                    style={{ background: 'rgba(51, 65, 85, 0.7)', border: '1px solid rgba(100, 116, 139, 0.3)' }}
                                >
                                    You
                                </div>
                            )}

                            {/* Bubble */}
                            <div
                                className={`px-4 py-3 text-sm leading-relaxed max-w-[280px] ${msg.role === 'ai'
                                    ? 'text-slate-200 rounded-2xl rounded-tl-md'
                                    : 'text-slate-100 rounded-2xl rounded-tr-md'
                                    }`}
                                style={{
                                    background: msg.role === 'ai'
                                        ? 'rgba(30, 41, 59, 0.7)'
                                        : 'linear-gradient(135deg, rgba(79, 70, 229, 0.4), rgba(99, 102, 241, 0.3))',
                                    border: `1px solid ${msg.role === 'ai' ? 'rgba(100, 116, 139, 0.2)' : 'rgba(99, 102, 241, 0.3)'}`,
                                }}
                            >
                                {msg.text}
                            </div>
                        </div>

                        {/* Action Chips */}
                        {msg.actions && (
                            <div className="flex flex-wrap gap-2 pl-10">
                                {msg.actions.map((act, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleActionClick(act)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-full transition-all duration-200 border ${act.isDismiss
                                                ? 'text-slate-400 hover:text-slate-200'
                                                : 'text-slate-300 hover:text-indigo-200'
                                            }`}
                                        style={{
                                            background: act.isDismiss ? 'transparent' : 'rgba(51, 65, 85, 0.5)',
                                            border: act.isDismiss ? '1px solid rgba(100, 116, 139, 0.2)' : '1px solid rgba(100, 116, 139, 0.25)',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (act.isDismiss) {
                                                e.currentTarget.style.background = 'rgba(51, 65, 85, 0.4)';
                                            } else {
                                                e.currentTarget.style.background = 'rgba(79, 70, 229, 0.3)';
                                                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = act.isDismiss ? 'transparent' : 'rgba(51, 65, 85, 0.5)';
                                            e.currentTarget.style.borderColor = act.isDismiss ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.25)';
                                        }}
                                    >
                                        {act.icon}
                                        {act.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* ── Input Area ── */}
            <div className="px-4 py-3.5 shrink-0" style={{ background: 'rgba(30, 41, 59, 0.5)', borderTop: '1px solid rgba(100, 116, 139, 0.15)' }}>
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask about properties, distances, or areas..."
                        className="w-full text-sm text-slate-200 rounded-full pl-5 pr-12 py-3 focus:outline-none transition-all placeholder:text-slate-500"
                        style={{
                            background: 'rgba(15, 23, 42, 0.7)',
                            border: '1px solid rgba(100, 116, 139, 0.2)',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.15)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.2)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                    <button
                        onClick={handleSend}
                        className="absolute right-1.5 p-2 rounded-full transition-all duration-200"
                        style={{
                            background: inputValue.trim() ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'rgba(51, 65, 85, 0.5)',
                            boxShadow: inputValue.trim() ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none',
                        }}
                    >
                        <Send className="w-4 h-4 text-slate-200" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIChatAssistant;
