import React, { useMemo } from 'react';
import { Project, Landmark } from '../types';
import * as turf from '@turf/turf';
import { X, Car, MapPin } from 'lucide-react';

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
    'Schools & Nurseries': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Hospitals & Clinics': 'bg-red-50 text-red-700 border-red-100',
    'Malls & Retail': 'bg-rose-50 text-rose-700 border-rose-100',
    'Hotels': 'bg-blue-50 text-blue-700 border-blue-100',
    'Culture': 'bg-purple-50 text-purple-700 border-purple-100',
    'Leisure & Parks': 'bg-teal-50 text-teal-700 border-teal-100',
    'Airports': 'bg-sky-50 text-sky-700 border-sky-100',
    'Ports & Marinas': 'bg-cyan-50 text-cyan-700 border-cyan-100',
};

const NearbyPanel: React.FC<NearbyPanelProps> = ({ project, landmarks, onClose }) => {
    type LandmarkWithDist = Landmark & { distance: number; time: number };

    const groupedLandmarks = useMemo((): Record<string, LandmarkWithDist[]> => {
        const projCoord: [number, number] = [Number(project.longitude), Number(project.latitude)];

        const withDistance: LandmarkWithDist[] = landmarks
            .filter(l => !l.isHidden && !isNaN(Number(l.latitude)) && !isNaN(Number(l.longitude)))
            .map(l => {
                const dist = turf.distance(projCoord, [Number(l.longitude), Number(l.latitude)], { units: 'kilometers' });
                const time = Math.ceil((dist / 40) * 60) + 2;
                return { ...l, distance: dist, time };
            })
            .sort((a, b) => a.distance - b.distance);

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
        <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 z-[6500] w-full max-w-3xl px-4 animate-in slide-in-from-bottom-8 duration-300">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[60vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nearby Amenities</p>
                        <h3 className="text-sm font-black text-slate-900 truncate max-w-[280px]">{project.name}</h3>
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
                            <p className="text-xs">Use the Admin → Nearby tab to import OSM data.</p>
                        </div>
                    )}
                    {(Object.entries(groupedLandmarks) as [string, LandmarkWithDist[]][]).map(([groupLabel, items]) => (
                        <div key={groupLabel}>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{groupLabel}</h4>
                            <div className="space-y-2">
                                {items.map(item => (
                                    <div key={item.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 gap-3">
                                        <span className="font-bold text-sm text-slate-800 flex-1 truncate">{item.name}</span>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[11px] font-black bg-white border border-slate-100 px-2.5 py-1 rounded-lg shadow-sm text-slate-600">
                                                {item.distance.toFixed(1)} km
                                            </span>
                                            <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1.5 border ${groupColour[groupLabel] || 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                <Car className="w-3 h-3" />
                                                {item.time} min
                                            </span>
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
