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
    
    // Allow controlled or uncontrolled mode
    const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
    const setIsOpen = (val: boolean) => {
        if (onToggleOpen) {
            onToggleOpen();
        } else {
            setInternalIsOpen(val);
        }
    };

    const tools = [
        { id: 'school', label: 'Schools', icon: <School className="w-5 h-5" />, action: () => onToggle('school'), active: activeFilters.includes('school') },
        { id: 'leisure', label: 'Leisure', icon: <Coffee className="w-5 h-5" />, action: () => onToggle('leisure'), active: activeFilters.includes('leisure') },
        { id: 'culture', label: 'Culture', icon: <Theater className="w-5 h-5" />, action: () => onToggle('culture'), active: activeFilters.includes('culture') },
        { id: 'retail', label: 'Retail', icon: <ShoppingBag className="w-5 h-5" />, action: () => onToggle('retail'), active: activeFilters.includes('retail') },
        { id: 'hotel', label: 'Hotels', icon: <BedDouble className="w-5 h-5" />, action: () => onToggle('hotel'), active: activeFilters.includes('hotel') },
    ];

    return (
        <div className="flex flex-col items-end gap-3 pointer-events-auto">
            {/* Expanded Menu */}
            <div className={`
                flex flex-col gap-2 transition-all duration-300 origin-bottom-right
                ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4 pointer-events-none absolute bottom-0 right-0'}
            `}>
                {/* Draw Tool */}
                <button
                    onClick={() => { onToggleDraw(); if (window.innerWidth < 768) setIsOpen(false); }}
                    className={`
                        flex items-center gap-3 px-5 py-3 rounded-full shadow-lg backdrop-blur-md border transition-all duration-200
                        ${isDrawActive
                            ? 'bg-violet-600 text-white border-violet-500 hover:bg-violet-700 shadow-violet-500/20'
                            : 'bg-white/95 text-slate-700 border-white hover:bg-slate-50 hover:text-violet-700'}
                    `}
                >
                    <PenTool className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap">Draw Area</span>
                </button>

                {/* Amenity Toggles */}
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => { tool.action(); if (window.innerWidth < 768) setIsOpen(false); }}
                        className={`
                            flex items-center gap-3 px-5 py-3 rounded-full shadow-lg backdrop-blur-md border transition-all duration-200
                            ${tool.active
                                ? 'bg-amber-500 text-white border-amber-400 hover:bg-amber-600 shadow-amber-500/20'
                                : 'bg-white/95 text-slate-700 border-white hover:bg-slate-50 hover:text-blue-700'}
                        `}
                    >
                        {tool.icon}
                        <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap">{tool.label}</span>
                    </button>
                ))}
            </div>

            {/* Main Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 z-50
                    ${isOpen ? 'bg-blue-800 text-white rotate-90' : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-600/40'}
                `}
            >
                {isOpen ? <X className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
            </button>
        </div>
    );
};

export default FloatingMapTools;
