import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Project, Landmark } from '../types';
import { X, MapPin, BedDouble, Bath, Square as SquareIcon, Calendar, ArrowRight, Activity, Building, LayoutTemplate, Car, Footprints, Clock, MessageSquare, Compass, ChevronLeft, ChevronRight, Play, Pause, Square, StopCircle, Share2, Heart, GitCompare, Loader2, Flag, Download } from 'lucide-react';
import { calculateDistance } from '../utils/geo';
import TextModal from './TextModal';
import InquireModal from './InquireModal';
import ReportModal from './ReportModal';
import { pdf } from '@react-pdf/renderer';
import ProjectPdfDocument from './pdf/ProjectPdfDocument';
import { getRelatedProjects } from '../utils/projectHelpers';

const PUBLIC_MAPBOX_TOKEN = typeof window !== 'undefined'
  ? atob('cGsuZXlKMUlqb2ljSE5wYm5ZaUxDSmhJam9pWTIxc2NqQnpNMjF4TURacU56Tm1jMlZtZEd0NU1XMDVaQ0o5LlZ4SUVuMWpMVHpNd0xBTjhtNEIxNWc=')
  : '';


interface ProjectSidebarProps {
  project: Project | null;
  allProjects: Project[];
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
  onRouteReady?: (geometry: any | null) => void;
  mapRef?: React.MutableRefObject<any>;
  onSelectLandmark?: (landmark: Landmark) => void;
}

// Category colour mapping (mirrors AmenityMarker)
const categoryStyle: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  school: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'School' },
  hospital: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Hospital' },
  retail: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Retail' },
  culture: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500', label: 'Culture' },
  hotel: { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500', label: 'Hotel' },
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

const AnimatedMetricPill = ({ distance, driveTime, walkTime }: { distance: number, driveTime: number, walkTime: number }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(interval);
  }, [isHovered]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % 3);
  };

  const metrics = [
    { label: 'Distance', value: `${distance.toFixed(1)} km`, icon: <MapPin className="w-3 h-3" />, color: 'text-slate-500' },
    { label: 'Drive', value: `${driveTime} min`, icon: <Car className="w-3 h-3" />, color: 'text-blue-600' },
    { label: 'Walk', value: `${walkTime} min`, icon: <Footprints className="w-3 h-3" />, color: 'text-amber-600' },
  ];

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative h-10 w-[110px] bg-slate-50 hover:bg-white border border-slate-100 hover:border-blue-200 rounded-lg cursor-pointer transition-all group overflow-hidden select-none shrink-0"
    >
      {metrics.map((metric, idx) => {
        const isActive = activeIndex === idx;
        return (
          <div
            key={idx}
            className={`absolute inset-0 px-3 flex items-center justify-between gap-2 transition-opacity duration-700 ease-in-out ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
          >
            <span className={`${metric.color} bg-white p-1 rounded-md shadow-sm border border-slate-100 group-hover:scale-110 transition-transform shrink-0`}>
              {metric.icon}
            </span>
            <div className="flex flex-col items-end leading-none min-w-0 flex-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate w-full text-right">{metric.label}</span>
              <span className={`text-xs font-bold ${metric.color} truncate w-full text-right`}>{metric.value}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  project,
  allProjects,
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
  onRouteReady,
  mapRef,
  onSelectLandmark,
}) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false); // start paused — user opts in
  const [tick, setTick] = useState(0);
  const [isMainImageLoaded, setIsMainImageLoaded] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [isInquireModalOpen, setIsInquireModalOpen] = useState(false);
  const [customDestQuery, setCustomDestQuery] = useState('');
  const [customDestResult, setCustomDestResult] = useState<{ name: string; roadKm: number; driveMinutes: number } | null>(null);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const destSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // ── localStorage Save helper (Favorites & Compare) ─────────────────────
  const handleSaveLocal = (type: 'favorite' | 'compare') => {
    if (!project) return;
    const key = type === 'favorite' ? 'psi_favorites' : 'psi_compare';
    const label = type === 'favorite' ? 'Favorites' : 'Comparison List';
    const existing: string[] = JSON.parse(localStorage.getItem(key) || '[]');
    if (!existing.includes(project.id)) {
      localStorage.setItem(key, JSON.stringify([...existing, project.id]));
      alert(`Added to ${label}!`);
    } else {
      alert(`Already in ${label}.`);
    }
  };

  // ── Native Web Share (with clipboard fallback) ──────────────────────
  const handleNativeShare = async () => {
    if (!project) return;
    const text = `Check out ${project.name} by ${project.developerName} in ${project.community || project.city || 'UAE'}.`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: project.name, text, url: window.location.href });
      } catch (err) {
        console.log('Share cancelled or failed:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      } catch {
        alert('Unable to copy — please copy the URL manually.');
      }
    }
  };

  // ── PDF export handler ──────────────────────────────────────────────────
  const handleExportPdf = async () => {
    if (!project) return;
    setIsGeneratingPdf(true);
    try {
      // 1. Capture map snapshot (requires preserveDrawingBuffer: true on the Map)
      let snapshotUrl = '';
      try {
        const mapCanvas = mapRef?.current?.getMap?.()?.getCanvas?.();
        if (mapCanvas) snapshotUrl = mapCanvas.toDataURL('image/jpeg', 0.85);
      } catch (e) {
        console.warn('Map snapshot unavailable:', e);
      }

      // 2. Gather related projects
      const related = getRelatedProjects(project, allProjects);

      // 3. Generate PDF blob
      const blob = await pdf(
        <ProjectPdfDocument
          project={project}
          mapSnapshotUrl={snapshotUrl}
          nearbys={nearbyLandmarks}
          related={related as any}
          communityBrief={`${project.community || 'This community'} is a vibrant, master-planned hub featuring a mix of residential, retail, and leisure spaces designed for modern living.`}
          developerBrief={`${project.developerName} has established a reputation for excellence, innovation, and timely delivery of iconic developments throughout the UAE.`}
        />
      ).toBlob();

      // 4. Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.name.replace(/\s+/g, '_')}_Brochure.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate brochure. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // ── Neighborhood Tour state ──────────────────────────────────────────────
  const [showNeighborhoodList, setShowNeighborhoodList] = useState(false);
  const [isTouringNeighborhood, setIsTouringNeighborhood] = useState(false);
  const [activeTourAmenityIdx, setActiveTourAmenityIdx] = useState<number | null>(null);
  const [amenitySearch, setAmenitySearch] = useState('');
  const [visibleAmenitiesCount, setVisibleAmenitiesCount] = useState(15);

  // Auto-expand visible window if tour advances past the current limit
  useEffect(() => {
    if (activeTourAmenityIdx !== null && activeTourAmenityIdx >= visibleAmenitiesCount) {
      setVisibleAmenitiesCount(activeTourAmenityIdx + 5);
    }
  }, [activeTourAmenityIdx, visibleAmenitiesCount]);

  // ── Sort nearbyLandmarks by distance for the tour ───────────────────────
  const localAmenities = useMemo(() => {
    if (!project) return [];
    const pLat = Number(project.latitude);
    const pLng = Number(project.longitude);
    if (isNaN(pLat) || isNaN(pLng)) return [];
    return nearbyLandmarks
      .filter(a => {
        const lat = Number(a.latitude);
        const lng = Number(a.longitude);
        return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
      })
      .map(a => ({
        ...a,
        distance: calculateDistance(pLat, pLng, Number(a.latitude), Number(a.longitude)),
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [project, nearbyLandmarks]);

  // ── Filter localAmenities by live search query ───────────────────────────
  const searchedAmenities = useMemo(() => {
    if (!amenitySearch.trim()) return localAmenities;
    const q = amenitySearch.toLowerCase();
    return localAmenities.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.category?.toLowerCase().includes(q)
    );
  }, [localAmenities, amenitySearch]);

  // ── Cinematic tour timer — dispatches CustomEvent every 8 s ─────────────
  useEffect(() => {
    if (!isTouringNeighborhood || searchedAmenities.length === 0) return;
    const timer = setInterval(() => {
      setActiveTourAmenityIdx(prev => {
        const nextIdx = prev === null ? 0 : (prev + 1) % searchedAmenities.length;
        const amenity = searchedAmenities[nextIdx];
        if (project) {
          window.dispatchEvent(new CustomEvent('tour-fly-bounds', {
            detail: {
              pLng: project.longitude, pLat: project.latitude,
              aLng: amenity.longitude, aLat: amenity.latitude,
              amenityId: amenity.id,
            },
          }));
        }
        return nextIdx;
      });
    }, 8000);
    return () => clearInterval(timer);
  }, [isTouringNeighborhood, searchedAmenities, project]);

  // ── Auto-scroll tour list to keep active item centred in view ────────────
  useEffect(() => {
    if (isTouringNeighborhood) {
      const activeEl = document.getElementById(`tour-amenity-${activeTourAmenityIdx}`);
      if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeTourAmenityIdx, isTouringNeighborhood]);

  // ── Sync active tour amenity → global map highlight ──────────────────────
  useEffect(() => {
    if (activeTourAmenityIdx !== null && searchedAmenities[activeTourAmenityIdx]) {
      onSelectLandmark?.(searchedAmenities[activeTourAmenityIdx]);
    }
  }, [activeTourAmenityIdx, searchedAmenities, onSelectLandmark]);

  if (!project) return null;

  // ---- Explore Neighborhood: open the tour list view ----
  const handleExploreNeighborhood = () => {
    setShowNeighborhoodList(true);
  };

  // ---- Custom Distance Calculator: live debounced autocomplete ----
  const fetchDestSuggestions = (query: string) => {
    setCustomDestQuery(query);
    if (destSearchRef.current) clearTimeout(destSearchRef.current);
    if (!query.trim()) {
      setDestSuggestions([]);
      setCustomDestResult(null);
      setIsSearchingDest(false);
      onRouteReady?.(null);
      return;
    }
    if (!project.latitude || !project.longitude) return;
    setIsSearchingDest(true);
    destSearchRef.current = setTimeout(() => {
      if ((window as any).google && (window as any).google.maps.places) {
        const service = new (window as any).google.maps.places.AutocompleteService();
        service.getPlacePredictions(
          { input: query, componentRestrictions: { country: 'ae' } },
          (predictions: any, status: any) => {
            if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && predictions) {
              setDestSuggestions(predictions);
            } else {
              console.error('Google Places API Error (ProjectSidebar):', status);
              setDestSuggestions([]);
            }
            setIsSearchingDest(false);
          }
        );
      } else {
        console.error('Google Maps API script is missing or blocked.');
        setIsSearchingDest(false);
      }
    }, 300);
  };

  // ---- Fetch real driving route via Mapbox Directions (traffic profile) ----
  const fetchRealRoute = async (destLng: number, destLat: number): Promise<void> => {
    const startLng = Number(project.longitude);
    const startLat = Number(project.latitude);
    if (isNaN(startLng) || isNaN(startLat)) return;
    setIsFetchingRoute(true);
    try {
      const url =
        `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
        `${startLng},${startLat};${destLng},${destLat}` +
        `?geometries=geojson&overview=full&access_token=${PUBLIC_MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const roadKm = parseFloat((route.distance / 1000).toFixed(1));
        const driveMinutes = Math.ceil(route.duration / 60);
        const geometry = route.geometry; // GeoJSON LineString
        setCustomDestResult(prev => prev ? { ...prev, roadKm, driveMinutes } : { name: '', roadKm, driveMinutes });
        onRouteReady?.(geometry);
      }
    } catch (err) {
      console.error('Directions API error:', err);
    }
    setIsFetchingRoute(false);
  };

  const handleSelectDest = (prediction: any) => {
    const label = prediction.description;
    setCustomDestResult({ name: label, roadKm: 0, driveMinutes: 0 });
    setCustomDestQuery(label);
    setDestSuggestions([]);
    if ((window as any).google) {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ placeId: prediction.place_id }, async (results: any, status: any) => {
        if (status === 'OK' && results && results[0]) {
          const loc = results[0].geometry.location;
          await fetchRealRoute(loc.lng(), loc.lat());
        }
      });
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

  // Reset synchronously on project change — clears stale state before paint
  useLayoutEffect(() => {
    setActiveIdx(0);
    setIsPlaying(false);    // each new project starts paused
    setTick(0);
    setIsMainImageLoaded(false); // block thumbnails until new hero loads
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
        const driveTime = Math.ceil((distance / 40) * 60) + 2;
        const walkTime = Math.ceil((distance / 5) * 60);
        return { ...landmark, distance, driveTime, walkTime };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }, [project.latitude, project.longitude, nearbyLandmarks]);
  // ── Neighborhood Tour view — early return when active ────────────────────
  if (showNeighborhoodList) {
    const stopTour = () => {
      setIsTouringNeighborhood(false);
      setActiveTourAmenityIdx(null);
    };
    return (
      <div className="flex flex-col h-full bg-white relative">

        {/* Sticky header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-20 shadow-sm">
          <button
            onClick={() => { setShowNeighborhoodList(false); stopTour(); }}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-bold text-sm">Back to Project</span>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isTouringNeighborhood) {
                setIsTouringNeighborhood(false);
                setActiveTourAmenityIdx(null);
                setVisibleAmenitiesCount(15);
              } else {
                setIsTouringNeighborhood(true);
                const first = searchedAmenities[0];
                if (first && project) {
                  setActiveTourAmenityIdx(0);
                  window.dispatchEvent(new CustomEvent('tour-fly-bounds', {
                    detail: {
                      pLng: project.longitude, pLat: project.latitude,
                      aLng: first.longitude, aLat: first.latitude,
                      amenityId: first.id,
                    },
                  }));
                }
              }
            }}
            className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${isTouringNeighborhood
              ? 'bg-red-100 text-red-600 hover:bg-red-200'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
              }`}
          >
            {isTouringNeighborhood
              ? <><Square className="w-4 h-4 fill-current" /> Stop Tour</>
              : <><Play className="w-4 h-4 fill-current" /> Start Tour</>
            }
          </button>
        </div>

        {/* Amenity list */}
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-3">
            <h3 className="text-base font-black text-slate-800">Neighborhood: {project.name}</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {searchedAmenities.length} of {localAmenities.length} nearby landmarks
            </p>
          </div>

          {/* Search bar */}
          <div className="mb-4 relative">
            <input
              type="text"
              placeholder="Search landmarks (e.g. Louvre, Hotel, Beach)…"
              value={amenitySearch}
              onChange={e => setAmenitySearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
            />
            {amenitySearch && (
              <button
                onClick={() => setAmenitySearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors text-xs font-black"
              >✕</button>
            )}
          </div>

          {searchedAmenities.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-bold">{amenitySearch ? 'No matches found.' : 'No landmarks loaded yet.'}</p>
              <p className="text-xs mt-1">{amenitySearch ? 'Try a different search term.' : 'Use the Filters panel to toggle an amenity category.'}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {searchedAmenities.slice(0, visibleAmenitiesCount).map((amenity, idx) => {
                const isActive = activeTourAmenityIdx === idx;
                const style = categoryStyle[amenity.category?.toLowerCase?.()] ?? defaultStyle;
                return (
                  <div
                    key={amenity.id}
                    id={`tour-amenity-${idx}`}
                    onClick={() => {
                      setActiveTourAmenityIdx(idx);
                      if (project) {
                        window.dispatchEvent(new CustomEvent('tour-fly-bounds', {
                          detail: {
                            pLng: project.longitude, pLat: project.latitude,
                            aLng: amenity.longitude, aLat: amenity.latitude,
                            amenityId: amenity.id,
                          },
                        }));
                      }
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all select-none ${isActive
                      ? 'border-blue-500 bg-blue-50 shadow-md scale-[1.02]'
                      : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm leading-snug truncate">{amenity.name}</h4>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <AnimatedMetricPill
                          distance={amenity.distance}
                          driveTime={Math.ceil((amenity.distance / 40) * 60) + 2}
                          walkTime={Math.ceil((amenity.distance / 5) * 60)}
                        />
                        {isActive && (
                          <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">● Live</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* View More button */}
              {visibleAmenitiesCount < searchedAmenities.length && (
                <div className="pt-4 pb-8 flex justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); setVisibleAmenitiesCount(prev => prev + 15); }}
                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-full transition-colors border border-slate-200 shadow-sm"
                  >
                    View More ({searchedAmenities.length - visibleAmenitiesCount} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col bg-white text-slate-800 font-sans shadow-2xl relative border-l border-slate-200">

        {/* 1. Hero Gallery — single optimized thumb + tick-based slideshow engine */}
        <div
          className="relative h-64 w-full shrink-0 bg-slate-100 overflow-hidden group"
          onMouseEnter={() => setIsPlaying(false)}
          onMouseLeave={() => { /* only resume if already playing via user action */ }}
        >
          {/* Hero image — strictly uses optimized thumb (correct size for 380px panel) */}
          <img
            key={currentImage.thumb}
            src={currentImage.thumb}
            alt={project.name}
            loading="eager"
            fetchpriority="high"
            decoding="async"
            onLoad={() => setIsMainImageLoaded(true)}
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

          {/* Header action bar: Compare · Favourite · Flag · Share · PDF · Close */}
          <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
            <button
              onClick={() => handleSaveLocal('compare')}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white border border-white/20 transition-all"
              title="Add to Comparison" aria-label="Add to comparison"
            >
              <GitCompare className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleSaveLocal('favorite')}
              className="p-2 rounded-full bg-black/40 hover:bg-rose-600/80 backdrop-blur-md text-white border border-white/20 transition-all"
              title="Add to Favourites" aria-label="Add to favourites"
            >
              <Heart className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="p-2 rounded-full bg-black/40 hover:bg-orange-600/80 backdrop-blur-md text-white border border-white/20 transition-all"
              title="Report Issue" aria-label="Report an issue with this listing"
            >
              <Flag className="w-4 h-4" />
            </button>
            <button
              onClick={handleNativeShare}
              className="p-2 rounded-full bg-black/40 hover:bg-indigo-600/80 backdrop-blur-md text-white border border-white/20 transition-all"
              title="Share Project" aria-label="Share this project"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isGeneratingPdf}
              aria-label="Download PDF brochure"
              title="Download Brochure PDF"
              className={`p-2 rounded-full backdrop-blur-md border border-white/20 transition-all text-white ${isGeneratingPdf ? 'bg-blue-600/80 cursor-wait' : 'bg-blue-600/80 hover:bg-blue-700/90'}`}
            >
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
            <div className="w-px h-4 bg-white/20 mx-0.5" />
            <button
              onClick={onClose}
              aria-label="Close property details"
              className="p-2 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white border border-white/20 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

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

          {/* Thumbnail strip — gated on isMainImageLoaded to enforce waterfall loading */}
          {hasMultipleImages && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pt-6 pb-2 px-2 flex gap-2 overflow-x-auto hide-scrollbar">
              {isMainImageLoaded
                ? gallery.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); handleThumbClick(idx); }}
                    aria-label={`View image ${idx + 1}`}
                    className={`shrink-0 w-14 h-10 rounded-lg overflow-hidden border-2 transition-all ${activeIdx === idx ? 'border-white scale-105 shadow-lg' : 'border-white/40 opacity-70 hover:opacity-100 hover:border-white'
                      }`}
                  >
                    <img src={img.thumb} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </button>
                ))
                : Array(Math.min(gallery.length, 6)).fill(0).map((_, i) => (
                  // Skeleton placeholders — zero network requests, correct layout dimensions
                  <div key={i} aria-hidden="true" className="shrink-0 w-14 h-10 rounded-lg bg-white/10 animate-pulse" />
                ))
              }
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
                  <SquareIcon className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
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
              {/* Quick-action: 15-Min Drive Zone */}
              <button
                onClick={() => setActiveIsochrone({ mode: 'driving', minutes: 15 })}
                className={`mt-3 w-full py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${activeIsochrone?.mode === 'driving' && activeIsochrone?.minutes === 15
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600'
                  }`}
              >
                <Clock className="w-3.5 h-3.5" />
                15-Min Drive Zone
              </button>
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
                        <div className="sm:text-right shrink-0">
                          <AnimatedMetricPill
                            distance={amenity.distance}
                            driveTime={amenity.driveTime}
                            walkTime={amenity.walkTime}
                          />
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

            {/* 8. Custom Distance Calculator — live autocomplete + real Mapbox Directions route */}
            <div className="relative mt-8 pt-6 border-t border-slate-100 pb-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center">
                <Car className="w-4 h-4 mr-2 text-blue-600" /> Route & Drive Time
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mb-3 -mt-2">Search a destination — we'll draw the real traffic-adjusted route on the map.</p>
              <div className="relative z-50">
                <input
                  type="text"
                  placeholder="Search any place in UAE…"
                  value={customDestQuery}
                  onChange={e => fetchDestSuggestions(e.target.value)}
                  className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 pr-10 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                />
                {(isSearchingDest || isFetchingRoute) && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin pointer-events-none" />
                )}
                {destSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto custom-scrollbar z-50">
                    {destSuggestions.map((s: any) => (
                      <button
                        key={s.place_id}
                        onClick={() => handleSelectDest(s)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-colors"
                      >
                        <p className="text-xs font-bold text-slate-800 truncate">{s.structured_formatting?.main_text || s.description.split(',')[0]}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{s.description}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {customDestResult && destSuggestions.length === 0 && (
                <div className="mt-3 rounded-xl overflow-hidden border border-blue-100 shadow-sm">
                  {/* Destination label */}
                  <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-100">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-0.5">Destination</p>
                    <p className="text-xs font-bold text-slate-800 truncate">{customDestResult.name.split(',')[0]}</p>
                  </div>
                  {/* Route stats */}
                  {isFetchingRoute ? (
                    <div className="px-4 py-3 bg-white flex items-center gap-2 text-slate-400 text-xs font-bold">
                      <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      Calculating real-time traffic route…
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 divide-x divide-blue-100">
                      <div className="px-4 py-3 bg-white text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Road Distance</p>
                        <p className="text-base font-black text-slate-900">{customDestResult.roadKm > 0 ? `${customDestResult.roadKm} km` : '—'}</p>
                      </div>
                      <div className="px-4 py-3 bg-white text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Drive Time</p>
                        <p className="text-base font-black text-blue-600">{customDestResult.driveMinutes > 0 ? `${customDestResult.driveMinutes} min` : '—'}</p>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => { setCustomDestQuery(''); setCustomDestResult(null); onRouteReady?.(null); }}
                    className="w-full py-2 text-[9px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors bg-slate-50 border-t border-slate-100"
                  >
                    ✕ Clear Route
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-white border-t border-slate-100 z-10 shrink-0 space-y-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
          {/* Explore Neighborhood — zooms out to 14.5 so amenity markers become visible */}
          <button
            onClick={() => setShowNeighborhoodList(true)}
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
      {isReportModalOpen && project && (
        <ReportModal project={project} onClose={() => setIsReportModalOpen(false)} />
      )}
    </>
  );
};

export default ProjectSidebar;
