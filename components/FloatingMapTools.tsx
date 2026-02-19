
import React, { useState } from 'react';
import { Layers, X, Map as MapIcon, School, Coffee, Theater, ShoppingBag, BedDouble, PenTool } from 'lucide-react';

interface FloatingMapToolsProps {
    activeFilters: string[];
    onToggle: (category: string) => void;
    isDrawActive: boolean;
    onToggleDraw: () => void;
}

const FloatingMapTools: React.FC<FloatingMapToolsProps> = ({
    activeFilters,
    onToggle,
    isDrawActive,
    onToggleDraw
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const tools = [
        { id: 'draw', label: 'Draw Area', icon: <PenTool className="w-4 h-4" />, action: onToggleDraw, active: isDrawActive },
        { id: 'school', label: 'Schools', icon: <School className="w-4 h-4" />, action: () => onToggle('school'), active: activeFilters.includes('school') },
        { id: 'leisure', label: 'Leisure', icon: <Coffee className="w-4 h-4" />, action: () => onToggle('leisure'), active: activeFilters.includes('leisure') },
        { id: 'culture', label: 'Culture', icon: <Theater className="w-4 h-4" />, action: () => onToggle('culture'), active: activeFilters.includes('culture') },
        { id: 'retail', label: 'Retail', icon: <ShoppingBag className="w-4 h-4" />, action: () => onToggle('retail'), active: activeFilters.includes('retail') },
        { id: 'hotel', label: 'Hotels', icon: <BedDouble className="w-4 h-4" />, action: () => onToggle('hotel'), active: activeFilters.includes('hotel') },
    ];

    return (
        <div className="flex flex-col items-end gap-2">
            {/* Expanded Menu */}
            <div className={`
        flex flex-col gap-2 transition-all duration-300 origin-bottom-right
        ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4 pointer-events-none absolute bottom-0 right-0'}
      `}>
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => { tool.action(); if (window.innerWidth < 768) setIsOpen(false); }}
                        className={`
              flex items-center gap-3 px-4 py-3 rounded-full shadow-lg backdrop-blur-md border transition-all duration-200
              ${tool.active
                                ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700 shadow-blue-500/30'
                                : 'bg-white/95 text-slate-700 border-white hover:bg-slate-50 hover:text-blue-700'}
            `}
                    >
                        {tool.icon}
                        <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">{tool.label}</span>
                    </button>
                ))}
            </div>

            {/* Main Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
          w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300
          ${isOpen ? 'bg-slate-900 text-white rotate-90' : 'bg-white text-slate-900 hover:bg-slate-50'}
        `}
            >
                {isOpen ? <X className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
            </button>
        </div>
    );
};

export default FloatingMapTools;
