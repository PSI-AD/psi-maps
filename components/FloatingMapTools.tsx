import React, { useState } from 'react';
import { Layers, X, School, Coffee, Theater, ShoppingBag, BedDouble, PenTool } from 'lucide-react';

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

    const tools = [
        { id: 'draw', label: 'Draw Area', icon: <PenTool className="w-4 h-4" />, action: onToggleDraw, active: isDrawActive },
        { id: 'school', label: 'Schools', icon: <School className="w-4 h-4" />, action: () => onToggle('school'), active: activeFilters.includes('school') },
        { id: 'leisure', label: 'Leisure', icon: <Coffee className="w-4 h-4" />, action: () => onToggle('leisure'), active: activeFilters.includes('leisure') },
        { id: 'culture', label: 'Culture', icon: <Theater className="w-4 h-4" />, action: () => onToggle('culture'), active: activeFilters.includes('culture') },
        { id: 'retail', label: 'Retail', icon: <ShoppingBag className="w-4 h-4" />, action: () => onToggle('retail'), active: activeFilters.includes('retail') },
        { id: 'hotel', label: 'Hotels', icon: <BedDouble className="w-4 h-4" />, action: () => onToggle('hotel'), active: activeFilters.includes('hotel') },
    ];

    return (
        <div className="relative flex flex-col items-center">
            {/* Pop-up Menu (Opens ABOVE the dock) */}
            <div className={`
                absolute bottom-full mb-4 flex flex-col sm:flex-row flex-wrap justify-center gap-2 transition-all duration-300 origin-bottom
                ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4 pointer-events-none'}
            `}>
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => { tool.action(); if (window.innerWidth < 768) toggleOpen(); }}
                        className={`
                            flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg backdrop-blur-md border transition-all duration-200
                            ${tool.active
                                ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/30'
                                : 'bg-white/95 text-slate-700 border-white hover:bg-slate-50 hover:text-blue-700'}
                        `}
                    >
                        {tool.icon}
                        <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">{tool.label}</span>
                    </button>
                ))}
            </div>

            {/* The Main Dock Bar (Hidden if controlled externally by Bottom Bar) */}
            {externalIsOpen === undefined && (
                <div className="bg-white/90 backdrop-blur-md shadow-2xl border border-slate-200 rounded-full px-2 py-2 flex items-center gap-2">
                    <button
                        onClick={toggleOpen}
                        className={`
                            flex items-center gap-2 px-5 py-3 rounded-full transition-all duration-300 z-50
                            ${isOpen ? 'bg-slate-100 text-slate-900' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30'}
                        `}
                    >
                        {isOpen ? <X className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                        <span className="text-xs font-bold uppercase tracking-widest">{isOpen ? 'Close Tools' : 'Map Tools'}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default FloatingMapTools;
