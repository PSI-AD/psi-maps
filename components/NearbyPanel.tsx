import React, { useMemo } from 'react';
import { Project, Landmark } from '../types';
import * as turf from '@turf/turf';
import { X, Car, MapPin, Footprints } from 'lucide-react';

interface NearbyPanelProps {
    project: Project;
    landmarks: Landmark[];
    onClose: () => void;
}

const categoryGroups: { label: string; cats: string[] }[] = [
    { label: 'Schools & Nurseries', cats: ['School'] },
    { label: 'Hospitals & Clinics', cats: ['Hospital'] },
    { label: 'Malls & Retail', cats: ['Retail'] },
    { label: 'Hotels', cats: ['Hotel'] },
    { label: 'Culture', cats: ['Culture'] },
    { label: 'Leisure & Parks', cats: ['Leisure'] },
    { label: 'Airports', cats: ['Airport'] },
    { label: 'Ports & Marinas', cats: ['Port'] },
];

const groupColour: Record<string, string> = {
    'Schools & Nurseries': 'text-emerald-700 bg-emerald-50 border-emerald-100',
    'Hospitals & Clinics': 'text-red-700 bg-red-50 border-red-100',
    'Malls & Retail': 'text-rose-700 bg-rose-50 border-rose-100',
    'Hotels': 'text-blue-700 bg-blue-50 border-blue-100',
    'Culture': 'text-purple-700 bg-purple-50 border-purple-100',
    'Leisure & Parks': 'text-teal-700 bg-teal-50 border-teal-100',
    'Airports': 'text-sky-700 bg-sky-50 border-sky-100',
    'Ports & Marinas': 'text-cyan-700 bg-cyan-50 border-cyan-100',
};

const NearbyPanel: React.FC<NearbyPanelProps> = ({ project, landmarks, onClose }) => {
    type LandmarkWithDist = Landmark & { distance: number; drivingTime: number; walkingTime: number };

    const groupedLandmarks = useMemo((): Record<string, LandmarkWithDist[]> => {
        const projCoord: [number, number] = [Number(project.longitude), Number(project.latitude)];

        const withDistance: LandmarkWithDist[] = landmarks
            .filter(l => !l.isHidden && !isNaN(Number(l.latitude)) && !isNaN(Number(l.longitude)))
            .map(l => {
                const dist = turf.distance(projCoord, [Number(l.longitude), Number(l.latitude)], { units: 'kilometers' });
                return {
                    ...l,
                    distance: dist,
                    drivingTime: Math.ceil((dist / 40) * 60) + 2,  // 40km/h avg + 2 min overhead
                    walkingTime: Math.ceil((dist / 5) * 60),        // 5km/h walking speed
                };
            })
            .sort((a, b) => a.distance - b.distance); // strict nearest-first

        const result: Record<string, LandmarkWithDist[]> = {};
        for (const group of categoryGroups) {
            const items = withDistance
                .filter(l => group.cats.includes(l.category))
                .slice(0, 5);
            if (items.length > 0) result[group.label] = items;
        }
        return result;
    }, [project, landmarks]);

    const hasAny = Object.keys(groupedLandmarks).length > 0;

    return (
        <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 z-[6500] w-full max-w-5xl px-4 animate-in slide-in-from-bottom-8 duration-300">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[70vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nearby Amenities</p>
                        <h3 className="text-sm font-black text-slate-900 truncate max-w-[480px]">{project.name}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full bg-white hover:bg-slate-100 text-slate-500 transition-colors shadow-sm border border-slate-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {!hasAny && (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
                            <MapPin className="w-8 h-8 opacity-40" />
                            <p className="text-sm font-bold">No amenities data yet for this project.</p>
                            <p className="text-xs">Use the Admin → Nearby tab to import data.</p>
                        </div>
                    )}
                    {(Object.entries(groupedLandmarks) as [string, LandmarkWithDist[]][]).map(([groupLabel, items]) => (
                        <div key={groupLabel}>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{groupLabel}</h4>
                            <div className="space-y-2">
                                {items.map(item => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between px-5 py-3.5 bg-white rounded-xl border border-slate-100 gap-4 shadow-sm hover:shadow-md transition-shadow group"
                                    >
                                        {/* Brand logo / category chip */}
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden relative border ${groupColour[groupLabel] ?? 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                            <span className="text-lg font-black opacity-30 select-none">{item.name.charAt(0)}</span>
                                            {item.domain && (
                                                <img
                                                    src={`https://logo.clearbit.com/${item.domain}`}
                                                    alt={item.name}
                                                    className="absolute inset-0 w-full h-full object-cover bg-white z-20"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            )}
                                        </div>

                                        {/* Name */}
                                        <span className="font-black text-sm text-slate-800 flex-1 truncate group-hover:text-blue-600 transition-colors">
                                            {item.name}
                                        </span>

                                        {/* Metrics */}
                                        <div className="flex items-center gap-3 shrink-0">

                                            {/* Distance — neutral blue */}
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Distance</span>
                                                <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                                    {item.distance.toFixed(1)} km
                                                </span>
                                            </div>

                                            <div className="w-px h-8 bg-slate-100" />

                                            {/* Driving — emerald green */}
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Drive</span>
                                                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                    <Car className="w-3 h-3" /> {item.drivingTime} min
                                                </span>
                                            </div>

                                            <div className="w-px h-8 bg-slate-100" />

                                            {/* Walking — amber orange */}
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Walk</span>
                                                <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                    <Footprints className="w-3 h-3" /> {item.walkingTime} min
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default NearbyPanel;
