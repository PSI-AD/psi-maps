import React from 'react';
import { Project } from '../types';
import { X, Heart, GitCompareArrows, MapPin, Building, BedDouble, Trash2 } from 'lucide-react';
import { getOptimizedImageUrl } from '../utils/imageHelpers';

interface FavoritesPanelProps {
    isOpen: boolean;
    onClose: () => void;
    projects: Project[];
    favoriteIds: string[];
    onToggleFavorite: (id: string) => void;
    onSelectProject: (project: Project) => void;
    onClearAll: () => void;
}

const FavoritesPanel: React.FC<FavoritesPanelProps> = ({
    isOpen, onClose, projects, favoriteIds, onToggleFavorite, onSelectProject, onClearAll
}) => {
    if (!isOpen) return null;

    const favoriteProjects = projects.filter(p => favoriteIds.includes(p.id));

    return (
        <div className="fixed inset-0 z-[8000] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={onClose}>
            <div
                className="bg-white w-full md:w-[480px] md:max-h-[80vh] max-h-[85vh] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-full md:slide-in-from-bottom-4 duration-300 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900">Favorites</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{favoriteProjects.length} saved</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {favoriteProjects.length > 0 && (
                            <button
                                onClick={onClearAll}
                                className="px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors flex items-center gap-1"
                            >
                                <Trash2 className="w-3 h-3" /> Clear
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4">
                    {favoriteProjects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Heart className="w-12 h-12 text-slate-200 mb-4" />
                            <p className="text-sm font-bold text-slate-400">No favorites yet</p>
                            <p className="text-xs text-slate-300 mt-1">Tap the heart icon on any project to save it</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {favoriteProjects.map(project => (
                                <div
                                    key={project.id}
                                    className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
                                    onClick={() => { onSelectProject(project); onClose(); }}
                                >
                                    {/* Thumbnail */}
                                    <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-slate-100">
                                        <img
                                            src={getOptimizedImageUrl(
                                                (project as any).thumbnailUrl || ((project as any).images?.[0]) || '', 160, 160
                                            )}
                                            alt={project.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-black text-slate-900 truncate">{project.name}</h4>
                                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest truncate mt-0.5">
                                            {(project as any).developerName || 'Exclusive'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                                            <MapPin className="w-3 h-3" />
                                            <span className="truncate">{project.community}</span>
                                        </div>
                                    </div>

                                    {/* Remove */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(project.id); }}
                                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shrink-0"
                                        title="Remove from favorites"
                                    >
                                        <Heart className="w-4 h-4 fill-current" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Compare Panel ────────────────────────────────────────────────
interface ComparePanelProps {
    isOpen: boolean;
    onClose: () => void;
    projects: Project[];
    onSelectProject: (project: Project) => void;
}

export const ComparePanel: React.FC<ComparePanelProps> = ({
    isOpen, onClose, projects, onSelectProject
}) => {
    if (!isOpen || projects.length < 2) return null;

    // Compare up to 3 projects
    const compareList = projects.slice(0, 3);

    const getPrice = (p: Project) => {
        const raw = (p as any).priceRange?.toString().split('-')[0].trim().replace(/[^0-9.]/g, '');
        const num = Number(raw);
        return raw && !isNaN(num) && num > 0 ? `AED ${num.toLocaleString()}` : 'On Request';
    };

    const rows = [
        { label: 'Developer', get: (p: Project) => (p as any).developerName || '-' },
        { label: 'Community', get: (p: Project) => p.community || '-' },
        { label: 'City', get: (p: Project) => p.city || '-' },
        { label: 'Status', get: (p: Project) => p.status || '-' },
        { label: 'Starting Price', get: getPrice },
        { label: 'Type', get: (p: Project) => (p as any).type || '-' },
        { label: 'Bedrooms', get: (p: Project) => (p as any).bedrooms || '-' },
        { label: 'BUA', get: (p: Project) => (p as any).builtupArea ? `${Number((p as any).builtupArea).toLocaleString()} sqft` : '-' },
        { label: 'Completion', get: (p: Project) => (p as any).completionDate || '-' },
    ];

    return (
        <div className="fixed inset-0 z-[8000] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={onClose}>
            <div
                className="bg-white w-full md:w-auto md:min-w-[600px] md:max-w-[90vw] md:max-h-[85vh] max-h-[90vh] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-full md:slide-in-from-bottom-4 duration-300 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <GitCompareArrows className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900">Compare</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{compareList.length} projects</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Comparison table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse text-sm">
                        {/* Project headers */}
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="sticky left-0 bg-slate-50 z-10 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest p-3 w-[100px]"></th>
                                {compareList.map(p => (
                                    <th key={p.id} className="p-3 text-center min-w-[160px]">
                                        <div
                                            className="flex flex-col items-center gap-2 cursor-pointer group"
                                            onClick={() => { onSelectProject(p); onClose(); }}
                                        >
                                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shadow-sm">
                                                <img
                                                    src={getOptimizedImageUrl((p as any).thumbnailUrl || ((p as any).images?.[0]) || '', 120, 120)}
                                                    alt={p.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            </div>
                                            <span className="text-xs font-black text-slate-800 truncate max-w-[140px]">{p.name}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => (
                                <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                    <td className="sticky left-0 bg-inherit z-10 p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap border-r border-slate-100">
                                        {row.label}
                                    </td>
                                    {compareList.map(p => (
                                        <td key={p.id} className="p-3 text-center text-xs font-medium text-slate-700 border-r border-slate-100 last:border-r-0">
                                            {row.get(p)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FavoritesPanel;
