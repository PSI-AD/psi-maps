import React, { useMemo, useState, useEffect } from 'react';
import { Project, Landmark } from '../types';
import * as turf from '@turf/turf';
import { X, Car, MapPin, Footprints } from 'lucide-react';

interface NearbyPanelProps {
    project: Project;
    landmarks: Landmark[];
    onClose: () => void;
}

const RotatingMetric = ({ distance, walk, drive }: { distance: string, walk: string, drive: string }) => {
    const [idx, setIdx] = useState(0);
    useEffect(() => { const int = setInterval(() => setIdx(i => (i + 1) % 3), 3000); return () => clearInterval(int); }, []);
    const metrics = [
        { label: 'DISTANCE', val: distance, icon: <MapPin className="w-3 h-3" />, color: 'text-blue-600' },
        { label: 'DRIVE', val: drive, icon: <Car className="w-3 h-3" />, color: 'text-emerald-600' },
        { label: 'WALK', val: walk, icon: <Footprints className="w-3 h-3" />, color: 'text-amber-600' }
    ];
    const m = metrics[idx];
    return (
        <div key={idx} className={`flex flex-col items-center justify-center w-16 h-12 bg-slate-50 rounded-lg animate-in fade-in slide-in-from-bottom-2 duration-300 ${m.color} shrink-0`}>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{m.label}</span>
            <div className="flex items-center gap-1 font-bold text-xs">
                {m.icon} <span>{m.val}</span>
            </div>
        </div>
    );
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

const categoryStyle: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    school: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'School' },
    hospital: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Hospital' },
    retail: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Retail' },
    culture: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500', label: 'Culture' },
    hotel: { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500', label: 'Hotel' },
    leisure: { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500', label: 'Leisure' },
};
const defaultStyle = { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400', label: 'Landmark' };

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
                                {items.map(item => {
                                    const style = categoryStyle[item.category?.toLowerCase?.()] ?? defaultStyle;
                                    return (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between px-5 py-3.5 bg-white rounded-xl border border-slate-100 gap-4 shadow-sm hover:shadow-md transition-shadow group"
                                        >
                                            {/* Brand logo / category chip */}
                                            {(() => {
                                                return (
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 relative overflow-hidden ${style.bg} ${style.text}`}>
                                                        {item.domain && (
                                                            <img src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=128`} alt={item.name} className="absolute inset-0 w-full h-full object-cover z-10 bg-white" />
                                                        )}
                                                        <div className={`w-3 h-3 rounded-full ${style.dot}`} />
                                                    </div>
                                                );
                                            })()}

                                            {/* Name */}
                                            <span className="font-black text-sm text-slate-800 flex-1 truncate group-hover:text-blue-600 transition-colors">
                                                {item.name}
                                            </span>

                                            {/* Metrics */}
                                            <RotatingMetric
                                                distance={`${item.distance.toFixed(1)} km`}
                                                drive={`${item.drivingTime} m`}
                                                walk={`${item.walkingTime} m`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default NearbyPanel;
