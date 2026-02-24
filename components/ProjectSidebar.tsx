import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { Project, Landmark } from '../types';
import { X, MapPin, BedDouble, Bath, Square, Calendar, ArrowRight, Activity, Building, LayoutTemplate, Car, Footprints, Clock, MessageSquare, Compass, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { calculateDistance } from '../utils/geo';
import TextModal from './TextModal';
import InquireModal from './InquireModal';

interface ProjectSidebarProps {
  project: Project | null;
  onClose: () => void;
  onDiscoverNeighborhood: (lat: number, lng: number) => Promise<void>;
  onQuickFilter?: (type: 'community' | 'developer', value: string) => void;
  setSelectedCity?: (city: string) => void;
  setFullscreenImage: (url: string | null) => void;
  activeIsochrone: { mode: 'driving' | 'walking'; minutes: number } | null;
  setActiveIsochrone: (iso: { mode: 'driving' | 'walking'; minutes: number } | null) => void;
  nearbyLandmarks: Landmark[];
  onFlyTo: (lng: number, lat: number, zoom?: number) => void;
  setShowNearbyPanel: (v: boolean) => void;
}

// Category colour mapping (mirrors AmenityMarker)
const categoryStyle: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  school: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'School' },
  hospital: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Hospital' },
  retail: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Retail' },
  culture: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500', label: 'Culture' },
  hotel: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Hotel' },
  leisure: { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500', label: 'Leisure' },
};
const defaultStyle = { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400', label: 'Landmark' };

// Strict price guard — hides block if value is falsy, '0', 'NaN', or parses to NaN
const isValidPrice = (range?: string): boolean => {
  if (!range) return false;
  const raw = range.split('-')[0].trim().replace(/[^0-9.]/g, '');
  const n = Number(raw);
  return raw.length > 0 && !isNaN(n) && n > 0;
};

// Formats stored completionDate strings like "Q3 2026" or ISO dates into a unified "Q# YYYY" label
const formatCompletionDate = (dateStr?: string): string => {
  if (!dateStr || dateStr.trim() === '' || dateStr === 'N/A') return 'N/A';
  if (/^Q[1-4]\s+\d{4}$/.test(dateStr.trim())) return dateStr.trim();
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime()) || d.getFullYear() < 1990) return dateStr;
    const q = Math.ceil((d.getMonth() + 1) / 3);
    return `Q${q} ${d.getFullYear()}`;
  } catch { return dateStr; }
};

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  project,
  onClose,
  onDiscoverNeighborhood,
  onQuickFilter,
  setSelectedCity,
  setFullscreenImage,
  activeIsochrone,
  setActiveIsochrone,
  nearbyLandmarks,
  onFlyTo,
  setShowNearbyPanel,
}) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [tick, setTick] = useState(0);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [isInquireModalOpen, setIsInquireModalOpen] = useState(false);

  if (!project) return null;

  // ---- Explore Neighborhood: zoom out to reveal amenity markers ----
  const handleExploreNeighborhood = () => {
    const lat = Number(project.latitude);
    const lng = Number(project.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      onFlyTo(lng, lat, 14.5);
    }
  };

  // ── Build a unified gallery: prefer optimizedGallery, fall back to images[]
  const gallery = useMemo(() => {
    if (project.optimizedGallery && project.optimizedGallery.length > 0) {
      return project.optimizedGallery;
    }
    const rawUrls = (project.images && project.images.length > 0)
      ? project.images
      : [project.thumbnailUrl || ''];
    return rawUrls.filter(Boolean).map(url => ({ thumb: url, large: url }));
  }, [project.optimizedGallery, project.images, project.thumbnailUrl]);

  const hasMultipleImages = gallery.length > 1;
  const currentImage = gallery[activeIdx] ?? gallery[0];

  // Reset synchronously on project change
  useLayoutEffect(() => {
    setActiveIdx(0);
    setIsPlaying(true);
    setTick(0);
  }, [project.id]);

  // Tick-based slideshow engine — 50ms interval drives SVG progress ring
  const MAX_TICKS = 120; // 6 seconds at 50ms per tick
  useEffect(() => {
    if (!isPlaying || !hasMultipleImages) {
      setTick(0);
      return;
    }
    const timer = setInterval(() => {
      setTick(prev => {
        if (prev >= MAX_TICKS) {
          setActiveIdx(curr => (curr + 1) % gallery.length);
          return 0;
        }
        return prev + 1;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [isPlaying, gallery.length, hasMultipleImages]);

  const handleNextImage = () => {
    setActiveIdx(prev => (prev + 1) % gallery.length);
    setTick(0);
  };

  const handlePrevImage = () => {
    setActiveIdx(prev => (prev - 1 + gallery.length) % gallery.length);
    setTick(0);
  };

  const handleThumbClick = (idx: number) => {
    setActiveIdx(idx);
    setTick(0);
  };

  const DESCRIPTION_LIMIT = 250;
  const rawDescription = project.description || '';
  const plainText = rawDescription.replace(/<[^>]*>/g, '');
  const isDescriptionLong = plainText.length > DESCRIPTION_LIMIT;
  const truncatedHtml = isDescriptionLong
    ? plainText.slice(0, DESCRIPTION_LIMIT)
    : rawDescription;

  // Filter nearby landmarks by same community
  const communityLandmarks = nearbyLandmarks.filter(l =>
    !l.isHidden &&
    l.community?.toLowerCase() === project.community?.toLowerCase()
  ).slice(0, 10);

  // Isochrone local state
  const isoMode = activeIsochrone?.mode ?? 'driving';
  const isoMinutes = activeIsochrone?.minutes ?? 10;

  // Haversine Engine calculation for exact Top 5 proximity
  const nearbyAmenities = React.useMemo(() => {
    if (!project.latitude || !project.longitude || nearbyLandmarks.length === 0) return [];

    return nearbyLandmarks
      .filter(l => !l.isHidden && l.latitude && l.longitude)
      .map(landmark => {
        const distance = calculateDistance(
          Number(project.latitude),
          Number(project.longitude),
          Number(landmark.latitude),
          Number(landmark.longitude)
        );
        return { ...landmark, distance };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }, [project.latitude, project.longitude, nearbyLandmarks]);

  return (
    <>
      <div className="h-full flex flex-col bg-white text-slate-800 font-sans shadow-2xl relative border-l border-slate-200">

        {/* 1. Hero Gallery — single thumb image + tick-based slideshow engine */}
        <div
          className="relative h-64 w-full shrink-0 bg-slate-100 overflow-hidden group"
          onMouseEnter={() => setIsPlaying(false)}
          onMouseLeave={() => setIsPlaying(true)}
        >
          {/* Single hero image — thumb is the correct size for a 380px panel */}
          <img
            key={currentImage.thumb}
            src={currentImage.thumb}
            alt={project.name}
            loading="eager"
            fetchpriority="high"
            decoding="async"
            onClick={() => setFullscreenImage(currentImage.large)}
            className="absolute inset-0 w-full h-full object-cover cursor-zoom-in transition-opacity duration-300"
          />

          {/* Play/Pause button with circular SVG progress ring */}
          {hasMultipleImages && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsPlaying(p => !p); }}
              aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
              className="absolute top-4 left-4 bg-black/40 hover:bg-black/70 backdrop-blur-md text-white rounded-full transition-all border border-white/20 z-10 flex items-center justify-center w-9 h-9"
            >
              {isPlaying ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />
                    <circle
                      cx="18" cy="18" r="14"
                      fill="none" stroke="white" strokeWidth="2.5"
                      strokeDasharray="88"
                      strokeDashoffset={88 - (88 * tick) / MAX_TICKS}
                      strokeLinecap="round"
                    />
                  </svg>
                  <Pause className="w-3.5 h-3.5 fill-current relative z-10" />
                </div>
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close property details"
            className="absolute top-4 right-4 bg-black/40 hover:bg-black/70 backdrop-blur-md text-white p-2 rounded-full transition-all border border-white/20 z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Prev / Next arrows — visible on hover */}
          {hasMultipleImages && (
            <>
              <button
                onClick={handlePrevImage}
                aria-label="Previous image"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/40 hover:bg-black/70 backdrop-blur-md text-white rounded-full border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextImage}
                aria-label="Next image"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/40 hover:bg-black/70 backdrop-blur-md text-white rounded-full border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Thumbnail strip — always visible, images use lazy loading (hero owns bandwidth) */}
          {hasMultipleImages && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pt-6 pb-2 px-2 flex gap-2 overflow-x-auto hide-scrollbar">
              {gallery.map((img, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); handleThumbClick(idx); }}
                  aria-label={`View image ${idx + 1}`}
                  className={`shrink-0 w-14 h-10 rounded-lg overflow-hidden border-2 transition-all ${activeIdx === idx ? 'border-white scale-105 shadow-lg' : 'border-white/40 opacity-70 hover:opacity-100 hover:border-white'
                    }`}
                >
                  <img src={img.thumb} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Dot indicator + expand hint row */}
          <div className="absolute bottom-2 right-2 flex items-center gap-2 z-10">
            {hasMultipleImages && (
              <div className="flex gap-1">
                {gallery.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleThumbClick(idx)}
                    aria-label={`Go to image ${idx + 1}`}
                    className={`rounded-full transition-all ${activeIdx === idx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                      }`}
                  />
                ))}
              </div>
            )}
            <button
              onClick={() => setFullscreenImage(currentImage.large)}
              aria-label="View fullscreen"
              className="bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg pointer-events-auto hover:bg-black/60 transition-all"
            >
              ⤢ Expand
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">

          {/* 2. Name → Location → Developer — sticky while scrolling */}
          <div className="sticky top-0 z-20 bg-white px-6 pt-6 pb-5 border-b border-slate-100 shadow-sm">
            <h1 className="text-2xl font-black text-slate-900 leading-tight tracking-tight mb-2">{project.name}</h1>
            <div className="flex items-center text-slate-500 text-xs font-bold uppercase tracking-widest mb-3">
              <MapPin className="w-4 h-4 mr-1.5 text-blue-600 shrink-0" />
              <button
                onClick={() => onQuickFilter && project.community ? onQuickFilter('community', project.community) : undefined}
                className="hover:text-blue-800 hover:underline transition-all text-left truncate"
              >
                {project.community}
              </button>
              {project.city && (
                <><span className="mx-2 text-slate-300">/</span>
                  <button
                    onClick={() => setSelectedCity?.(project.city || '')}
                    className="text-slate-600 hover:text-blue-800 hover:underline transition-all text-left"
                  >
                    {project.city}
                  </button></>
              )}
            </div>
            <p className="text-sm font-black text-blue-600 uppercase tracking-widest">
              <button
                onClick={() => onQuickFilter && project.developerName ? onQuickFilter('developer', project.developerName) : undefined}
                className="hover:text-blue-800 hover:underline transition-all text-left"
              >
                {project.developerName || 'Exclusive Developer'}
              </button>
            </p>
          </div>

          <div className="px-6 py-6 space-y-8">

            {/* 3. Data Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Strict NaN guard — only render if number is valid and > 0 */}
              {isValidPrice(project.priceRange) && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3 col-span-2">
                  <Building className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Starting Price</p>
                    <p className="font-bold text-slate-900 text-lg">
                      AED {Number(project.priceRange!.split('-')[0].trim().replace(/[^0-9.]/g, '')).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {project.type && project.type.toLowerCase() !== 'apartment' && project.type !== 'N/A' && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3">
                  <LayoutTemplate className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Type</p>
                    <p className="font-bold text-slate-800 text-sm capitalize">{project.type}</p>
                  </div>
                </div>
              )}
              {project.bedrooms && project.bedrooms !== 'N/A' && project.bedrooms !== '0' && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3">
                  <BedDouble className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Beds</p>
                    <p className="font-bold text-slate-800 text-sm">{project.bedrooms}</p>
                  </div>
                </div>
              )}
              {project.bathrooms && project.bathrooms !== 'N/A' && project.bathrooms !== '0' && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3">
                  <Bath className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Baths</p>
                    <p className="font-bold text-slate-800 text-sm">{project.bathrooms}</p>
                  </div>
                </div>
              )}
              {project.completionDate && project.completionDate !== 'N/A' && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Completion</p>
                    <p className="font-bold text-slate-800 text-sm">{formatCompletionDate(project.completionDate)}</p>
                  </div>
                </div>
              )}
              {project.builtupArea && project.builtupArea !== 0 && project.builtupArea !== '0' && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3">
                  <Square className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">BUA</p>
                    <p className="font-bold text-slate-800 text-sm">{Number(project.builtupArea).toLocaleString()} sqft</p>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Description */}
            {rawDescription && (
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center">
                  <Activity className="w-4 h-4 mr-2 text-blue-600" />About The Project
                </h3>
                {isDescriptionLong ? (
                  <div>
                    <p className="prose prose-sm text-slate-600 leading-relaxed max-w-none">{truncatedHtml}…</p>
                    <button onClick={() => setIsTextModalOpen(true)} className="mt-2 text-blue-600 hover:text-blue-800 text-xs font-black uppercase tracking-widest transition-colors">
                      Read More →
                    </button>
                  </div>
                ) : (
                  <div className="prose prose-sm text-slate-600 leading-relaxed max-w-none prose-p:mb-2 prose-strong:text-slate-900" dangerouslySetInnerHTML={{ __html: rawDescription }} />
                )}
              </div>
            )}

            {/* 5. Lifestyle Amenities */}
            {project.amenities && project.amenities.length > 0 && (
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center">
                  <LayoutTemplate className="w-4 h-4 mr-2 text-blue-600" />Lifestyle Amenities
                </h3>
                <div className="flex flex-wrap gap-2">
                  {project.amenities.map((amenity, idx) => (
                    <div key={idx} className="px-3 py-2 bg-white text-slate-600 text-[11px] font-bold uppercase tracking-wider border border-slate-200 rounded-lg shadow-sm flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {amenity}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Drive-Time Isochrone */}
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center">
                <Clock className="w-4 h-4 mr-2 text-blue-600" />Commute & Drive-Time
              </h3>
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4">
                {(['driving', 'walking'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setActiveIsochrone({ mode, minutes: isoMinutes })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${isoMode === mode && activeIsochrone ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    {mode === 'driving' ? <Car className="w-4 h-4" /> : <Footprints className="w-4 h-4" />}
                    {mode}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>5 min</span>
                  <span className="text-blue-600 font-black">{isoMinutes} min</span>
                  <span>30 min</span>
                </div>
                <input
                  type="range" min={5} max={30} step={5}
                  value={isoMinutes}
                  onChange={e => setActiveIsochrone({ mode: isoMode, minutes: Number(e.target.value) })}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
              {activeIsochrone && (
                <button onClick={() => setActiveIsochrone(null)} className="mt-3 text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors">
                  ✕ Clear isochrone
                </button>
              )}
            </div>

            {/* 7. Top 5 Nearby Amenities List */}
            {nearbyAmenities.length > 0 && (
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center">
                  <Compass className="w-4 h-4 mr-2 text-blue-600" />Nearby Amenities
                </h3>
                <div className="space-y-3 mb-4">
                  {nearbyAmenities.map((amenity) => {
                    const style = categoryStyle[amenity.category.toLowerCase()] || defaultStyle;
                    return (
                      <div key={amenity.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm gap-2">
                        <div className="flex flex-1 min-w-0 items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.bg} ${style.text}`}>
                            <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-slate-800 truncate">{amenity.name}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{style.label}</p>
                          </div>
                        </div>
                        <div className="sm:text-right shrink-0 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                          <p className="text-xs font-black text-slate-700">{amenity.distance.toFixed(2)} km</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 7. Nearby Amenities — opens the NearbyPanel */}
            <button
              onClick={() => setShowNearbyPanel(true)}
              className="w-full mt-4 mb-2 py-3 bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-blue-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              View All Amenities
            </button>

            <div id="sidebar-map-section" />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-white border-t border-slate-100 z-10 shrink-0 space-y-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
          {/* Explore Neighborhood — zooms out to 14.5 so amenity markers become visible */}
          <button
            onClick={handleExploreNeighborhood}
            disabled={isDiscovering}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all hover:shadow-xl hover:shadow-blue-200 active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-3"
          >
            <MapPin className="w-4 h-4" />
            <span>Explore Neighborhood</span>
          </button>

          {/* Inquire Now — replaces "Request Floor Plans" */}
          <button
            onClick={() => setIsInquireModalOpen(true)}
            className="flex items-center justify-center w-full py-4 border border-blue-200 hover:border-blue-600 text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all gap-2 group"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Inquire Now</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      {/* Modals */}
      {isTextModalOpen && (<TextModal text={rawDescription} onClose={() => setIsTextModalOpen(false)} />)}
      {isInquireModalOpen && (
        <InquireModal projectName={project.name} onClose={() => setIsInquireModalOpen(false)} />
      )}
    </>
  );
};

export default ProjectSidebar;
