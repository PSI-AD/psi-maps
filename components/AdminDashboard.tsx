
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project } from '../types';
import { db } from '../utils/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { generateCleanId } from '../utils/helpers';
import { Database, RefreshCw } from 'lucide-react';
import rawApiData from '../data/master_projects.json';

interface AdminDashboardProps {
  onClose: () => void;
  liveProjects: Project[];
  setLiveProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  mapFeatures: { show3D: boolean; showAnalytics: boolean };
  setMapFeatures: React.Dispatch<React.SetStateAction<{ show3D: boolean; showAnalytics: boolean }>>;
}

type TabType = 'general' | 'location' | 'media' | 'settings';

const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
  const { onClose, liveProjects, setLiveProjects, setMapFeatures } = props;
  const mapFeatures = props.mapFeatures || { show3D: false, showAnalytics: false };

  const [masterApiList, setMasterApiList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-complete Engine State
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Project[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<TabType>('general');

  const [stagedProject, setStagedProject] = useState<any | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const filteredList = useMemo(() => {
    return masterApiList.filter(p =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.developerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, masterApiList]);

  useEffect(() => {
    // Legacy API fetch removed. We now rely strictly on Firestore.
    setLoading(false);
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Search against liveProjects instead of masterApiList
    if (value.length > 1) {
      const filtered = liveProjects.filter(p =>
        p.name?.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10);
      setSuggestions(filtered);
      setIsDropdownOpen(true);
    } else {
      setSuggestions([]);
      setIsDropdownOpen(false);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSuggestions([]);
    setStagedProject(null);
    setIsDropdownOpen(false);
  };

  const handleSelectProject = (project: any) => {
    setStagedProject({ ...project });
    setSearchTerm(project.name);
    setIsDropdownOpen(false);
  };

  const handleInputChange = (key: string, value: any) => {
    if (!stagedProject) return;
    const finalValue = (key === 'latitude' || key === 'longitude') ? parseFloat(value) : value;
    setStagedProject({
      ...stagedProject,
      [key]: finalValue
    });
  };

  const handleSave = async () => {
    if (stagedProject) {
      setIsSaving(true);
      try {
        await setDoc(doc(db, 'projects', stagedProject.id), stagedProject, { merge: true });
        const name = stagedProject.name;
        handleClearSearch();
        alert(`${name} updated successfully.`);
      } catch (e) {
        console.error("Update failed", e);
        alert("Failed to update project.");
      } finally {
        setIsSaving(false);
      }
    }
  };


  const renderField = (label: string, key: string, type: 'text' | 'number' | 'textarea' = 'text') => {
    const value = stagedProject ? stagedProject[key] : '';
    return (
      <div className="space-y-1.5 w-full">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] block ml-1">
          {label}
        </label>
        {type === 'textarea' ? (
          <textarea
            value={value || ''}
            onChange={(e) => handleInputChange(key, e.target.value)}
            rows={4}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all text-sm resize-none"
          />
        ) : (
          <input
            type={type}
            value={value || ''}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-slate-800 font-medium outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all text-sm"
          />
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-50/98 backdrop-blur-md overflow-y-auto flex flex-col items-center p-6 md:p-12 animate-in fade-in duration-300 text-slate-900">
      {/* Header */}
      <div className="w-full max-w-7xl flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Super Admin Dashboard</h1>
          <p className="text-slate-500 font-medium">Internal Property Moderation & Spatial CMS</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-3 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-full border border-slate-200 shadow-sm transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="w-full max-w-7xl space-y-12">
        {/* Step 1: Search */}
        <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-visible">
          <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">1. Asset Discovery</h2>
          <div className="relative" ref={searchContainerRef}>
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                onFocus={() => searchTerm.length > 1 && setIsDropdownOpen(true)}
                placeholder="Search CRM projects to hydrate staging form..."
                className="w-full h-14 bg-slate-50 border border-slate-100 rounded-xl px-4 pr-12 text-slate-800 font-medium outline-none focus:ring-4 focus:ring-blue-50 transition-all text-lg"
              />
              {searchTerm && (
                <button onClick={handleClearSearch} className="absolute right-4 p-1.5 text-slate-300 hover:text-slate-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
              {loading && !searchTerm && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                </div>
              )}
            </div>
            {isDropdownOpen && suggestions.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-[11000] animate-in slide-in-from-top-2">
                {suggestions.map((p) => (
                  <button key={p.id} onClick={() => handleSelectProject(p)} className="w-full text-left px-6 py-4 hover:bg-slate-50 flex items-center justify-between transition-colors border-b border-slate-50 last:border-0 group">
                    <div>
                      <span className="font-bold text-slate-800 text-sm block">{p.name}</span>
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{p.developerName}</span>
                    </div>
                    <svg className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Step 2: Tabbed Staging Form */}
        {stagedProject && (
          <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-6">
              <div>
                <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">2. Staging & Data Sanitization</h2>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Modify Asset: {stagedProject.name}</h3>
              </div>
              <button onClick={() => setStagedProject(null)} className="text-xs font-black text-rose-400 uppercase hover:text-rose-600 transition-colors">Discard Staging</button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-8 mb-8 border-b border-slate-50">
              {(['general', 'location', 'media', 'settings'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {tab === 'general' ? 'General Info' : tab === 'location' ? 'Location Data' : tab === 'media' ? 'Media & Assets' : 'System Settings'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {activeTab === 'general' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                  {renderField('Project Name', 'name')}
                  {renderField('Developer Name', 'developerName')}
                  {renderField('Property Type', 'type')}
                  {renderField('Price Range', 'priceRange')}
                  {renderField('Handover Date', 'handoverDate')}
                  <div className="md:col-span-2">
                    {renderField('Description', 'description', 'textarea')}
                  </div>
                </div>
              )}

              {activeTab === 'location' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                  {renderField('Latitude', 'latitude', 'number')}
                  {renderField('Longitude', 'longitude', 'number')}
                  {renderField('Community', 'community')}
                  {renderField('Area / District', 'area')}
                </div>
              )}

              {activeTab === 'media' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-1 w-full">
                      {renderField('Thumbnail URL', 'thumbnailUrl')}
                    </div>
                    {stagedProject.thumbnailUrl && (
                      <div className="w-full md:w-48 h-32 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 shadow-inner shrink-0">
                        <img
                          src={stagedProject.thumbnailUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80'; }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderField('Video Link 1', 'videoUrl')}
                    {renderField('Video Link 2', 'videoUrl2')}
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">Media Verification Note</p>
                    <p className="text-xs text-blue-800 font-medium">Please ensure the thumbnail URL is public and high-resolution. Portals like Unsplash or AWS S3 are recommended.</p>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-8 animate-in fade-in duration-300 max-w-2xl">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Enable 3D Building Extrusions</h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">Render building heights and architectural volume in 3D (Experimental)</p>
                    </div>
                    <button
                      onClick={() => setMapFeatures(prev => ({ ...prev, show3D: !prev.show3D }))}
                      className={`w-14 h-7 rounded-full p-1 transition-all duration-300 ${mapFeatures.show3D ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${mapFeatures.show3D ? 'translate-x-7' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Enable Draw Area Analytics</h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">Show proximity metrics and investment yield overlays for custom polygons</p>
                    </div>
                    <button
                      onClick={() => setMapFeatures(prev => ({ ...prev, showAnalytics: !prev.showAnalytics }))}
                      className={`w-14 h-7 rounded-full p-1 transition-all duration-300 ${mapFeatures.showAnalytics ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${mapFeatures.showAnalytics ? 'translate-x-7' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Global Governance</p>
                      <p className="text-xs text-blue-800 font-medium leading-relaxed">These settings are session-persistent and affect all map render layers. Use caution when enabling 3D features on mobile devices.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="mt-12 w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/50 text-white font-black py-6 rounded-2xl shadow-xl shadow-emerald-100 transition-all active:scale-[0.98] uppercase text-sm tracking-[0.2em] flex items-center justify-center gap-3"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span>Saving to Firestore...</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </section>
        )}

        {/* Step 3: Asset Directory */}
        <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">3. Live Asset Directory</h2>
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{liveProjects.length} Deployed Pins</span>
          </div>
          <div className="overflow-x-auto -mx-8">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Project Name</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Developer</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Action</th>
                </tr>
              </thead>
              <tbody>
                {(searchTerm ? filteredList : liveProjects.slice(0, 50)).map((p) => {
                  const isLive = liveProjects.some(lp => lp.id === p.id);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group">
                      <td className="px-8 py-5">
                        {isLive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                            <span className="w-1 h-1 rounded-full bg-emerald-600 animate-pulse"></span>Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest border border-slate-100">Staged</span>
                        )}
                      </td>
                      <td className="px-8 py-5"><span className="font-bold text-slate-800 block">{p.name}</span></td>
                      <td className="px-8 py-5"><span className="text-sm text-slate-500 font-medium">{p.developerName}</span></td>
                      <td className="px-8 py-5">
                        <button onClick={() => handleSelectProject(p)} className="text-blue-600 hover:text-blue-800 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">{isLive ? 'Edit Asset' : 'Deploy'}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};


export default AdminDashboard;
