import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, Landmark, LandmarkCategory } from '../types';
import { db } from '../utils/firebase';
import { doc, setDoc, addDoc, collection, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore'; // Added updateDoc
import { generateCleanId } from '../utils/helpers';
import { Database, RefreshCw, Plus, Edit2, Trash2, MapPin, Search, School, ShoppingBag, Theater } from 'lucide-react';

interface AdminDashboardProps {
  onClose: () => void;
  liveProjects: Project[];
  setLiveProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  liveLandmarks: Landmark[];
  setLiveLandmarks: React.Dispatch<React.SetStateAction<Landmark[]>>;
  mapFeatures: { show3D: boolean; showAnalytics: boolean };
  setMapFeatures: React.Dispatch<React.SetStateAction<{ show3D: boolean; showAnalytics: boolean }>>;
}

type TabType = 'general' | 'location' | 'media' | 'settings' | 'nearbys';

const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
  const { onClose, liveProjects, setLiveProjects, liveLandmarks, setLiveLandmarks, setMapFeatures } = props;
  const mapFeatures = props.mapFeatures || { show3D: false, showAnalytics: false };

  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('general');

  // Staging State
  const [stagedProject, setStagedProject] = useState<Project | null>(null);
  const [stagedLandmark, setStagedLandmark] = useState<Partial<Landmark> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Seeding Abu Dhabi Nearbys
  const seedAbuDhabiNearbys = async () => {
    if (!window.confirm("This will add 30 premium landmarks to Abu Dhabi. Continue?")) return;
    setIsSaving(true);
    const batch = writeBatch(db);

    const landmarksToSeed = [
      // Schools
      { name: "Cranleigh Abu Dhabi", lat: 24.5440, lng: 54.4180, cat: "school" },
      { name: "Repton School Abu Dhabi", lat: 24.4984, lng: 54.4069, cat: "school" },
      { name: "Brighton College Abu Dhabi", lat: 24.4284, lng: 54.4184, cat: "school" },
      { name: "GEMS American Academy", lat: 24.3639, lng: 54.5439, cat: "school" },
      { name: "The British School Al Khubairat", lat: 24.4644, lng: 54.3569, cat: "school" },
      { name: "Raha International School", lat: 24.3939, lng: 54.5839, cat: "school" },
      { name: "American Community School of Abu Dhabi", lat: 24.4639, lng: 54.3139, cat: "school" },
      { name: "Al Yasmina Academy", lat: 24.3739, lng: 54.5939, cat: "school" },
      { name: "Nord Anglia International School", lat: 24.4939, lng: 54.4139, cat: "school" },
      { name: "Abu Dhabi International School", lat: 24.4639, lng: 54.3839, cat: "school" },

      // Culture
      { name: "Sheikh Zayed Grand Mosque", lat: 24.4122, lng: 54.4744, cat: "culture" },
      { name: "Louvre Abu Dhabi", lat: 24.5337, lng: 54.3982, cat: "culture" },
      { name: "Qasr Al Watan", lat: 24.4627, lng: 54.3040, cat: "culture" },
      { name: "Emirates Palace", lat: 24.4611, lng: 54.3168, cat: "culture" },
      { name: "Ferrari World Abu Dhabi", lat: 24.4827, lng: 54.6061, cat: "culture" },
      { name: "Warner Bros. World Abu Dhabi", lat: 24.4913, lng: 54.5976, cat: "culture" },
      { name: "Yas Marina Circuit", lat: 24.4697, lng: 54.6050, cat: "culture" },
      { name: "Etihad Towers", lat: 24.4589, lng: 54.3214, cat: "culture" },
      { name: "Qasr Al Hosn", lat: 24.4831, lng: 54.3547, cat: "culture" },
      { name: "National Aquarium Abu Dhabi", lat: 24.4539, lng: 54.4539, cat: "culture" },

      // Retail
      { name: "Yas Mall", lat: 24.4886, lng: 54.6078, cat: "retail" },
      { name: "The Galleria Al Maryah Island", lat: 24.5029, lng: 54.3888, cat: "retail" },
      { name: "Abu Dhabi Mall", lat: 24.4965, lng: 54.3828, cat: "retail" },
      { name: "Marina Mall", lat: 24.4764, lng: 54.3214, cat: "retail" },
      { name: "Al Wahda Mall", lat: 24.4705, lng: 54.3725, cat: "retail" },
      { name: "Dalma Mall", lat: 24.3414, lng: 54.5165, cat: "retail" },
      { name: "Deerfields Mall", lat: 24.4527, lng: 54.6647, cat: "retail" },
      { name: "Khalidiyah Mall", lat: 24.4716, lng: 54.3414, cat: "retail" },
      { name: "Mushrif Mall", lat: 24.4363, lng: 54.4116, cat: "retail" },
      { name: "Boutik Mall Reem Island", lat: 24.4939, lng: 54.3989, cat: "retail" }
    ];

    try {
      landmarksToSeed.forEach(item => {
        const docRef = doc(collection(db, 'landmarks'));
        batch.set(docRef, {
          name: item.name,
          latitude: item.lat,
          longitude: item.lng,
          category: item.cat,
          thumbnailUrl: `https://picsum.photos/seed/${item.name.replace(/\s/g, '')}/400/300`
        });
      });
      await batch.commit();
      alert("Successfully seeded 30 Abu Dhabi Landmarks!");
    } catch (e) {
      console.error("Seeding failed", e);
      alert("Seeding failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProject = async () => {
    if (!stagedProject) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'projects', stagedProject.id), stagedProject, { merge: true });
      alert("Project saved successfully.");
      setStagedProject(null);
      setSearchTerm('');
    } catch (e) {
      console.error("Save failed", e);
      alert("Failed to save project.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLandmark = async () => {
    if (!stagedLandmark) return;
    setIsSaving(true);
    try {
      if (stagedLandmark.id) {
        await setDoc(doc(db, 'landmarks', stagedLandmark.id), stagedLandmark, { merge: true });
      } else {
        await addDoc(collection(db, 'landmarks'), stagedLandmark);
      }
      alert("Landmark saved successfully.");
      setStagedLandmark(null);
    } catch (e) {
      console.error("Save failed", e);
      alert("Failed to save landmark.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLandmark = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this landmark?")) return;
    try {
      await deleteDoc(doc(db, 'landmarks', id));
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const filteredLandmarks = useMemo(() => {
    return liveLandmarks.filter(l =>
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [liveLandmarks, searchTerm]);

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

        {/* Search Bar for Projects / Landmarks */}
        {activeTab !== 'settings' && (
          <div className="mb-8 relative">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'nearbys' ? "Search landmarks by name or category..." : "Search projects..."}
              className="w-full h-14 bg-white border border-slate-100 rounded-2xl pl-14 pr-6 text-slate-800 font-medium outline-none focus:ring-4 focus:ring-blue-50 transition-all shadow-sm"
            />
          </div>
        )}

        {/* Content Sections */}
        <div className="space-y-8 pb-20">
          {activeTab === 'nearbys' ? (
            <section className="animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Landmarks & Amenities</h2>
                  <p className="text-slate-500 font-medium text-sm">Manage educational, retail, and cultural points of interest</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={seedAbuDhabiNearbys}
                    disabled={isSaving}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-amber-100"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                    Seed Abu Dhabi
                  </button>
                  <button
                    onClick={() => setStagedLandmark({ name: '', category: 'school', latitude: 24.4, longitude: 54.4, thumbnailUrl: '' })}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
                  >
                    <Plus className="w-4 h-4" />
                    Add Landmark
                  </button>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="flex flex-col gap-1.5 lg:col-span-2">
                      <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Name</label>
                      <input
                        type="text"
                        value={stagedLandmark.name || ''}
                        onChange={(e) => setStagedLandmark({ ...stagedLandmark, name: e.target.value })}
                        className="h-12 bg-white border border-blue-200 rounded-xl px-4 text-slate-800 font-medium outline-none focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Category</label>
                      <select
                        value={stagedLandmark.category}
                        onChange={(e) => setStagedLandmark({ ...stagedLandmark, category: e.target.value as LandmarkCategory })}
                        className="h-12 bg-white border border-blue-200 rounded-xl px-4 text-slate-800 font-medium outline-none focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="school">School</option>
                        <option value="retail">Retail</option>
                        <option value="culture">Culture</option>
                        <option value="leisure">Leisure</option>
                        <option value="hotel">Hotel</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Lat</label>
                      <input
                        type="number"
                        value={stagedLandmark.latitude || ''}
                        onChange={(e) => setStagedLandmark({ ...stagedLandmark, latitude: parseFloat(e.target.value) })}
                        className="h-12 bg-white border border-blue-200 rounded-xl px-4 text-slate-800 font-medium outline-none focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Lng</label>
                      <input
                        type="number"
                        value={stagedLandmark.longitude || ''}
                        onChange={(e) => setStagedLandmark({ ...stagedLandmark, longitude: parseFloat(e.target.value) })}
                        className="h-12 bg-white border border-blue-200 rounded-xl px-4 text-slate-800 font-medium outline-none focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                    <div className="lg:col-span-3 flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Thumb URL (Optional)</label>
                      <input
                        type="text"
                        value={stagedLandmark.thumbnailUrl || ''}
                        onChange={(e) => setStagedLandmark({ ...stagedLandmark, thumbnailUrl: e.target.value })}
                        className="h-12 bg-white border border-blue-200 rounded-xl px-4 text-slate-800 font-medium outline-none focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleSaveLandmark}
                        className="w-full h-12 bg-blue-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-200"
                      >
                        {stagedLandmark.id ? 'Update' : 'Create'} Landmark
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
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Category</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Name</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Map Position</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredLandmarks.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50 transition-all group">
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${l.category === 'school' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                            l.category === 'retail' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              l.category === 'culture' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                'bg-slate-50 text-slate-600 border-slate-100'
                            }`}>
                            {l.category === 'school' && <School className="w-3 h-3" />}
                            {l.category === 'retail' && <ShoppingBag className="w-3 h-3" />}
                            {l.category === 'culture' && <Theater className="w-3 h-3" />}
                            {l.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">{l.name}</td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-500 tracking-tighter">
                          {l.latitude.toFixed(4)}, {l.longitude.toFixed(4)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => setStagedLandmark(l)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-sm">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteLandmark(l.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all shadow-sm">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredLandmarks.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center">
                          <p className="text-slate-400 font-medium italic">No landmarks found matching your search.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            // Projects Management Sections
            <>
              {stagedProject ? (
                <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-6">
                    <div>
                      <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Asset Staging</h2>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{stagedProject.name}</h3>
                    </div>
                    <button onClick={() => setStagedProject(null)} className="text-xs font-black text-rose-400 uppercase hover:text-rose-600 transition-colors">Discard</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Name</label>
                        <input className="h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-slate-800 font-medium" value={stagedProject.name} onChange={(e) => setStagedProject({ ...stagedProject, name: e.target.value })} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Developer</label>
                        <input className="h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-slate-800 font-medium" value={stagedProject.developerName} onChange={(e) => setStagedProject({ ...stagedProject, developerName: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">City</label>
                          <input className="h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-slate-800 font-medium" value={stagedProject.city || ''} onChange={(e) => setStagedProject({ ...stagedProject, city: e.target.value })} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Community</label>
                          <input className="h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-slate-800 font-medium" value={stagedProject.community || ''} onChange={(e) => setStagedProject({ ...stagedProject, community: e.target.value })} />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Latitude</label>
                          <input type="number" className="h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-slate-800 font-medium" value={stagedProject.latitude} onChange={(e) => setStagedProject({ ...stagedProject, latitude: parseFloat(e.target.value) })} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Longitude</label>
                          <input type="number" className="h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-slate-800 font-medium" value={stagedProject.longitude} onChange={(e) => setStagedProject({ ...stagedProject, longitude: parseFloat(e.target.value) })} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Property Type</label>
                        <select className="h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-slate-800 font-medium" value={stagedProject.type} onChange={(e) => setStagedProject({ ...stagedProject, type: e.target.value as any })}>
                          <option value="apartment">Apartment</option>
                          <option value="villa">Villa</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveProject}
                    disabled={isSaving}
                    className="w-full py-6 bg-emerald-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-emerald-50 flex items-center justify-center gap-3"
                  >
                    {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                    Confirm & Publish Pin
                  </button>
                </section>
              ) : (
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
                      {liveProjects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 30).map((p) => (
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
            </>
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
