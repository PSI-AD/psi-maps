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
  mapFeatures: { show3D: boolean; showAnalytics: boolean; showCommunityBorders: boolean };
  setMapFeatures: React.Dispatch<React.SetStateAction<{ show3D: boolean; showAnalytics: boolean; showCommunityBorders: boolean }>>;
}

type TabType = 'general' | 'location' | 'media' | 'settings' | 'nearbys';

const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
  const { onClose, liveProjects, setLiveProjects, liveLandmarks, setLiveLandmarks, setMapFeatures } = props;
  const mapFeatures = props.mapFeatures || { show3D: false, showAnalytics: false, showCommunityBorders: true };

  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('general');

  // Staging State
  const [stagedProject, setStagedProject] = useState<Project | null>(null);
  const [stagedLandmark, setStagedLandmark] = useState<Partial<Landmark> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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
            <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-sm text-center">
              <MapPin className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-2">Firestore Landmarks Collection Manager</h3>
              <p className="text-slate-500 font-medium">(Ready for DB Sync)</p>
            </div>
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
            </div>
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
