import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { Project, ClientPresentation } from '../types';
import { Play, Trash2, Plus, X, Search, GripVertical, Clock } from 'lucide-react';

interface PresentationManagerProps {
    liveProjects: Project[];
    onLaunchPresentation: (presentation: ClientPresentation) => void;
}

const PresentationManager: React.FC<PresentationManagerProps> = ({ liveProjects, onLaunchPresentation }) => {
    // ── Saved presentations ─────────────────────────────────────────────────
    const [saved, setSaved] = useState<ClientPresentation[]>([]);
    const [loadingSaved, setLoadingSaved] = useState(true);

    const fetchSaved = async () => {
        setLoadingSaved(true);
        try {
            const snap = await getDocs(collection(db, 'presentations'));
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ClientPresentation));
            setSaved(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        } finally {
            setLoadingSaved(false);
        }
    };

    useEffect(() => { fetchSaved(); }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this presentation?')) return;
        await deleteDoc(doc(db, 'presentations', id));
        setSaved(prev => prev.filter(p => p.id !== id));
    };

    // ── Create new ──────────────────────────────────────────────────────────
    const [title, setTitle] = useState('');
    const [intervalSeconds, setIntervalSeconds] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const searchResults = useMemo(() => {
        if (searchTerm.trim().length < 2) return [];
        const q = searchTerm.toLowerCase();
        return liveProjects
            .filter(p =>
                (p.name?.toLowerCase().includes(q) || p.community?.toLowerCase().includes(q)) &&
                !selectedProjects.find(s => s.id === p.id)
            )
            .slice(0, 8);
    }, [searchTerm, liveProjects, selectedProjects]);

    const addProject = (p: Project) => {
        setSelectedProjects(prev => [...prev, p]);
        setSearchTerm('');
    };

    const removeProject = (id: string) => {
        setSelectedProjects(prev => prev.filter(p => p.id !== id));
    };

    const handleSave = async () => {
        if (!title.trim() || selectedProjects.length < 1) return;
        setIsSaving(true);
        try {
            const payload = {
                title: title.trim(),
                projectIds: selectedProjects.map(p => p.id),
                intervalSeconds,
                createdAt: new Date().toISOString(),
            };
            const slugifiedId = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const ref = doc(db, 'presentations', slugifiedId);
            await setDoc(ref, payload);
            const newPres: ClientPresentation = { id: ref.id, ...payload };
            setSaved(prev => [newPres, ...prev]);
            setTitle('');
            setSelectedProjects([]);
            setIntervalSeconds(5);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8">

            {/* ── Saved Presentations ─────────────────────────────────────── */}
            <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                    Saved Presentations
                </h4>
                {loadingSaved ? (
                    <p className="text-xs text-slate-400 animate-pulse">Loading…</p>
                ) : saved.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
                        <Play className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-medium">No presentations saved yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {saved.map(pres => (
                            <div key={pres.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-slate-800 text-sm truncate">{pres.title}</p>
                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-2">
                                        <span>{pres.projectIds.length} properties</span>
                                        <span>·</span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />{pres.intervalSeconds}s each
                                        </span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => onLaunchPresentation(pres)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm"
                                    >
                                        <Play className="w-3.5 h-3.5 fill-current" /> Play
                                    </button>
                                    <button
                                        onClick={() => handleDelete(pres.id)}
                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Create New ──────────────────────────────────────────────── */}
            <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 space-y-5">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">
                    Create New Presentation
                </h4>

                {/* Title */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. Saadiyat Island Showcase"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                </div>

                {/* Interval */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
                        Duration per Property <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black">{intervalSeconds}s</span>
                    </label>
                    <input
                        type="range"
                        min={3} max={30} step={1}
                        value={intervalSeconds}
                        onChange={e => setIntervalSeconds(Number(e.target.value))}
                        className="w-full h-2 bg-white rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">
                        <span>3s (Fast)</span><span>30s (Slow)</span>
                    </div>
                </div>

                {/* Project Autocomplete Search */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Add Properties</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search by name or community…"
                            className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                        {/* Dropdown */}
                        {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                                {searchResults.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => addProject(p)}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left border-b border-slate-100 last:border-0"
                                    >
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                                            {p.thumbnailUrl && <img src={p.thumbnailUrl} alt={p.name} className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                                            <p className="text-[10px] text-slate-400">{p.community} · {p.city}</p>
                                        </div>
                                        <Plus className="w-4 h-4 text-blue-500 shrink-0 ml-auto" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Selected Projects List */}
                {selectedProjects.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {selectedProjects.length} Properties Selected
                        </p>
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                            {selectedProjects.map((p, idx) => (
                                <div key={p.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                                    <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                                    <span className="w-5 h-5 flex items-center justify-center bg-blue-600 text-white text-[10px] font-black rounded-full shrink-0">{idx + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-700 truncate">{p.name}</p>
                                        <p className="text-[10px] text-slate-400">{p.community}</p>
                                    </div>
                                    <button onClick={() => removeProject(p.id)} className="p-1 text-slate-300 hover:text-rose-400 transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={isSaving || !title.trim() || selectedProjects.length < 1}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isSaving ? (
                        <span className="animate-pulse">Saving…</span>
                    ) : (
                        <><Plus className="w-4 h-4" /> Save Presentation</>
                    )}
                </button>
            </div>
        </div>
    );
};

export default PresentationManager;
