
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, Landmark, LandmarkCategory, ClientPresentation } from '../types';
import { db } from '../utils/firebase';
import { doc, setDoc, addDoc, collection, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { generateCleanId } from '../utils/helpers';
import { fetchAndSaveBoundary } from '../utils/boundaryService';
import { Database, RefreshCw, Plus, Edit2, Trash2, MapPin, Search, Eye, EyeOff, ImageIcon, Zap, Check, Sliders, MonitorPlay } from 'lucide-react';
import { optimizeAndUploadImage } from '../utils/imageOptimizer';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import PresentationManager from './PresentationManager';

const PUBLIC_MAPBOX_TOKEN = typeof window !== 'undefined'
  ? atob('cGsuZXlKMUlqb2ljSE5wYm5ZaUxDSmhJam9pWTIxc2NqQnpNMjF4TURacU56Tm1jMlZtZEd0NU1XMDVaQ0o5LlZ4SUVuMWpMVHpNd0xBTjhtNEIxNWc=')
  : '';

const AMENITY_CATEGORIES = [
  'school', 'hospital', 'retail', 'leisure', 'hotel',
  'culture', 'airport', 'park', 'beach', 'hypermarket'
];

interface AdminDashboardProps {
  onClose: () => void;
  liveProjects: Project[];
  setLiveProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  liveLandmarks: Landmark[];
  setLiveLandmarks: React.Dispatch<React.SetStateAction<Landmark[]>>;
  mapFeatures: { show3D: boolean; showAnalytics: boolean; showCommunityBorders: boolean };
  setMapFeatures: React.Dispatch<React.SetStateAction<{ show3D: boolean; showAnalytics: boolean; showCommunityBorders: boolean }>>;
  showWelcomeBanner?: boolean;
  cameraDuration?: number;
  onLaunchPresentation: (presentation: ClientPresentation) => void;
  // Advanced / Experimental feature flags
  enableHeatmap: boolean;
  setEnableHeatmap: (v: boolean) => void;
  enableSunlight: boolean;
  setEnableSunlight: (v: boolean) => void;
  enableIsochrone: boolean;
  setEnableIsochrone: (v: boolean) => void;
  enableLasso: boolean;
  setEnableLasso: (v: boolean) => void;
}


type TabType = 'general' | 'presentations' | 'nearbys' | 'settings';

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
  const [osmCommunity, setOsmCommunity] = useState('');
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapModalViewState, setMapModalViewState] = useState({ longitude: 54.39, latitude: 24.49, zoom: 13 });
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState<any[]>([]);
  const [mapSearchLoading, setMapSearchLoading] = useState(false);
  const mapSearchRef = useRef<HTMLDivElement>(null);
  const mapSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nearbys CMS Filters
  const [nearbysCategoryFilter, setNearbysCategoryFilter] = useState<string>('All');
  const [nearbysCommunityFilter, setNearbysCommunityFilter] = useState<string>('All');

  // Default Amenities State
  const [defaultAmenities, setDefaultAmenities] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('psi-default-amenities');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [saveSuccess, setSaveSuccess] = useState(false);


  const toggleDefaultAmenity = (category: string) => {
    const updated = defaultAmenities.includes(category)
      ? defaultAmenities.filter(c => c !== category)
      : [...defaultAmenities, category];
    setDefaultAmenities(updated);
    localStorage.setItem('psi-default-amenities', JSON.stringify(updated));

    // Show success indicator
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const uniqueLandmarkCommunities = useMemo(() => {
    return Array.from(new Set(liveLandmarks.map(l => l.community).filter(Boolean))).sort();
  }, [liveLandmarks]);

  const uniqueProjectCommunities = useMemo(() => {
    return Array.from(new Set(liveProjects.map(p => p.community).filter(Boolean))).sort() as string[];
  }, [liveProjects]);

  const uniqueProjectCities = useMemo(() => {
    return Array.from(new Set(liveProjects.map(p => p.city).filter(Boolean))).sort() as string[];
  }, [liveProjects]);

  const uniqueProjectDevelopers = useMemo(() => {
    return Array.from(new Set(liveProjects.map(p => p.developerName).filter(Boolean))).sort() as string[];
  }, [liveProjects]);

  const filteredAdminProjects = useMemo(() => {
    return liveProjects.filter(p =>
      (p.name?.toLowerCase() || '').includes(projectSearchTerm.toLowerCase()) ||
      (p.developerName?.toLowerCase() || '').includes(projectSearchTerm.toLowerCase()) ||
      (p.community?.toLowerCase() || '').includes(projectSearchTerm.toLowerCase())
    ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [liveProjects, projectSearchTerm]);

  const availableProjectCommunities = useMemo(() => {
    if (!stagedProject?.city) return uniqueProjectCommunities;
    return Array.from(new Set(
      liveProjects.filter(p => p.city === stagedProject.city).map(p => p.community).filter(Boolean)
    )).sort() as string[];
  }, [liveProjects, stagedProject?.city, uniqueProjectCommunities]);

  // Formats stored completionDate strings like "Q3 2026" or ISO dates
  const formatCompletionDate = (dateStr?: string): string => {
    if (!dateStr || dateStr.trim() === '') return 'N/A';
    // Already in Q# YYYY format
    if (/^Q[1-4]\s+\d{4}$/.test(dateStr.trim())) return dateStr.trim();
    // Try to parse as a date
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime()) || d.getFullYear() < 1990) return 'N/A';
      const q = Math.ceil((d.getMonth() + 1) / 3);
      return `Q${q} ${d.getFullYear()}`;
    } catch { return dateStr; }
  };

  const fetchMapSuggestions = (query: string) => {
    setMapSearchQuery(query);
    if (mapSearchDebounceRef.current) clearTimeout(mapSearchDebounceRef.current);
    if (!query.trim()) { setMapSearchResults([]); setMapSearchLoading(false); return; }
    setMapSearchLoading(true);
    mapSearchDebounceRef.current = setTimeout(() => {
      if ((window as any).google) {
        const service = new (window as any).google.maps.places.AutocompleteService();
        service.getPlacePredictions(
          { input: query, componentRestrictions: { country: 'ae' } },
          (predictions: any, status: any) => {
            if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && predictions) {
              setMapSearchResults(predictions);
            } else {
              setMapSearchResults([]);
            }
            setMapSearchLoading(false);
          }
        );
      } else {
        setMapSearchLoading(false);
      }
    }, 300);
  };

  const handleSelectSearchResult = (prediction: any) => {
    setMapSearchQuery(prediction.description);
    setMapSearchResults([]);
    if ((window as any).google) {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ placeId: prediction.place_id }, (results: any, status: any) => {
        if (status === 'OK' && results && results[0]) {
          const loc = results[0].geometry.location;
          const lng = loc.lng();
          const lat = loc.lat();
          setStagedProject(prev => prev ? { ...prev, latitude: lat, longitude: lng } : prev);
          setMapModalViewState({ longitude: lng, latitude: lat, zoom: 16 });
        }
      });
    }
  };

  const clearMapSearch = () => {
    setMapSearchQuery('');
    setMapSearchResults([]);
    setMapSearchLoading(false);
    if (mapSearchDebounceRef.current) clearTimeout(mapSearchDebounceRef.current);
  };

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

  const fetchRealAmenitiesFromOSM = async (communityName: string) => {
    if (!communityName) return;
    setIsHydrating(true);
    try {
      const communityProjects = liveProjects.filter(p => p.community === communityName);
      if (!communityProjects.length) throw new Error('No projects found in this community.');

      const avgLat = communityProjects.reduce((s, p) => s + Number(p.latitude), 0) / communityProjects.length;
      const avgLng = communityProjects.reduce((s, p) => s + Number(p.longitude), 0) / communityProjects.length;

      const latOffset = 0.027; const lngOffset = 0.03; // ~3km bounding box
      const bbox = `${avgLat - latOffset},${avgLng - lngOffset},${avgLat + latOffset},${avgLng + lngOffset}`;

      const categories = [
        { osmTag: 'amenity=school', appCategory: 'School' },
        { osmTag: 'amenity=hospital', appCategory: 'Hospital' },
        { osmTag: 'shop=mall', appCategory: 'Retail' },
        { osmTag: 'tourism=museum', appCategory: 'Culture' },
        { osmTag: 'tourism=hotel', appCategory: 'Hotel' },
        { osmTag: 'amenity=kindergarten', appCategory: 'School' },
      ];

      let addedCount = 0;
      const batch = writeBatch(db);

      for (const cat of categories) {
        const query = `[out:json][timeout:25];(node[${cat.osmTag}](${bbox});way[${cat.osmTag}](${bbox}););out center;`;
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
        const response = await fetch(url, { method: 'GET' });
        const osmData = await response.json();

        if (osmData?.elements) {
          for (const el of osmData.elements.slice(0, 6)) {
            const name = el.tags?.name || el.tags?.['name:en'];
            const lat = el.lat ?? el.center?.lat;
            const lon = el.lon ?? el.center?.lon;
            if (lat && lon && name) {
              const ref = doc(collection(db, 'landmarks'));
              batch.set(ref, { name, category: cat.appCategory, community: communityName, latitude: lat, longitude: lon, isHidden: false });
              addedCount++;
            }
          }
        }
        await new Promise(r => setTimeout(r, 1200)); // respect OSM rate limit
      }

      if (addedCount > 0) {
        await batch.commit();
        alert(`Imported ${addedCount} real landmarks for ${communityName} from OSM!`);
      } else {
        alert(`No landmarks found in OSM for ${communityName}.`);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to fetch from OSM. Check the console for details.');
    }
    setIsHydrating(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-[10000] bg-slate-50/98 backdrop-blur-md overflow-y-auto flex flex-col items-center p-4 md:p-12 animate-in fade-in duration-300 text-slate-900">
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.open('/presentation', '_blank')}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition-all"
            >
              <MonitorPlay className="w-4 h-4" /> Management Deck
            </button>
            <button
              onClick={onClose}
              className="p-3 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-full border border-slate-200 shadow-sm transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="w-full max-w-7xl">
          {/* Main Tab Navigation */}
          <div className="flex gap-4 mb-8 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm sticky top-0 z-[11000] overflow-x-auto hide-scrollbar w-full">
            {(['general', 'presentations', 'nearbys', 'settings'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 px-6 text-[11px] font-black uppercase tracking-[0.2em] transition-all rounded-xl flex items-center justify-center gap-2 ${activeTab === tab
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                  }`}
              >
                {tab === 'nearbys' ? <MapPin className="w-4 h-4" /> : null}
                {tab === 'general' ? 'Projects' : tab === 'presentations' ? 'Presentations' : tab === 'nearbys' ? 'Nearbys CMS' : 'Settings'}
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
                      onClick={() => setStagedLandmark({ name: '', category: 'School', community: '', latitude: 24.4, longitude: 54.4 })}
                      className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
                    >
                      <Plus className="w-4 h-4" />
                      Add Landmark
                    </button>
                  </div>
                </div>

                {/* Sub-tab pill bar */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {['All', 'Hotel', 'School', 'Retail', 'Culture', 'Hospital', 'Leisure', 'Airport', 'Port'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setNearbysCategoryFilter(tab)}
                      className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${nearbysCategoryFilter === tab
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                        }`}
                    >
                      {tab}
                    </button>
                  ))}
                  <div className="ml-auto text-xs font-black text-slate-400 uppercase tracking-widest self-center">
                    {filteredLandmarks.length} Result{filteredLandmarks.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Community filter (keep as select, less important) */}
                <div className="flex gap-4 mb-6">
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
                </div>

                {/* Landmark Editor Form */}
                {stagedLandmark && (
                  <div className="mb-10 p-8 bg-blue-50 border border-blue-100 rounded-3xl animate-in slide-in-from-top-4 duration-500 relative">
                    <button onClick={() => setStagedLandmark(null)} className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md text-slate-500 hover:text-slate-800 transition-all z-10">
                      <X className="w-5 h-5" />
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
                          <option value="School">School / Nursery</option>
                          <option value="Hospital">Hospital / Clinic</option>
                          <option value="Retail">Mall / Retail</option>
                          <option value="Culture">Culture</option>
                          <option value="Hotel">Hotel</option>
                          <option value="Leisure">Leisure / Park</option>
                          <option value="Airport">Airport</option>
                          <option value="Port">Port / Marina</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Brand Domain (For Logo)</label>
                        <input
                          type="text"
                          placeholder="e.g. hilton.com"
                          value={(stagedLandmark as any).domain || ''}
                          onChange={(e) => setStagedLandmark({ ...stagedLandmark, domain: e.target.value } as any)}
                          className="h-12 bg-white border border-blue-200 rounded-xl px-4 text-slate-800 font-medium outline-none focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Community</label>
                        <select
                          value={stagedLandmark.community || ''}
                          onChange={(e) => setStagedLandmark({ ...stagedLandmark, community: e.target.value })}
                          className="h-12 bg-white border border-blue-200 rounded-xl px-4 text-slate-800 font-medium outline-none focus:ring-4 focus:ring-blue-100"
                        >
                          <option value="">Select Community...</option>
                          {uniqueProjectCommunities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      {/* Interactive Map Picker — replaces raw Lat/Lng inputs */}
                      <div className="lg:col-span-5 flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">
                          Pin Location
                          {stagedLandmark.latitude && stagedLandmark.longitude && (
                            <span className="ml-2 normal-case font-medium text-blue-400">
                              {Number(stagedLandmark.latitude).toFixed(5)}, {Number(stagedLandmark.longitude).toFixed(5)}
                            </span>
                          )}
                        </label>
                        <div className="relative h-56 rounded-xl overflow-hidden border border-blue-200">
                          <div className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm text-[10px] font-black uppercase text-blue-600 pointer-events-none">
                            Click map to set pin
                          </div>
                          <Map
                            mapboxAccessToken={PUBLIC_MAPBOX_TOKEN}
                            initialViewState={{
                              longitude: Number(stagedLandmark.longitude) || 54.4,
                              latitude: Number(stagedLandmark.latitude) || 24.4,
                              zoom: 11
                            }}
                            mapStyle="mapbox://styles/mapbox/streets-v12"
                            style={{ width: '100%', height: '100%' }}
                            onClick={(e) => setStagedLandmark({
                              ...stagedLandmark,
                              longitude: e.lngLat.lng,
                              latitude: e.lngLat.lat
                            })}
                          >
                            {stagedLandmark.longitude && stagedLandmark.latitude && (
                              <Marker
                                longitude={Number(stagedLandmark.longitude)}
                                latitude={Number(stagedLandmark.latitude)}
                                color="#2563EB"
                              />
                            )}
                          </Map>
                        </div>
                      </div>
                      {/* 3D Model URL — full-width row */}
                      <div className="flex flex-col gap-1.5 lg:col-span-2">
                        <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">3D Model URL (.glb format) <span className="text-slate-400 normal-case font-medium">— optional</span></label>
                        <input
                          type="text"
                          placeholder="https://example.com/model.glb"
                          value={(stagedLandmark as any).modelUrl || ''}
                          onChange={(e) => setStagedLandmark({ ...stagedLandmark, modelUrl: e.target.value } as any)}
                          className="h-12 bg-white border border-blue-200 rounded-xl px-4 text-slate-800 font-medium outline-none focus:ring-4 focus:ring-blue-100 font-mono text-sm"
                        />
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
                  <div className="w-full overflow-x-auto hide-scrollbar">
                    <table className="w-full text-left min-w-[700px]">
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
                </div>
              </section>
            )}

            {activeTab === 'settings' && (
              <div className="p-8 max-w-3xl mx-auto w-full overflow-y-auto">
                {/* Global App Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Global App Settings</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-slate-800">Show Welcome Banner (Logo)</p>
                        <p className="text-xs text-slate-500">Display the cinematic intro logo on initial load.</p>
                      </div>
                      <button
                        onClick={() => updateDoc(doc(db, 'settings', 'global'), { showWelcomeBanner: !(props as any).globalSettings?.showWelcomeBanner })}
                        className={`relative w-12 h-6 rounded-full transition-colors ${(props as any).globalSettings?.showWelcomeBanner !== false ? 'bg-blue-600' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${(props as any).globalSettings?.showWelcomeBanner !== false ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-800 mb-2">Map Camera Flight Duration: {((props as any).globalSettings?.cameraDuration ?? 2000) / 1000}s</p>
                      <input
                        type="range" min="500" max="5000" step="500"
                        value={(props as any).globalSettings?.cameraDuration ?? 2000}
                        onChange={(e) => updateDoc(doc(db, 'settings', 'global'), { cameraDuration: Number(e.target.value) })}
                        className="w-full accent-blue-600"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-blue-600" />
                        Default Map State Controls
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">Select which amenities should be active when the map first loads.</p>
                    </div>
                    {saveSuccess && (
                      <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full animate-fade-in-out">
                        <Check className="w-4 h-4" /> Saved!
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {AMENITY_CATEGORIES.map(category => {
                      const isActive = defaultAmenities.includes(category);
                      return (
                        <button
                          key={category}
                          onClick={() => toggleDefaultAmenity(category)}
                          className={`
                                        group flex items-center justify-between p-4 rounded-xl border transition-all duration-200
                                        ${isActive
                              ? 'bg-blue-50 border-blue-200 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }
                                    `}
                        >
                          <span className={`text-sm font-bold capitalize ${isActive ? 'text-blue-700' : 'text-slate-600'}`}>
                            {category}
                          </span>

                          <div className={`
                                        w-10 h-6 rounded-full relative transition-colors duration-200
                                        ${isActive ? 'bg-blue-600' : 'bg-slate-300'}
                                    `}>
                            <div className={`
                                            absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200
                                            ${isActive ? 'translate-x-4' : 'translate-x-0'}
                                        `} />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <p className="text-xs text-slate-400 font-medium text-center">
                      Changes are saved automatically to your browser's local storage and will persist across sessions.
                    </p>
                  </div>
                </div>
              </div>
            )}


            {activeTab === 'presentations' && (
              <section className="animate-in fade-in duration-300">
                <div className="mb-8">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Client Presentations</h2>
                  <p className="text-slate-500 font-medium text-sm mt-1">Build and manage curated cinematic tours of properties for clients.</p>
                </div>
                <PresentationManager
                  liveProjects={liveProjects}
                  onLaunchPresentation={props.onLaunchPresentation}
                />
              </section>
            )}

            {activeTab === 'general' && !stagedProject && (
              <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Live search bar */}
                <div className="p-4 border-b border-slate-100">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by name, developer, or community…"
                      value={projectSearchTerm}
                      onChange={e => setProjectSearchTerm(e.target.value)}
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm placeholder:font-normal"
                    />
                  </div>
                  {projectSearchTerm && (
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 ml-1">
                      {filteredAdminProjects.length} result{filteredAdminProjects.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="w-full overflow-x-auto hide-scrollbar">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Name</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Developer</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Completion</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredAdminProjects.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-all group">
                          <td className="px-8 py-5 font-bold text-slate-800">{p.name}</td>
                          <td className="px-8 py-5 text-sm text-slate-500 font-medium">{p.developerName}</td>
                          <td className="px-8 py-5 text-sm text-slate-400 font-medium font-mono">{formatCompletionDate(p.completionDate)}</td>
                          <td className="px-8 py-5 text-right">
                            <button onClick={() => setStagedProject(p)} className="text-blue-600 hover:text-blue-800 text-[10px] font-black uppercase tracking-widest border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all">Edit Asset</button>
                            <button onClick={async () => { if (window.confirm('Delete this project?')) await deleteDoc(doc(db, 'projects', p.id)); }} className="text-rose-500 hover:bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ml-2">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {stagedProject && activeTab === 'general' && (
              <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl">
                <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-6">
                  <div>
                    <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Asset Staging</h2>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{stagedProject.name}</h3>
                  </div>
                  <button onClick={() => setStagedProject(null)} className="p-2 bg-white rounded-full shadow-md text-slate-400 hover:text-slate-800 transition-all"><X className="w-5 h-5" /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                  {/* Project Name */}
                  <div className="flex flex-col gap-1.5 lg:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Name</label>
                    <input className="h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-slate-800 font-medium" value={stagedProject.name || ''} onChange={(e) => setStagedProject({ ...stagedProject, name: e.target.value })} />
                  </div>
                  {/* Developer — dropdown from live project data */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Developer</label>
                    <select className="h-12 w-full bg-slate-50 border border-slate-100 rounded-xl px-4 text-base md:text-sm text-slate-800 font-medium appearance-none" value={stagedProject.developerName || ''} onChange={(e) => setStagedProject({ ...stagedProject, developerName: e.target.value })}>
                      <option value="">Select Developer...</option>
                      {uniqueProjectDevelopers.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  {/* Status */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                    <select className="h-12 w-full bg-slate-50 border border-slate-100 rounded-xl px-4 text-base md:text-sm text-slate-800 font-medium appearance-none" value={stagedProject.status || 'Completed'} onChange={(e) => setStagedProject({ ...stagedProject, status: e.target.value })}>
                      <option value="Completed">Completed</option>
                      <option value="Off-Plan">Off-Plan</option>
                    </select>
                  </div>
                  {/* City */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">City</label>
                    <select className="h-12 w-full bg-slate-50 border border-slate-100 rounded-xl px-4 text-base md:text-sm text-slate-800 font-medium appearance-none" value={stagedProject.city || ''} onChange={(e) => setStagedProject({ ...stagedProject, city: e.target.value })}>
                      <option value="">Select City...</option>
                      {uniqueProjectCities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {/* Community */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Community</label>
                    <select className="h-12 w-full bg-slate-50 border border-slate-100 rounded-xl px-4 text-base md:text-sm text-slate-800 font-medium appearance-none" value={stagedProject.community || ''} onChange={(e) => setStagedProject({ ...stagedProject, community: e.target.value })}>
                      <option value="">Select Community...</option>
                      {availableProjectCommunities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {/* Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Property Type</label>
                    <select className="h-12 w-full bg-slate-50 border border-slate-100 rounded-xl px-4 text-base md:text-sm text-slate-800 font-medium appearance-none" value={stagedProject.type || 'apartment'} onChange={(e) => setStagedProject({ ...stagedProject, type: e.target.value as 'apartment' | 'villa' })}>
                      <option value="apartment">Apartment</option>
                      <option value="villa">Villa / Townhouse</option>
                    </select>
                  </div>
                  {/* Price Range */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price Range</label>
                    <input className="h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-slate-800 font-medium" placeholder="e.g. 1500000-3000000" value={stagedProject.priceRange || ''} onChange={(e) => setStagedProject({ ...stagedProject, priceRange: e.target.value })} />
                  </div>
                  {/* Bedrooms */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bedrooms</label>
                    <input className="h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-slate-800 font-medium" placeholder="e.g. 1, 2, 3" value={String(stagedProject.bedrooms || '')} onChange={(e) => setStagedProject({ ...stagedProject, bedrooms: e.target.value })} />
                  </div>
                  {/* Completion Date — quarter + year split selects */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Completion Date</label>
                    <div className="flex gap-2">
                      <select
                        className="h-12 flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 text-slate-800 font-medium outline-none"
                        value={stagedProject.completionDate?.split(' ')[0] || 'Q1'}
                        onChange={(e) => {
                          const q = e.target.value;
                          const y = stagedProject.completionDate?.split(' ')[1] || new Date().getFullYear().toString();
                          setStagedProject({ ...stagedProject, completionDate: `${q} ${y}` });
                        }}
                      >
                        {['Q1', 'Q2', 'Q3', 'Q4'].map(q => <option key={q} value={q}>{q}</option>)}
                      </select>
                      <select
                        className="h-12 flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 text-slate-800 font-medium outline-none"
                        value={stagedProject.completionDate?.split(' ')[1] || new Date().getFullYear().toString()}
                        onChange={(e) => {
                          const y = e.target.value;
                          const q = stagedProject.completionDate?.split(' ')[0] || 'Q1';
                          setStagedProject({ ...stagedProject, completionDate: `${q} ${y}` });
                        }}
                      >
                        {Array.from({ length: 15 }, (_, i) => 2020 + i).map(year => (
                          <option key={year} value={String(year)}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* ── Location Coordinates + Map Picker ── */}
                <div className="flex flex-col gap-2 mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Location Coordinates
                  </h4>
                  {/* Manual Lat/Lng inputs */}
                  <div className="flex gap-2 mb-3">
                    <input
                      type="number" step="any" placeholder="Latitude"
                      value={stagedProject.latitude || ''}
                      onChange={e => setStagedProject({ ...stagedProject, latitude: parseFloat(e.target.value) })}
                      className="h-12 flex-1 bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <input
                      type="number" step="any" placeholder="Longitude"
                      value={stagedProject.longitude || ''}
                      onChange={e => setStagedProject({ ...stagedProject, longitude: parseFloat(e.target.value) })}
                      className="h-12 flex-1 bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  {/* Modal trigger */}
                  <button
                    onClick={() => {
                      setMapModalViewState({
                        longitude: Number(stagedProject.longitude) || 54.39,
                        latitude: Number(stagedProject.latitude) || 24.49,
                        zoom: 15
                      });
                      setMapSearchQuery('');
                      setMapSearchResults([]);
                      setIsMapModalOpen(true);
                    }}
                    className="w-full py-4 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-4 h-4" /> Open Interactive Map Picker
                  </button>
                </div>

                {/* ── Media Manager ── */}
                <div className="flex flex-col gap-2 mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Media Management
                  </h4>
                  {/* Current images grid */}
                  {((stagedProject as any).images?.length > 0) ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                      {((stagedProject as any).images as string[]).map((img: string, idx: number) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden h-24 bg-white border border-slate-200 shadow-sm">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={() => setStagedProject({ ...stagedProject, images: ((stagedProject as any).images as string[]).filter((_: string, i: number) => i !== idx) } as any)}
                              className="p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-lg scale-90 group-hover:scale-100 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium mb-4">No images yet. Add one below.</p>
                  )}
                  {/* Add image URL */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="admin-new-image-url"
                      placeholder="Paste new image URL here…"
                      className="h-12 flex-1 bg-white border border-slate-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('admin-new-image-url') as HTMLInputElement;
                        if (input?.value.trim()) {
                          setStagedProject({ ...stagedProject, images: [...(((stagedProject as any).images as string[]) || []), input.value.trim()] } as any);
                          input.value = '';
                        }
                      }}
                      className="px-6 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 shadow-md shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      // Sanitize: Firestore rejects undefined fields
                      const payload = Object.fromEntries(
                        Object.entries(stagedProject).filter(([, v]) => v !== undefined)
                      );
                      await updateDoc(doc(db, 'projects', stagedProject.id), payload);
                      alert('Project Successfully Saved to Database!');
                      setStagedProject(null);
                    } catch (e) {
                      console.error('Save Error:', e);
                      alert('Failed to save. Check console for errors.');
                    }
                    setIsSaving(false);
                  }}
                  disabled={isSaving}
                  className="w-full py-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-2xl font-black uppercase text-sm tracking-widest transition-all shadow-lg"
                >
                  {isSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </section>
            )}
          </div>
        </div>
      </div >

      {/* ── Full-Screen Map Picker Modal ── */}
      {
        isMapModalOpen && (
          <div className="fixed inset-0 z-[12000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
            <div className="bg-white rounded-3xl shadow-2xl w-full h-full max-h-[90vh] flex flex-col overflow-hidden">

              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                <div>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Interactive Map Picker</p>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Pick Exact Location</h3>
                </div>
                <button
                  onClick={() => setIsMapModalOpen(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Map + Autocomplete */}
              <div className="relative flex-1 overflow-hidden">
                {/* Floating smart search bar */}
                <div ref={mapSearchRef} className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-lg z-10 px-4">
                  <div className="relative">
                    {/* Search icon / spinner */}
                    {mapSearchLoading
                      ? <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin pointer-events-none" />
                      : <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    }

                    <input
                      type="text"
                      placeholder="Search for a location (e.g. Dubai Mall, Saadiyat Island)…"
                      value={mapSearchQuery}
                      onChange={e => fetchMapSuggestions(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Escape') clearMapSearch(); }}
                      className="w-full h-14 bg-white border border-slate-200 rounded-2xl pl-12 pr-10 text-base text-slate-800 font-bold outline-none focus:ring-4 focus:ring-blue-500/20 shadow-lg placeholder:font-normal placeholder:text-slate-400"
                    />

                    {/* Clear button */}
                    {mapSearchQuery && (
                      <button
                        onClick={clearMapSearch}
                        aria-label="Clear search"
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                    {/* Results dropdown */}
                    {mapSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
                        {mapSearchResults.map((res: any) => (
                          <button
                            key={res.place_id}
                            onClick={() => handleSelectSearchResult(res)}
                            className="w-full text-left px-5 py-3.5 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-colors group"
                          >
                            <span className="font-black text-slate-900 block truncate text-sm group-hover:text-blue-700">{res.structured_formatting?.main_text || res.description.split(',')[0]}</span>
                            <span className="text-[11px] text-slate-400 truncate block">{res.description}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Controlled map — viewState drives camera when a result is selected */}
                <Map
                  {...mapModalViewState}
                  onMove={e => setMapModalViewState(e.viewState)}
                  mapboxAccessToken={PUBLIC_MAPBOX_TOKEN}
                  mapStyle="mapbox://styles/mapbox/streets-v12"
                  style={{ width: '100%', height: '100%' }}
                  onClick={(e) => {
                    setStagedProject(prev => prev ? { ...prev, longitude: e.lngLat.lng, latitude: e.lngLat.lat } : prev);
                    setMapModalViewState(prev => ({ ...prev, longitude: e.lngLat.lng, latitude: e.lngLat.lat }));
                  }}
                >
                  <NavigationControl position="bottom-right" />
                  {stagedProject?.longitude && stagedProject?.latitude && (
                    <Marker
                      longitude={Number(stagedProject.longitude)}
                      latitude={Number(stagedProject.latitude)}
                      color="#2563eb"
                    />
                  )}
                </Map>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-5 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between gap-4">
                {stagedProject?.latitude && stagedProject?.longitude ? (
                  <p className="text-xs font-bold text-slate-500">
                    Pin: <span className="text-blue-600 font-black">{Number(stagedProject.latitude).toFixed(6)}, {Number(stagedProject.longitude).toFixed(6)}</span>
                  </p>
                ) : <span />}
                <button
                  onClick={() => setIsMapModalOpen(false)}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md"
                >
                  Confirm Coordinates
                </button>
              </div>
            </div>
          </div>
        )
      }
    </>
  );
};

const X = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
);

export default AdminDashboard;
