import React, { useState } from 'react';
import { X, School, Coffee, Theater, ShoppingBag, BedDouble, PenTool, Sparkles } from 'lucide-react';

interface FloatingMapToolsProps {
    activeFilters: string[];
    onToggle: (category: string) => void;
    isDrawActive: boolean;
    onToggleDraw: () => void;
    isOpen?: boolean;
    onToggleOpen?: () => void;
}

const FloatingMapTools: React.FC<FloatingMapToolsProps> = ({
    activeFilters, onToggle, isDrawActive, onToggleDraw, isOpen: externalIsOpen, onToggleOpen
}) => {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
    const toggleOpen = onToggleOpen || (() => setInternalIsOpen(!internalIsOpen));

    if (!isOpen) return null;

    const tools = [
        { id: 'draw', label: 'Draw Area', icon: <PenTool className="w-5 h-5" />, action: onToggleDraw, active: isDrawActive },
        { id: 'school', label: 'Schools', icon: <School className="w-5 h-5" />, action: () => onToggle('school'), active: activeFilters.includes('school') },
        { id: 'leisure', label: 'Leisure', icon: <Coffee className="w-5 h-5" />, action: () => onToggle('leisure'), active: activeFilters.includes('leisure') },
        { id: 'culture', label: 'Culture', icon: <Theater className="w-5 h-5" />, action: () => onToggle('culture'), active: activeFilters.includes('culture') },
        { id: 'retail', label: 'Retail', icon: <ShoppingBag className="w-5 h-5" />, action: () => onToggle('retail'), active: activeFilters.includes('retail') },
        { id: 'hotel', label: 'Hotels', icon: <BedDouble className="w-5 h-5" />, action: () => onToggle('hotel'), active: activeFilters.includes('hotel') },
    ];

    return (
        <div className="fixed inset-0 z-[7000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            {/* Backdrop Click handle */}
            <div
                className="absolute inset-0"
                onClick={toggleOpen}
            />

            {/* Modal Card */}
            <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Map Tools</h3>
                    </div>
                    <button
                        onClick={toggleOpen}
                        className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-full transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-2 gap-3">
                    {tools.map((tool) => (
                        <button
                            key={tool.id}
                            onClick={() => { tool.action(); }}
                            className={`
                                flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border transition-all
                                ${tool.active
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-200'
                                    : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-white hover:border-blue-200'}
                            `}
                        >
                            <div className={tool.active ? 'text-white' : 'text-slate-400'}>
                                {tool.icon}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-center">
                                {tool.label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Footer Apply */}
                <button
                    onClick={toggleOpen}
                    className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all"
                >
                    Done
                </button>
            </div>
        </div>
    );
};

export default FloatingMapTools;
