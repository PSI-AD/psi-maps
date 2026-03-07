import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, SkipForward } from 'lucide-react';
import { Project } from '../types';
import { doc, updateDoc, getFirestore } from 'firebase/firestore';

interface CoordinateReviewToolProps {
    projects: Project[];
    onFlyTo: (lng: number, lat: number, zoom?: number) => void;
    onClose: () => void;
    /** Expose the currently reviewed project so the parent can render markers on the map */
    onActiveProjectChange?: (project: Project | null) => void;
}

const CoordinateReviewTool: React.FC<CoordinateReviewToolProps> = ({ projects, onFlyTo, onClose, onActiveProjectChange }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [resolvedCount, setResolvedCount] = useState(0);

    // Filter projects with pending audit data, sorted by distance (largest mismatch first)
    const auditProjects = useMemo(() => {
        return projects
            .filter(
                p => p.auditLatitude !== undefined &&
                    p.auditLongitude !== undefined &&
                    p.auditStatus === 'pending'
            )
            .sort((a, b) => (b.auditDistanceMeters || 0) - (a.auditDistanceMeters || 0));
    }, [projects]);

    const currentProject = auditProjects[currentIndex] ?? null;

    // Fly to show both markers when the project changes
    useEffect(() => {
        onActiveProjectChange?.(currentProject);
        if (!currentProject) return;
        const crmLat = Number(currentProject.latitude);
        const crmLng = Number(currentProject.longitude);
        const auditLat = currentProject.auditLatitude!;
        const auditLng = currentProject.auditLongitude!;

        // Fly to midpoint
        const midLat = (crmLat + auditLat) / 2;
        const midLng = (crmLng + auditLng) / 2;
        const dist = currentProject.auditDistanceMeters || 1000;
        const zoom = dist > 50000 ? 8 : dist > 10000 ? 11 : dist > 5000 ? 13 : dist > 1000 ? 14 : 15;
        onFlyTo(midLng, midLat, zoom);
    }, [currentIndex, currentProject?.id]);

    const handleApprove = async (source: 'crm' | 'mapbox') => {
        if (!currentProject) return;
        const db = getFirestore();
        const ref = doc(db, 'projects', currentProject.id);

        try {
            if (source === 'mapbox') {
                await updateDoc(ref, {
                    mapLatitude: currentProject.auditLatitude,
                    mapLongitude: currentProject.auditLongitude,
                    auditStatus: 'approved',
                });
            } else {
                await updateDoc(ref, {
                    auditStatus: 'rejected',
                });
            }
            setResolvedCount(prev => prev + 1);
        } catch (err) {
            console.error('Error updating project:', err);
        }

        // Move to next
        if (currentIndex < auditProjects.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const goNext = () => {
        if (currentIndex < auditProjects.length - 1) setCurrentIndex(prev => prev + 1);
    };

    const goPrev = () => {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };

    if (auditProjects.length === 0) {
        return (
            <div className="fixed top-20 right-6 z-[8000] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 p-6 w-[360px]">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black text-slate-900 text-sm">Coordinate Review</h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>
                <p className="text-sm text-slate-500">✅ No pending audits. All coordinates have been reviewed!</p>
                {resolvedCount > 0 && (
                    <p className="text-xs text-green-600 font-bold mt-2">
                        {resolvedCount} coordinates resolved this session.
                    </p>
                )}
            </div>
        );
    }

    if (!currentProject) return null;

    const distanceM = currentProject.auditDistanceMeters || 0;
    const distanceLabel = distanceM > 1000 ? `${(distanceM / 1000).toFixed(1)}km` : `${distanceM}m`;
    const projectName = currentProject.name || 'Unknown Project';

    return (
        <div className="fixed top-20 right-6 z-[8000] w-[380px] overflow-hidden rounded-2xl shadow-2xl border border-slate-200/80">

            {/* ── Header ── */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-5 py-3.5">
                <div className="flex items-center justify-between mb-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400">
                        📍 Coordinate Review Tool
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 bg-white/10 px-2.5 py-0.5 rounded-full">
                            {currentIndex + 1} / {auditProjects.length}
                        </span>
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
                <h3 className="font-black text-base truncate" title={projectName}>{projectName}</h3>
                <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-slate-400">{currentProject.community || 'N/A'}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${distanceM > 10000 ? 'bg-red-500/20 text-red-300' :
                        distanceM > 1000 ? 'bg-amber-500/20 text-amber-300' :
                            'bg-green-500/20 text-green-300'
                        }`}>
                        ↕ {distanceLabel} off
                    </span>
                </div>
            </div>

            {/* ── Mapbox resolved name ── */}
            {currentProject.auditMapboxPlaceName && (
                <div className="bg-blue-50 px-5 py-2 border-b border-blue-100">
                    <p className="text-[10px] text-blue-600 truncate">
                        <strong>Mapbox says:</strong> {currentProject.auditMapboxPlaceName}
                    </p>
                </div>
            )}

            {/* ── Legend ── */}
            <div className="bg-white px-5 py-3 flex items-center gap-6 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-md" />
                    <span className="text-[11px] font-bold text-slate-700">CRM (Original)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md" />
                    <span className="text-[11px] font-bold text-slate-700">Mapbox (Suggested)</span>
                </div>
            </div>

            {/* ── Decision Buttons ── */}
            <div className="bg-white px-5 py-4 flex gap-3">
                <button
                    onClick={() => handleApprove('crm')}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-red-50 hover:bg-red-100 text-red-700 font-black text-[11px] uppercase tracking-widest rounded-xl border-2 border-red-200 transition-all duration-200 hover:scale-[1.02] active:scale-95 hover:shadow-lg"
                >
                    <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm" />
                    Keep CRM
                </button>
                <button
                    onClick={() => handleApprove('mapbox')}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-[11px] uppercase tracking-widest rounded-xl border-2 border-blue-200 transition-all duration-200 hover:scale-[1.02] active:scale-95 hover:shadow-lg"
                >
                    <div className="w-3 h-3 bg-blue-500 rounded-full shadow-sm" />
                    Use Mapbox
                </button>
            </div>

            {/* ── Navigation ── */}
            <div className="bg-slate-50 px-5 py-3 flex items-center justify-between border-t border-slate-100">
                <button
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-1 px-3 py-2 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                {resolvedCount > 0 && (
                    <span className="text-[10px] font-bold text-green-600">
                        ✅ {resolvedCount} resolved
                    </span>
                )}
                <button
                    onClick={goNext}
                    disabled={currentIndex >= auditProjects.length - 1}
                    className="flex items-center gap-1 px-3 py-2 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    Skip <SkipForward className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};

export default CoordinateReviewTool;
