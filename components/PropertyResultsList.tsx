import React, { useMemo } from 'react';
import { Project, Landmark } from '../types';
import { X, MapPin } from 'lucide-react';
import { distance as turfDistance } from '@turf/distance';

const DEV_DOMAINS: Record<string, string> = {
    'emaar': 'emaar.com',
    'aldar': 'aldar.com',
    'damac': 'damacproperties.com',
    'nakheel': 'nakheel.com',
    'sobha': 'sobharealty.com',
    'meraas': 'meraas.com',
    'tiger': 'tigergroup.net',
    'binghatti': 'binghatti.com',
    'danube': 'danubeproperties.ae',
    'imkan': 'imkan.ae',
    'reportage': 'reportageuae.com',
    'ellington': 'ellingtonproperties.ae',
    'bloom': 'bloomholding.com',
    'azizi': 'azizidevelopments.com',
};

interface PropertyResultsListProps {
    landmark: any;
    projects: Project[];
    onClose: () => void;
    onHoverProject: (id: string | null) => void;
    onSelectProject: (id: string) => void;
}

const PropertyResultsList: React.FC<PropertyResultsListProps> = ({
    landmark,
    projects,
    onClose,
    onHoverProject,
    onSelectProject,
}) => {
    if (!landmark || projects.length === 0) return null;

    // Pre-compute distances once and sort ascending — closest property first
    const sortedProjects = useMemo(() => {
        if (!landmark?.latitude || !landmark?.longitude || !projects) return projects || [];
        return [...projects].map(p => {
            const dist = turfDistance(
                [Number(landmark.longitude), Number(landmark.latitude)],
                [Number(p.longitude), Number(p.latitude)],
                { units: 'kilometers' }
            );
            return { ...p, distance: dist };
        }).sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }, [projects, landmark]);

    return (
        /* ── Position ──
           Desktop (lg+): TOP-RIGHT corner, compact list (max 4 visible)
           Tablet & Mobile (<lg): bottom card, full-width, horizontal-scroll or short list
        */
        <div className={`
            fixed z-[5500] animate-in fade-in duration-300
            left-3 right-3 bottom-[calc(env(safe-area-inset-bottom,0px)+80px)]
            lg:left-auto lg:right-6 lg:top-6 lg:bottom-auto lg:w-[280px]
            slide-in-from-right-4
            bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden
        `}>
            {/* Header — compact */}
            <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shrink-0 shadow-md">
                        <MapPin className="w-3 h-3 text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[8px] font-black text-amber-600 uppercase tracking-[0.2em]">Nearby — {landmark.category}</p>
                        <p className="font-black text-xs text-slate-900 truncate">{landmark.name}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 bg-white rounded-full shadow-sm text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>

            {/* Result count */}
            <div className="px-4 py-1.5 border-b border-slate-50 bg-slate-50">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    {projects.length} project{projects.length !== 1 ? 's' : ''} within 5 km
                </p>
            </div>

            {/* Projects list — max-height caps visible to ~4 items on desktop, scrollable */}
            <div className="overflow-y-auto max-h-[35vh] lg:max-h-[240px] py-1">
                {sortedProjects.map(project => {
                    return (
                        <button
                            key={project.id}
                            onClick={() => onSelectProject(project.id)}
                            onTouchEnd={(e) => { e.preventDefault(); onSelectProject(project.id); }}
                            onMouseEnter={() => onHoverProject(project.id)}
                            onMouseLeave={() => onHoverProject(null)}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2.5 transition-colors group border-b border-slate-50 last:border-0"
                        >
                            <div className="w-10 h-8 rounded-lg overflow-hidden bg-slate-100 shrink-0 shadow-sm">
                                <img
                                    src={(project as any).thumbnailUrl || (project as any).image || ''}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-[11px] font-bold text-slate-900 truncate leading-tight">{project.name}</h4>
                                <p className="text-[9px] text-slate-500 truncate">{project.community}</p>
                                <div className="flex items-center gap-1 mt-0.5 min-w-0">
                                    <div className="w-3 h-3 bg-blue-100 rounded-sm flex items-center justify-center shrink-0">
                                        <span className="text-[6px] font-black text-blue-600">{project.developerName?.charAt(0) || 'D'}</span>
                                    </div>
                                    <p className="text-[8px] font-black text-blue-500 uppercase tracking-wide truncate">
                                        {project.developerName}
                                    </p>
                                </div>
                            </div>
                            <div className="shrink-0 text-right pl-1">
                                <span className="text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md shadow-sm">
                                    {project.distance.toFixed(1)} km
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default PropertyResultsList;
