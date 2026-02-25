import React, { useMemo, useState, useRef, useEffect } from 'react';
import SearchBar from './SearchBar';
import { Project, Landmark } from '../types';
import { Settings, Filter as FilterIcon, X, Pencil, Search, Map } from 'lucide-react';
import { MapCommandCenter } from './MapCommandCenter';

interface BottomControlBarProps {
    projects: Project[];
    filteredProjects: Project[];
    onSelectProject: (project: Project) => void;
    onAdminClick: () => void;
    onFlyTo: (lng: number, lat: number, zoom?: number) => void;
    onToggleNearby: () => void;
    onToggleFilters: () => void;
    propertyType: string;
    setPropertyType: (type: string) => void;
    developerFilter: string;
    setDeveloperFilter: (dev: string) => void;
    statusFilter: string;
    setStatusFilter: (stat: string) => void;
    selectedCity: string;
    setSelectedCity: (city: string) => void;
    selectedCommunity: string;
    setSelectedCommunity: (comm: string) => void;
    handleFitBounds: (projects: Project[]) => void;
    isDrawing: boolean;
    onToggleDraw: () => void;
    handleLocationSelect: (locationType: 'city' | 'community', locationName: string, projectsInLocation: Project[]) => void;
    mapFeatures: { show3D: boolean; showAnalytics: boolean; showCommunityBorders: boolean };
    setMapFeatures: React.Dispatch<React.SetStateAction<{ show3D: boolean; showAnalytics: boolean; showCommunityBorders: boolean }>>;
    onGlobalReset: () => void;
    filteredCount: number;
    landmarks?: Landmark[];
    onSelectLandmark?: (landmark: Landmark) => void;
    activeAmenities?: string[];
    onToggleAmenity?: (category: string) => void;
    mapRef?: React.MutableRefObject<any>;
    mapStyle?: string;
    setMapStyle?: (style: string) => void;
    footerTheme?: string;
}

const uaeEmirates = ['abu dhabi', 'dubai', 'sharjah', 'ajman', 'umm al quwain', 'ras al khaimah', 'fujairah'];

const BottomControlBar: React.FC<BottomControlBarProps> = ({
    projects,
    filteredProjects,
    onSelectProject,
    onAdminClick,
    onFlyTo,
    onToggleNearby,
    onToggleFilters,
    propertyType,
    setPropertyType,
    developerFilter,
    setDeveloperFilter,
    statusFilter,
    setStatusFilter,
    selectedCity,
    setSelectedCity,
    selectedCommunity,
    setSelectedCommunity,
    handleFitBounds,
    isDrawing,
    onToggleDraw,
    handleLocationSelect,
    mapFeatures,
    setMapFeatures,
    onGlobalReset,
    filteredCount,
    landmarks = [],
    onSelectLandmark,
    activeAmenities = [],
    onToggleAmenity,
    mapRef,
    mapStyle = '',
    setMapStyle,
    footerTheme = 'glass',
}) => {
    // ── Theme map ──────────────────────────────────────────────────────────
    const THEMES: Record<string, string> = {
        glass: 'bg-white/95 backdrop-blur-xl border-slate-200 text-slate-500',
        brand: 'bg-blue-600 border-blue-700 text-blue-100',
        orange: 'bg-orange-500 border-orange-600 text-orange-50',
        dark: 'bg-slate-900 border-slate-800 text-slate-400',
    };
    const activeThemeClass = THEMES[footerTheme] ?? THEMES.glass;
    const activeIconColor = footerTheme === 'glass' ? 'text-blue-600' : 'text-white';
    const inactiveIconColor = footerTheme === 'glass' ? 'text-slate-400' : 'text-white/60';

    // ── Mobile modals ───────────────────────────────────────────────────
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

    // ── Desktop Map Command Center — hover + click to pin ───────────────
    const [isMapClicked, setIsMapClicked] = useState(false);
    const [isMapHovered, setIsMapHovered] = useState(false);
    const showMap = isMapClicked || isMapHovered;

    // ── Desktop Filter panel — hover + click to pin ─────────────────────
    const [isFilterClicked, setIsFilterClicked] = useState(false);
    const [isFilterHovered, setIsFilterHovered] = useState(false);
    const showFilter = isFilterClicked || isFilterHovered;

    // Refs for click-outside detection
    const mapRefWrapper = useRef<HTMLDivElement>(null);
    const filterRefWrapper = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (mapRefWrapper.current && !mapRefWrapper.current.contains(e.target as Node)) {
                setIsMapClicked(false);
            }
            if (filterRefWrapper.current && !filterRefWrapper.current.contains(e.target as Node)) {
                setIsFilterClicked(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ── Derived data ────────────────────────────────────────────────────
    const propertyTypeOptions = useMemo(() => {
        const stats = filteredProjects.reduce((acc, p) => {
            const type = p.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1).toLowerCase() : 'Unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const types = Object.entries(stats)
            .filter(([_, count]) => (count as number) > 0)
            .map(([name, count]) => ({ name, count: count as number }))
            .sort((a, b) => (b.count as number) - (a.count as number));
        return [{ name: 'All', count: filteredCount }, ...types];
    }, [filteredProjects, filteredCount]);

    const developerOptions = useMemo(() => {
        const filteredCounts = filteredProjects.reduce((acc, p) => {
            if (p.developerName && p.developerName !== 'Unknown Developer') {
                acc[p.developerName] = (acc[p.developerName] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
        const allDevs = Array.from(new Set(projects.map(p => p.developerName).filter(Boolean))) as string[];
        const entries = allDevs
            .filter(name => name !== 'Unknown Developer')
            .map(name => ({ name, count: filteredCounts[name] || 0 }))
            .filter(d => d.count > 0 || developerFilter === d.name)
            .sort((a, b) => b.count - a.count);
        return [{ name: 'All', count: filteredCount }, ...entries];
    }, [filteredProjects, projects, filteredCount, developerFilter]);

    const cityOptions = useMemo(() => {
        const stats = projects.reduce((acc, p) => {
            const city = p.city?.toLowerCase();
            if (city && uaeEmirates.includes(city)) acc[city] = (acc[city] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(stats)
            .filter(([_, count]) => (count as number) > 0)
            .map(([id, count]) => ({
                id,
                name: id.charAt(0).toUpperCase() + id.slice(1),
                count: count as number,
                label: `${id.charAt(0).toUpperCase() + id.slice(1)} (${count})`
            }))
            .sort((a, b) => (b.count as number) - (a.count as number));
    }, [projects]);

    const availableCommunities = useMemo(() => {
        if (!selectedCity) return [];
        const safeCity = selectedCity.toLowerCase().trim();
        const inCity = projects.filter(p => p.city?.toLowerCase().trim() === safeCity && p.community);
        const counts = inCity.reduce((acc, p) => {
            acc[p.community!] = (acc[p.community!] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number));
    }, [projects, selectedCity]);

    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedCity(val);
        setSelectedCommunity('');
        setDeveloperFilter('All');
        if (val) {
            const cityProjects = projects.filter(p => p.city?.toLowerCase() === val.toLowerCase());
            if (cityProjects.length > 0) handleFitBounds(cityProjects);
        } else {
            handleFitBounds(projects);
        }
    };

    const handleCommunityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedCommunity(val);
        setDeveloperFilter('All');
        if (val) {
            const proj = projects.find(p => p.community === val);
            if (proj?.city) setSelectedCity(proj.city);
            handleFitBounds(projects.filter(p => p.community === val));
        } else {
            handleFitBounds(projects);
        }
    };

    const isAnyFilterActive = propertyType !== 'All' || developerFilter !== 'All' || statusFilter !== 'All';

    const selectCls = "w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-base md:text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer shadow-sm appearance-none";

    return (
        <>
            {/* ─────────────────── DESKTOP DOCK ─────────────────── */}
            <div className="hidden md:flex fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 z-[6000] px-4 py-3 items-center justify-between gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                {/* Brand / Reset */}
                <button onClick={onGlobalReset} title="Reset to UAE overview" className="flex items-center gap-3 shrink-0 group">
                    <div className="w-10 h-10 relative flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M50 115C50 115 92 72 92 46C92 22.804 73.196 4 50 4C26.804 4 8 22.804 8 46C8 72 50 115 50 115Z" fill="#2563EB" stroke="#1D4ED8" strokeWidth="2.5" />
                            <text x="50" y="58" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="28" textAnchor="middle" style={{ letterSpacing: '-1px' }}>PSI</text>
                        </svg>
                    </div>
                    <div className="hidden lg:flex flex-col justify-center">
                        <span className="text-sm font-black text-slate-900 tracking-tighter uppercase leading-none block">PSI Maps</span>
                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-[0.2em] mt-0.5">Premier</span>
                    </div>
                </button>

                {/* Search + Dropdowns */}
                <div className="hidden md:flex items-center gap-2 flex-1 max-w-4xl justify-center">
                    <div className="flex-1 min-w-[250px] max-w-sm">
                        <SearchBar
                            projects={projects}
                            landmarks={landmarks}
                            onSelectProject={onSelectProject}
                            onSelectLandmark={onSelectLandmark}
                            onSelectDeveloper={(dev) => {
                                setDeveloperFilter(dev);
                                handleFitBounds(projects.filter(p => p.developerName === dev));
                            }}
                            onSelectLocation={(name, type) => {
                                if (type === 'city') {
                                    setSelectedCity(name.toLowerCase());
                                    setSelectedCommunity('');
                                    setDeveloperFilter('All');
                                    handleFitBounds(projects.filter(p => p.city?.toLowerCase() === name.toLowerCase()));
                                } else if (type === 'community') {
                                    setSelectedCommunity(name);
                                    setDeveloperFilter('All');
                                    handleFitBounds(projects.filter(p => p.community?.toLowerCase() === name.toLowerCase()));
                                }
                            }}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <select value={selectedCity} onChange={handleCityChange} className="bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer min-w-[150px]">
                            <option value="">All Emirates</option>
                            {cityOptions.map(city => <option key={city.id} value={city.id}>{city.label}</option>)}
                        </select>
                        <select value={selectedCommunity} onChange={handleCommunityChange} className="bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer min-w-[170px] disabled:opacity-50" disabled={!selectedCity}>
                            <option value="">Select Community</option>
                            {availableCommunities.map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}
                        </select>
                    </div>
                </div>

                {/* Right: Tools */}
                <div className="flex items-center gap-2 shrink-0">

                    {/* Map Command Center */}
                    <div className="relative" ref={mapRefWrapper} onMouseEnter={() => setIsMapHovered(true)} onMouseLeave={() => setIsMapHovered(false)}>
                        <button
                            onClick={() => setIsMapClicked(v => !v)}
                            aria-label="Open Map Command Center"
                            className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 px-4 ${showMap ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                        >
                            <Map className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Map</span>
                        </button>
                        {showMap && mapRef && (
                            <div className="absolute bottom-full mb-3 left-0 z-50">
                                {/* Invisible bridge — keeps hover active across the mb-3 gap */}
                                <div className="absolute top-full left-0 w-full h-4 bg-transparent" />
                                <MapCommandCenter
                                    mapRef={mapRef}
                                    mapStyle={mapStyle}
                                    setMapStyle={setMapStyle || (() => { })}
                                    onClose={() => { setIsMapClicked(false); setIsMapHovered(false); }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Desktop Filter */}
                    <div className="relative" ref={filterRefWrapper} onMouseEnter={() => setIsFilterHovered(true)} onMouseLeave={() => setIsFilterHovered(false)}>
                        <button
                            onClick={() => setIsFilterClicked(v => !v)}
                            aria-label="Open property filters"
                            className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 px-4 ${showFilter ? 'bg-blue-600 border-blue-600 text-white shadow-md' : isAnyFilterActive ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                        >
                            <FilterIcon className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Filters</span>
                        </button>

                        {showFilter && (
                            <div className="absolute bottom-full mb-3 right-0 z-50">
                                {/* Invisible bridge */}
                                <div className="absolute top-full right-0 w-full h-4 bg-transparent" />

                                <div className="bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-2 duration-200 border border-slate-200 w-[420px] max-h-[75vh]">
                                    {/* Scrollable body */}
                                    <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">

                                        {/* Status */}
                                        <div>
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Construction Status</h4>
                                            <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                                                {['All', 'Off-Plan', 'Completed'].map((status) => (
                                                    <button key={status} onClick={() => setStatusFilter(status)}
                                                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${statusFilter === status ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'}`}>
                                                        {status}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Location */}
                                        <div className="flex flex-col gap-3">
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Location</h4>
                                            <select value={selectedCity} onChange={handleCityChange}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none hover:border-blue-300 transition-colors cursor-pointer">
                                                <option value="">All Emirates</option>
                                                {cityOptions.map(city => <option key={city.id} value={city.id}>{city.label}</option>)}
                                            </select>
                                            <select value={selectedCommunity} onChange={handleCommunityChange} disabled={!selectedCity}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none disabled:opacity-50 hover:border-blue-300 transition-colors cursor-pointer">
                                                <option value="">All Communities</option>
                                                {availableCommunities.map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}
                                            </select>
                                        </div>

                                        {/* Developer */}
                                        <div>
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Developer</h4>
                                            <select value={developerFilter} onChange={(e) => setDeveloperFilter(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none hover:border-blue-300 transition-colors cursor-pointer">
                                                <option value="All">All Developers</option>
                                                {developerOptions.filter(d => d.name !== 'All').map(dev => <option key={dev.name} value={dev.name}>{dev.name} ({dev.count})</option>)}
                                            </select>
                                        </div>

                                        {/* Amenities */}
                                        <div>
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Amenities</h4>
                                                <button onClick={() => {
                                                    const allCats = ['school', 'hospital', 'retail', 'leisure', 'hotel', 'culture', 'airport', 'port', 'park', 'beach', 'hypermarket'];
                                                    activeAmenities.length > 0
                                                        ? activeAmenities.forEach(cat => onToggleAmenity?.(cat))
                                                        : allCats.forEach(cat => onToggleAmenity?.(cat));
                                                }} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                                                    {activeAmenities.length > 0 ? 'Clear All' : 'Select All'}
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { label: 'Schools', cat: 'school' },
                                                    { label: 'Hospitals', cat: 'hospital' },
                                                    { label: 'Retail', cat: 'retail' },
                                                    { label: 'Leisure', cat: 'leisure' },
                                                    { label: 'Hotels', cat: 'hotel' },
                                                    { label: 'Culture', cat: 'culture' },
                                                    { label: 'Airports', cat: 'airport' },
                                                    { label: 'Ports', cat: 'port' },
                                                    { label: 'Parks', cat: 'park' },
                                                    { label: 'Beaches', cat: 'beach' },
                                                    { label: 'Hypermarkets', cat: 'hypermarket' },
                                                ].map(({ label, cat }) => (
                                                    <button key={cat} onClick={() => onToggleAmenity?.(cat)}
                                                        className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${activeAmenities.includes(cat) ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'}`}>
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Toggles */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div
                                                className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
                                                onClick={() => setMapFeatures(prev => ({ ...prev, show3D: !prev.show3D }))}
                                            >
                                                <span className="text-xs font-bold text-slate-700">3D Buildings</span>
                                                <button className={`relative w-10 h-5 rounded-full transition-colors pointer-events-none ${mapFeatures.show3D ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                                    <span className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${mapFeatures.show3D ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => { onToggleDraw(); setIsFilterClicked(false); setIsFilterHovered(false); }}
                                                className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${isDrawing ? 'bg-violet-600 text-white border-violet-600 shadow-md' : 'bg-violet-50 text-violet-700 border-violet-100 hover:bg-violet-100'}`}
                                            >
                                                <Pencil className="w-4 h-4" />
                                                {isDrawing ? 'Cancel Area' : 'Draw Area'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="p-5 bg-slate-50 border-t border-slate-100 shrink-0">
                                        <button
                                            onClick={() => { setIsFilterClicked(false); setIsFilterHovered(false); }}
                                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-sm tracking-widest shadow-md transition-colors flex items-center justify-center gap-2"
                                        >
                                            <FilterIcon className="w-5 h-5" /> View {filteredCount} Results
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-px h-6 bg-slate-200 mx-2 hidden sm:block" />
                    <button onClick={onAdminClick} aria-label="Open admin dashboard" className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-xl border border-slate-200 transition-all" title="Admin CMS">
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* ─────────────────── MOBILE TAB BAR ─────────────────── */}
            <div
                className={`md:hidden fixed bottom-0 left-0 w-full border-t z-[6000] transition-colors duration-300 ${activeThemeClass}`}
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                <div className="flex justify-between items-center px-1 py-2">
                    <button onClick={onGlobalReset} aria-label="Reset map to full UAE view" className={`flex flex-col items-center gap-1 flex-1 py-1 ${inactiveIconColor} transition-colors`}>
                        <svg viewBox="0 0 100 120" className="w-6 h-6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M50 115C50 115 92 72 92 46C92 22.804 73.196 4 50 4C26.804 4 8 22.804 8 46C8 72 50 115 50 115Z" />
                        </svg>
                        <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
                    </button>

                    <button onClick={() => setIsMobileSearchOpen(true)} aria-label="Open property search" className={`flex flex-col items-center gap-1 flex-1 py-1 ${inactiveIconColor} transition-colors`}>
                        <Search className="w-6 h-6" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Search</span>
                    </button>

                    <button onClick={() => setIsMobileFilterOpen(true)} aria-label="Open property filters" className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors ${isAnyFilterActive ? activeIconColor : inactiveIconColor}`}>
                        <FilterIcon className="w-6 h-6" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Filters</span>
                    </button>

                    <button onClick={onAdminClick} aria-label="Open admin dashboard" className={`flex flex-col items-center gap-1 flex-1 py-1 ${inactiveIconColor} transition-colors`}>
                        <Settings className="w-6 h-6" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Admin</span>
                    </button>
                </div>
            </div>

            {/* ─────────────────── MOBILE SEARCH MODAL ─────────────────── */}
            {isMobileSearchOpen && (
                <div className="fixed inset-0 z-[7000] bg-slate-900/60 backdrop-blur-sm flex items-end md:hidden">
                    <div className="bg-white w-full rounded-t-3xl p-6 space-y-5 animate-in slide-in-from-bottom-full duration-300 shadow-2xl pb-10">
                        <div className="flex justify-between items-center">
                            <h3 className="text-base font-black text-slate-900 uppercase tracking-widest">Find Property</h3>
                            <button onClick={() => setIsMobileSearchOpen(false)} aria-label="Close search" className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="w-full">
                            <SearchBar
                                alwaysOpen={true}
                                projects={projects}
                                landmarks={landmarks}
                                onSelectProject={(p) => { onSelectProject(p); setIsMobileSearchOpen(false); }}
                                onSelectLandmark={(l) => { onSelectLandmark?.(l); setIsMobileSearchOpen(false); }}
                                onSelectDeveloper={(dev) => {
                                    setDeveloperFilter(dev);
                                    handleFitBounds(projects.filter(p => p.developerName === dev));
                                    setIsMobileSearchOpen(false);
                                }}
                                onSelectLocation={(name, type) => {
                                    if (type === 'city') {
                                        setSelectedCity(name.toLowerCase());
                                        setSelectedCommunity('');
                                        setDeveloperFilter('All');
                                        handleFitBounds(projects.filter(p => p.city?.toLowerCase() === name.toLowerCase()));
                                    } else if (type === 'community') {
                                        setSelectedCommunity(name);
                                        setDeveloperFilter('All');
                                        handleFitBounds(projects.filter(p => p.community?.toLowerCase() === name.toLowerCase()));
                                    }
                                    setIsMobileSearchOpen(false);
                                }}
                            />
                        </div>
                        <div className="space-y-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Emirate</label>
                                <select value={selectedCity} onChange={handleCityChange} className={selectCls}>
                                    <option value="">All Emirates</option>
                                    {cityOptions.map(city => <option key={city.id} value={city.id}>{city.label}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Community</label>
                                <select value={selectedCommunity} onChange={handleCommunityChange} className={`${selectCls} disabled:opacity-50`} disabled={!selectedCity}>
                                    <option value="">Select Community</option>
                                    {availableCommunities.map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}
                                </select>
                            </div>
                        </div>
                        <button onClick={() => setIsMobileSearchOpen(false)} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all">
                            Discover Results
                        </button>
                    </div>
                </div>
            )}

            {/* ─────────────────── MOBILE FILTER MODAL ─────────────────── */}
            {isMobileFilterOpen && (
                <div className="fixed inset-0 z-[7000] pointer-events-none flex justify-center items-end p-4 pb-[90px] md:hidden">
                    <div className="absolute inset-0 pointer-events-auto bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsMobileFilterOpen(false)} />
                    <div className="relative w-full bg-white shadow-2xl rounded-3xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-300 pointer-events-auto border border-slate-100 max-h-[75vh]">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Map Filters</h3>
                            <button onClick={() => setIsMobileFilterOpen(false)} className="p-1.5 bg-white rounded-full text-slate-500 hover:text-slate-900 transition-colors shadow-sm border border-slate-200">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {/* Scrollable body */}
                        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar space-y-4">
                            <div className="flex gap-1.5">
                                {['All', 'Off-Plan', 'Completed'].map((status) => (
                                    <button key={status} onClick={() => setStatusFilter(status)}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${statusFilter === status ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                        {status}
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-col gap-2">
                                <select value={selectedCity} onChange={handleCityChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none">
                                    <option value="">All Emirates</option>
                                    {cityOptions.map(city => <option key={city.id} value={city.id}>{city.label}</option>)}
                                </select>
                                <select value={selectedCommunity} onChange={handleCommunityChange} disabled={!selectedCity} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none disabled:opacity-50">
                                    <option value="">All Communities</option>
                                    {availableCommunities.map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}
                                </select>
                            </div>
                            <select value={developerFilter} onChange={(e) => setDeveloperFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none">
                                <option value="All">All Developers</option>
                                {developerOptions.filter(d => d.name !== 'All').map(dev => (
                                    <option key={dev.name} value={dev.name}>{dev.name} ({dev.count})</option>
                                ))}
                            </select>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Amenities</h4>
                                    <button onClick={() => {
                                        const allCats = ['school', 'hospital', 'retail', 'leisure', 'hotel', 'culture', 'airport', 'port', 'park', 'beach', 'hypermarket'];
                                        activeAmenities.length > 0 ? activeAmenities.forEach(cat => onToggleAmenity?.(cat)) : allCats.forEach(cat => onToggleAmenity?.(cat));
                                    }} className="text-[9px] font-bold text-blue-600 hover:text-blue-800 transition-colors">
                                        {activeAmenities.length > 0 ? 'Clear All' : 'Select All'}
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { label: 'Schools', cat: 'school' },
                                        { label: 'Hospitals', cat: 'hospital' },
                                        { label: 'Retail', cat: 'retail' },
                                        { label: 'Leisure', cat: 'leisure' },
                                        { label: 'Hotels', cat: 'hotel' },
                                        { label: 'Culture', cat: 'culture' },
                                        { label: 'Airports', cat: 'airport' },
                                        { label: 'Ports', cat: 'port' },
                                        { label: 'Parks', cat: 'park' },
                                        { label: 'Beaches', cat: 'beach' },
                                        { label: 'Hypermarkets', cat: 'hypermarket' },
                                    ].map(({ label, cat }) => (
                                        <button key={cat} onClick={() => onToggleAmenity?.(cat)}
                                            className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${activeAmenities.includes(cat) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-700">3D Buildings</span>
                                    <button onClick={() => setMapFeatures(prev => ({ ...prev, show3D: !prev.show3D }))} className={`relative w-8 h-4 rounded-full transition-colors ${mapFeatures.show3D ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                        <span className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${mapFeatures.show3D ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                <button onClick={() => { onToggleDraw(); setIsMobileFilterOpen(false); }} className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-[10px] font-bold transition-all ${isDrawing ? 'bg-violet-600 text-white border-violet-600' : 'bg-violet-50 text-violet-700 border-violet-100 hover:bg-violet-100'}`}>
                                    <Pencil className="w-3.5 h-3.5" />
                                    {isDrawing ? 'Cancel Area' : 'Draw Area'}
                                </button>
                            </div>
                        </div>
                        {/* Footer */}
                        <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                            <button onClick={() => setIsMobileFilterOpen(false)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-md transition-colors">
                                View {filteredCount} Results
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default BottomControlBar;
