import React, { useMemo } from 'react';
import { Project, Landmark } from '../types';
import { X, MapPin } from 'lucide-react';
import * as turf from '@turf/turf';

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
            const dist = turf.distance(
                [Number(landmark.longitude), Number(landmark.latitude)],
                [Number(p.longitude), Number(p.latitude)],
                { units: 'kilometers' }
            );
            return { ...p, distance: dist };
        }).sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }, [projects, landmark]);

    return (
        <div className="fixed top-1/2 right-4 -translate-y-1/2 z-[3000] w-72 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-right-4 fade-in duration-300">
            {/* Header */}
            <div className="px-5 py-4 bg-amber-50 border-b border-amber-100 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shrink-0 shadow-md">
                        <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-[0.2em]">Nearby — {landmark.category}</p>
                        <p className="font-black text-sm text-slate-900 truncate">{landmark.name}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 bg-white rounded-full shadow-sm text-slate-400 hover:text-slate-700 transition-colors shrink-0 mt-0.5"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Result count */}
            <div className="px-5 py-2.5 border-b border-slate-50 bg-slate-50">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {projects.length} project{projects.length !== 1 ? 's' : ''} within 5 km
                </p>
            </div>

            {/* Projects list — rendered in strict ascending distance order */}
            <div className="overflow-y-auto max-h-[60vh] py-2">
                {sortedProjects.map(project => {
                    const devNameLower = (project.developerName || '').toLowerCase();
                    const matchedKey = Object.keys(DEV_DOMAINS).find(k => devNameLower.includes(k));
                    const logoUrl = matchedKey ? `https://www.google.com/s2/favicons?domain=${DEV_DOMAINS[matchedKey]}&sz=128` : null;

                    return (
                        <button
                            key={project.id}
                            onClick={() => onSelectProject(project.id)}
                            onMouseEnter={() => onHoverProject(project.id)}
                            onMouseLeave={() => onHoverProject(null)}
                            className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-3 transition-colors group border-b border-slate-50 last:border-0"
                        >
                            <div className="w-12 h-9 rounded-lg overflow-hidden bg-slate-100 shrink-0 shadow-sm">
                                <img
                                    src={(project as any).thumbnailUrl || (project as any).image || ''}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">{project.name}</h4>
                                <p className="text-[10px] text-slate-500 truncate">{project.community}</p>
                                <div className="flex items-center gap-1.5 mt-1 min-w-0">
                                    {logoUrl ? (
                                        <img
                                            src={logoUrl}
                                            alt={project.developerName}
                                            className="w-3.5 h-3.5 object-contain rounded-sm shrink-0"
                                        />
                                    ) : (
                                        <div className="w-3.5 h-3.5 bg-blue-100 rounded-sm flex items-center justify-center shrink-0">
                                            <span className="text-[7px] font-black text-blue-600">{project.developerName?.charAt(0) || 'D'}</span>
                                        </div>
                                    )}
                                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-wide truncate">
                                        {project.developerName}
                                    </p>
                                </div>
                            </div>
                            <div className="shrink-0 text-right pl-2">
                                <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-md shadow-sm">
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
