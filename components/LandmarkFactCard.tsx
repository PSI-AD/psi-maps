import React, { useState, useEffect } from 'react';
import { Landmark as LandmarkIcon, GraduationCap, Building2, Trees, Plane, Hotel, ShoppingBag, Waves, Heart, Info } from 'lucide-react';
import { Landmark } from '../types';

const typeIcons: Record<string, React.ReactNode> = {
    culture: <LandmarkIcon className="w-4 h-4 text-amber-600" />,
    school: <GraduationCap className="w-4 h-4 text-blue-600" />,
    park: <Trees className="w-4 h-4 text-emerald-600" />,
    hospital: <Building2 className="w-4 h-4 text-rose-600" />,
    airport: <Plane className="w-4 h-4 text-sky-600" />,
    hotel: <Hotel className="w-4 h-4 text-violet-600" />,
    retail: <ShoppingBag className="w-4 h-4 text-fuchsia-600" />,
    leisure: <Waves className="w-4 h-4 text-teal-600" />,
    port: <Heart className="w-4 h-4 text-cyan-600" />,
};

const typeColors: Record<string, { bg: string; border: string; dot: string }> = {
    culture: { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' },
    school: { bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' },
    park: { bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    hospital: { bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-500' },
    airport: { bg: 'bg-sky-50', border: 'border-sky-200', dot: 'bg-sky-500' },
    hotel: { bg: 'bg-violet-50', border: 'border-violet-200', dot: 'bg-violet-500' },
    retail: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', dot: 'bg-fuchsia-500' },
    leisure: { bg: 'bg-teal-50', border: 'border-teal-200', dot: 'bg-teal-500' },
    port: { bg: 'bg-cyan-50', border: 'border-cyan-200', dot: 'bg-cyan-500' },
};

const defaultColors = { bg: 'bg-slate-50', border: 'border-slate-200', dot: 'bg-slate-400' };

export const LandmarkFactCard = ({ landmark }: { landmark: Landmark }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const facts = landmark.facts || [];

    // Auto-advance every 5 seconds
    useEffect(() => {
        if (facts.length <= 1) return;
        const timer = setInterval(() => {
            setActiveIdx(prev => (prev + 1) % facts.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [facts.length]);

    if (facts.length === 0) return null;

    const cat = landmark.category?.toLowerCase() || '';
    const icon = typeIcons[cat] || <Info className="w-4 h-4 text-slate-500" />;
    const colors = typeColors[cat] || defaultColors;

    return (
        <div className={`rounded-2xl border ${colors.border} ${colors.bg} overflow-hidden transition-all hover:shadow-md`}>
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                    {icon}
                    <h4 className="font-black text-sm text-slate-900 truncate">{landmark.name}</h4>
                </div>
                <span className="text-[9px] uppercase font-black tracking-[0.15em] text-slate-400 bg-white px-2 py-1 rounded-full border border-slate-100 shrink-0 ml-2">
                    {landmark.category}
                </span>
            </div>

            {/* Fact carousel */}
            <div className="px-4 pb-4 relative" style={{ minHeight: '48px' }}>
                {facts.map((fact, idx) => (
                    <div
                        key={idx}
                        className="flex gap-2.5 items-start transition-all duration-500 ease-in-out"
                        style={{
                            position: idx === activeIdx ? 'relative' : 'absolute',
                            opacity: idx === activeIdx ? 1 : 0,
                            transform: idx === activeIdx ? 'translateY(0)' : 'translateY(6px)',
                            pointerEvents: idx === activeIdx ? 'auto' : 'none',
                        }}
                    >
                        <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} mt-[7px] shrink-0`} />
                        <p className="text-[13px] text-slate-700 leading-relaxed font-medium">{fact}</p>
                    </div>
                ))}
            </div>

            {/* Dot indicators */}
            {facts.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 pb-3">
                    {facts.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveIdx(idx)}
                            className={`h-1 rounded-full transition-all duration-300 ${idx === activeIdx ? `w-5 ${colors.dot}` : 'w-1.5 bg-slate-300'
                                }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default LandmarkFactCard;
