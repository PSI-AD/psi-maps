import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, Landmark, LandmarkCategory } from '../types';
import { db } from '../utils/firebase';
import { doc, setDoc, addDoc, collection, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { generateCleanId } from '../utils/helpers';
import { fetchAndSaveBoundary } from '../utils/boundaryService';
import { Database, RefreshCw, Plus, Edit2, Trash2, MapPin, Search, Eye, EyeOff, ImageIcon, Zap } from 'lucide-react';
import { optimizeAndUploadImage } from '../utils/imageOptimizer';

interface AdminDashboardProps {
  onClose: () => void;
  liveProjects: Project[];
  setLiveProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  liveLandmarks: Landmark[];
  setLiveLandmarks: React.Dispatch<React.SetStateAction<Landmark[]>>;
  mapFeatures: { show3D: boolean; showAnalytics: boolean; showCommunityBorders: boolean };
  setMapFeatures: React.Dispatch<React.SetStateAction<{ show3D: boolean; showAnalytics: boolean; showCommunityBorders: boolean }>>;
}

type TabType = 'general' | 'location' | 'media' | 'settings' | 'nearbys';

const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
  const { onClose, liveProjects, setLiveProjects, liveLandmarks, setLiveLandmarks, setMapFeatures } = props;
  const mapFeatures = props.mapFeatures || { show3D: false, showAnalytics: false, showCommunityBorders: true };

  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('general');

  const [stagedProject, setStagedProject] = useState<Project | null>(null);
  const [stagedLandmark, setStagedLandmark] = useState<Partial<Landmark> | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeProgress, setOptimizeProgress] = useState<{ current: number; total: number; optimized: number; failed: number } | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Nearbys CMS Filters
  const [nearbysCategoryFilter, setNearbysCategoryFilter] = useState<string>('All');
  const [nearbysCommunityFilter, setNearbysCommunityFilter] = useState<string>('All');

  const uniqueLandmarkCommunities = useMemo(() => {
    return Array.from(new Set(liveLandmarks.map(l => l.community).filter(Boolean))).sort();
  }, [liveLandmarks]);

  const filteredLandmarks = useMemo(() => {
    return liveLandmarks.filter(l => {
      if (nearbysCategoryFilter !== 'All' && l.category !== nearbysCategoryFilter) return false;
      if (nearbysCommunityFilter !== 'All' && l.community !== nearbysCommunityFilter) return false;
      return true;
    });
  }, [liveLandmarks, nearbysCategoryFilter, nearbysCommunityFilter]);

  const handleOptimizeMedia = async () => {
    setIsOptimizing(true);
    const BATCH_SIZE = 10;
    const unoptimized = liveProjects
      .filter(p => {
        const url = p.image || p.thumbnailUrl;
        return url && !url.includes('optimized_properties') && !url.includes('firebasestorage');
      })
      .slice(0, BATCH_SIZE);

    setOptimizeProgress({ current: 0, total: unoptimized.length, optimized: 0, failed: 0 });

    let optimizedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < unoptimized.length; i++) {
      const project = unoptimized[i];
      const originalUrl = (project.image || project.thumbnailUrl)!;
      setOptimizeProgress({ current: i + 1, total: unoptimized.length, optimized: optimizedCount, failed: failedCount });

      const newUrl = await optimizeAndUploadImage(originalUrl, project.id, 0);
      if (newUrl) {
        try {
          await updateDoc(doc(db, 'projects', project.id), {
            image: newUrl,
            thumbnailUrl: newUrl,
            originalImage: originalUrl,
          });
          optimizedCount++;
        } catch (e) {
          console.error('Firestore update failed:', e);
          failedCount++;
        }
      } else {
        failedCount++;
      }
    }

    setOptimizeProgress({ current: unoptimized.length, total: unoptimized.length, optimized: optimizedCount, failed: failedCount });
    setIsOptimizing(false);

    if (unoptimized.length === 0) {
      alert('All projects are already optimized!');
    } else {
      alert(`Done! ✓ ${optimizedCount} optimized · ✗ ${failedCount} failed.`);
    }
  };

  const handleSyncBoundaries = async () => {
    setIsSyncing(true);
    const uniqueCommunities = Array.from(new Set(liveProjects.map(p => p.community).filter(Boolean))) as string[];
    let synced = 0;
    for (const community of uniqueCommunities) {
      await fetchAndSaveBoundary(community);
      synced++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setIsSyncing(false);
    alert(`Successfully synced ${synced} community boundaries to database!`);
  };

  const handleToggleVisibility = async (landmark: Landmark) => {
    try {
      await updateDoc(doc(db, 'landmarks', landmark.id), { isHidden: !landmark.isHidden });
    } catch (e) { console.error(e); }
  };

  const seedTopFiveCommunities = async () => {
    setIsHydrating(true);
    try {
      // Calculate Top 5 communities by project count
      const commCounts: Record<string, number> = {};
      liveProjects.forEach(p => {
        if (p.community) commCounts[p.community] = (commCounts[p.community] || 0) + 1;
      });
      const top5 = Object.entries(commCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);

      for (const community of top5) {
        // 1. Cache the boundary polygon
        await fetchAndSaveBoundary(community);
        await new Promise(r => setTimeout(r, 1000));

        // 2. Get approximate center from projects in that community
        const communityProjects = liveProjects.filter(p => p.community === community);
        const avgLat = communityProjects.reduce((s, p) => s + Number(p.latitude), 0) / communityProjects.length;
        const avgLng = communityProjects.reduce((s, p) => s + Number(p.longitude), 0) / communityProjects.length;

        // 3. Seed landmarks around the community center
        const landmarks = [
          { name: `${community} International School`, category: 'School' as LandmarkCategory, latitude: avgLat + 0.003, longitude: avgLng + 0.002 },
          { name: `${community} Academy`, category: 'School' as LandmarkCategory, latitude: avgLat - 0.002, longitude: avgLng + 0.004 },
          { name: `${community} Mall`, category: 'Retail' as LandmarkCategory, latitude: avgLat + 0.001, longitude: avgLng - 0.003 },
          { name: `${community} Market Center`, category: 'Retail' as LandmarkCategory, latitude: avgLat - 0.003, longitude: avgLng - 0.001 },
          { name: `${community} Medical Center`, category: 'Hospital' as LandmarkCategory, latitude: avgLat + 0.004, longitude: avgLng + 0.005 },
        ];

        const batch = writeBatch(db);
        for (const lm of landmarks) {
          const ref = doc(collection(db, 'landmarks'));
          batch.set(ref, { ...lm, community, isHidden: false });
        }
        await batch.commit();
      }
      alert(`Successfully hydrated Top 5 communities: ${top5.join(', ')}`);
    } catch (e) { console.error(e); }
    setIsHydrating(false);
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-50/98 backdrop-blur-md overflow-y-auto flex flex-col items-center p-6 md:p-12 animate-in fade-in duration-300 text-slate-900">
      {/* Header */}
      <div className="w-full max-w-7xl flex justify-between items-center mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Super Admin Dashboard</h1>
            <p className="text-slate-500 font-medium">Internal Property Moderation & Spatial CMS</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-3 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-full border border-slate-200 shadow-sm transition-all"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="w-full max-w-7xl">
        {/* Main Tab Navigation */}
        <div className="flex gap-4 mb-8 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm sticky top-0 z-[11000]">
          {(['general', 'location', 'media', 'nearbys', 'settings'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-6 text-[11px] font-black uppercase tracking-[0.2em] transition-all rounded-xl flex items-center justify-center gap-2 ${activeTab === tab
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
            >
              {tab === 'nearbys' ? <MapPin className="w-4 h-4" /> : null}
              {tab === 'general' ? 'Projects' : tab === 'location' ? 'Coordinates' : tab === 'media' ? 'Media' : tab === 'nearbys' ? 'Nearbys CMS' : 'Settings'}
            </button>
          ))}
        </div>

        {/* Content Sections */}
        <div className="space-y-8 pb-20">
          {activeTab === 'nearbys' && (
            <section className="animate-in fade-in duration-300">
              {/* Header Row */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Landmarks & Amenities</h2>
                  <p className="text-slate-500 font-medium text-sm">Manage educational, retail, cultural, and medical points of interest</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={seedTopFiveCommunities}
                    disabled={isHydrating}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
                  >
                    <RefreshCw className={`w-4 h-4 ${isHydrating ? 'animate-spin' : ''}`} />
                    {isHydrating ? 'Hydrating...' : 'Hydrate Top 5'}
                  </button>
                  <button
                    onClick={() => setStagedLandmark({ name: '', category: 'School', community: '', latitude: 24.4, longitude: 54.4 })}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
                  >
                    <Plus className="w-4 h-4" />
                    Add Landmark
                  </button>
                </div>
              </div>

              {/* Filters Row */}
              <div className="flex gap-4 mb-6">
                <select
                  value={nearbysCategoryFilter}
                  onChange={e => setNearbysCategoryFilter(e.target.value)}
                  className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-100"
                >
                  <option value="All">All Categories</option>
                  <option value="School">Schools</option>
                  <option value="Retail">Retail</option>
                  <option value="Culture">Culture</option>
                  <option value="Hospital">Hospitals</option>
                </select>
                <select
                  value={nearbysCommunityFilter}
                  onChange={e => setNearbysCommunityFilter(e.target.value)}
                  className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-100"
                >
                  <option value="All">All Communities</option>
                  {uniqueLandmarkCommunities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="ml-auto text-xs font-black text-slate-400 uppercase tracking-widest self-center">
                  {filteredLandmarks.length} Result{filteredLandmarks.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Landmark Editor Form */}
              {stagedLandmark && (
                <div className="mb-10 p-8 bg-blue-50 border border-blue-100 rounded-3xl animate-in slide-in-from-top-4 duration-500 relative">
                  <button onClick={() => setStagedLandmark(null)} className="absolute top-6 right-6 text-blue-400 hover:text-blue-900">
                    <X className="w-6 h-6" />
                  </button>
                  <h3 className="text-lg font-black text-blue-900 uppercase tracking-tighter mb-6">
                    {stagedLandmark.id ? 'Edit Landmark' : 'Create New Landmark'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div className="flex flex-col gap-1.5 lg:col-span-2">
                      <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Name</label>
                      <input type="text" value={stagedLandmark.name || ''} onChange={(e) => setStagedLandmark({ ...stagedLandmark, name: e.target.value })}
                        className="h-12 bg-white border border-blue-200 rounded-xl px-4 text-slate-800 font-medium outline-none focus:ring-4 focus:ring-blue-100" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Category</label>
                      <select value={stagedLandmark.category} onChange={(e) => setStagedLandmark({ ...stagedLandmark, category: e.target.value as LandmarkCategory })}
                        className="h-12 bg-white border border-blue-200 rounded-xl px-4 text-slate-800 font-medium outline-none focus:ring-4 focus:ring-blue-100">
                        <option value="School">School</option>
                        <option value="Retail">Retail</option>
                        <option value="Culture">Culture</option>
                        <option value="Hospital">Hospital</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Community</label>
                      <input type="text" value={stagedLandmark.community || ''} onChange={(e) => setStagedLandmark({ ...stagedLandmark, community: e.target.value })}
                        className="h-12 bg-white border border-blue-200 rounded-xl px-4 text-slate-800 font-medium outline-none focus:ring-4 focus:ring-blue-100" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Lat</label>
                      <input type="number" value={stagedLandmark.latitude || ''} onChange={(e) => setStagedLandmark({ ...stagedLandmark, latitude: parseFloat(e.target.value) })}
                        className="h-12 bg-white border border-blue-200 rounded-xl px-4 text-slate-800 font-medium outline-none focus:ring-4 focus:ring-blue-100" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Lng</label>
                      <input type="number" value={stagedLandmark.longitude || ''} onChange={(e) => setStagedLandmark({ ...stagedLandmark, longitude: parseFloat(e.target.value) })}
                        className="h-12 bg-white border border-blue-200 rounded-xl px-4 text-slate-800 font-medium outline-none focus:ring-4 focus:ring-blue-100" />
                    </div>
                    <div className="flex items-end lg:col-span-2">
                      <button
                        onClick={async () => {
                          setIsSaving(true);
                          try {
                            const payload = { ...stagedLandmark, isHidden: stagedLandmark.isHidden || false };
                            if (stagedLandmark.id) {
                              await updateDoc(doc(db, 'landmarks', stagedLandmark.id), payload);
                            } else {
                              await addDoc(collection(db, 'landmarks'), payload);
                            }
                            alert("Landmark Saved!");
                            setStagedLandmark(null);
                          } catch (e) { console.error(e); }
                          setIsSaving(false);
                        }}
                        className="w-full h-12 bg-blue-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-200"
                      >
                        {isSaving ? 'Saving...' : (stagedLandmark.id ? 'Update' : 'Create')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Landmarks Table */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Name</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Category</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Community</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Coordinates</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredLandmarks.map((l) => (
                      <tr key={l.id} className={`hover:bg-slate-50 transition-all group ${l.isHidden ? 'opacity-50' : ''}`}>
                        <td className="px-6 py-4 font-bold text-slate-900">{l.name}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${l.category === 'School' ? 'bg-amber-50 text-amber-700' :
                            l.category === 'Retail' ? 'bg-purple-50 text-purple-700' :
                              l.category === 'Hospital' ? 'bg-rose-50 text-rose-700' :
                                'bg-blue-50 text-blue-700'
                            }`}>{l.category}</span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{l.community || '—'}</td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-400">{l.latitude.toFixed(4)}, {l.longitude.toFixed(4)}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${l.isHidden ? 'text-rose-500' : 'text-emerald-600'}`}>
                            {l.isHidden ? 'Hidden' : 'Visible'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleToggleVisibility(l)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all" title={l.isHidden ? 'Show' : 'Hide'}>
                              {l.isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button onClick={() => setStagedLandmark(l)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={async () => {
                              if (window.confirm("Permanently delete this landmark?")) {
                                await deleteDoc(doc(db, 'landmarks', l.id));
                              }
                            }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredLandmarks.length === 0 && (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">No landmarks match the current filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-slate-900 tracking-tight mb-6">Global Application Settings</h3>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <p className="font-bold text-slate-800">Enable Community Borders</p>
                  <p className="text-xs text-slate-500 font-medium">Toggle geographic boundary polygons for communities</p>
                </div>
                <button
                  onClick={() => setMapFeatures({ ...mapFeatures, showCommunityBorders: !mapFeatures.showCommunityBorders })}
                  className={`w-14 h-8 rounded-full transition-all relative ${mapFeatures.showCommunityBorders ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${mapFeatures.showCommunityBorders ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <p className="font-bold text-slate-800">Enable 3D Buildings</p>
                  <p className="text-xs text-slate-500 font-medium">Show extrusions for architectural landmarks</p>
                </div>
                <button
                  onClick={() => setMapFeatures({ ...mapFeatures, show3D: !mapFeatures.show3D })}
                  className={`w-14 h-8 rounded-full transition-all relative ${mapFeatures.show3D ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${mapFeatures.show3D ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Spatial Data Management</h4>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-800">Sync Community Borders</p>
                    <p className="text-xs text-slate-500 font-medium">Download OSM polygons and cache them permanently in Firestore</p>
                  </div>
                  <button
                    onClick={handleSyncBoundaries}
                    disabled={isSyncing}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Borders'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <section className="animate-in fade-in duration-300 space-y-6">
              {/* Header */}
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Media Optimizer</h2>
                <p className="text-slate-500 font-medium text-sm mt-1">Compress external images to WebP via Canvas and store them in Firebase Storage.</p>
              </div>

              {/* Warning Banner */}
              <div className="flex gap-4 items-start p-5 bg-amber-50 border border-amber-200 rounded-2xl">
                <Zap className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-amber-800 text-sm">Important: Do Not Close This Tab</p>
                  <p className="text-amber-700 text-xs font-medium mt-1">Optimization runs in-browser and requires an active connection. Each batch processes 10 projects. Run multiple times to optimize the full database.</p>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Projects</p>
                  <p className="text-3xl font-black text-slate-900">{liveProjects.length}</p>
                </div>
                <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Already Optimized</p>
                  <p className="text-3xl font-black text-emerald-600">
                    {liveProjects.filter(p => (p.image || p.thumbnailUrl || '').includes('firebasestorage')).length}
                  </p>
                </div>
                <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending</p>
                  <p className="text-3xl font-black text-amber-600">
                    {liveProjects.filter(p => { const u = p.image || p.thumbnailUrl; return u && !u.includes('firebasestorage'); }).length}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              {optimizeProgress && (
                <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-black text-slate-800">
                      Processing {optimizeProgress.current} / {optimizeProgress.total}
                    </p>
                    <div className="flex gap-3">
                      <span className="text-xs font-bold text-emerald-600">{optimizeProgress.optimized} ✓</span>
                      {optimizeProgress.failed > 0 && <span className="text-xs font-bold text-rose-500">{optimizeProgress.failed} ✗</span>}
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${optimizeProgress.total > 0 ? (optimizeProgress.current / optimizeProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleOptimizeMedia}
                disabled={isOptimizing}
                className="w-full py-5 flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-blue-100 transition-all"
              >
                <ImageIcon className="w-5 h-5" />
                {isOptimizing ? 'Compressing & Uploading...' : 'Optimize Next 10 Properties'}
              </button>
            </section>
          )}

          {activeTab === 'general' && !stagedProject && (
            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Name</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Developer</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {liveProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-all group">
                      <td className="px-8 py-5 font-bold text-slate-800">{p.name}</td>
                      <td className="px-8 py-5 text-sm text-slate-500 font-medium">{p.developerName}</td>
                      <td className="px-8 py-5 text-right">
                        <button onClick={() => setStagedProject(p)} className="text-blue-600 hover:text-blue-800 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Edit Asset</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {stagedProject && activeTab === 'general' && (
            <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl">
              <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-6">
                <div>
                  <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Asset Staging</h2>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{stagedProject.name}</h3>
                </div>
                <button onClick={() => setStagedProject(null)} className="text-xs font-black text-rose-400 uppercase">Discard</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">City</label>
                  <input className="h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-slate-800 font-medium" value={stagedProject.city || ''} onChange={(e) => setStagedProject({ ...stagedProject, city: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Community</label>
                  <input className="h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-slate-800 font-medium" value={stagedProject.community || ''} onChange={(e) => setStagedProject({ ...stagedProject, community: e.target.value })} />
                </div>
              </div>

              <button
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    await updateDoc(doc(db, 'projects', stagedProject.id), stagedProject);
                    alert("Project Updated!");
                    setStagedProject(null);
                  } catch (e) { console.error(e); }
                  setIsSaving(false);
                }}
                className="w-full py-6 bg-blue-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest"
              >
                Save Changes
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

const X = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
);

export default AdminDashboard;
