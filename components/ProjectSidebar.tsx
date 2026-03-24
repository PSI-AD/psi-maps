import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Project, Landmark } from '../types';
import { X, MapPin, BedDouble, Bath, Square as SquareIcon, Calendar, ArrowRight, ArrowUpRight, Activity, Building, LayoutTemplate, Car, Footprints, Clock, MessageSquare, Compass, ChevronLeft, ChevronRight, Play, Pause, Square, StopCircle, Share2, Heart, GitCompare, Loader2, Flag, Download, Navigation } from 'lucide-react';
import { calculateDistance } from '../utils/geo';
import TextModal from './TextModal';
import InquireModal from './InquireModal';
import ReportModal from './ReportModal';
// @react-pdf/renderer is lazy-loaded in handleExportPdf() to save ~500KB from initial bundle
import { getRelatedProjects, getClosestCategorizedAmenities } from '../utils/projectHelpers';

import LightboxGallery from './LightboxGallery';
import { useFavoritesContext } from '../hooks/useFavorites';
import { recordProjectView } from '../utils/smartCache';

const DEV_DOMAINS: Record<string, string> = {
  'emaar': 'emaar.com',
  'aldar': 'aldar.com',
  'damac': 'damacproperties.com',
  'nakheel': 'nakheel.com',
  'sobha': 'sobharealty.com',
  'meraas': 'meraas.com',
  'tiger': 'tigergroup.net',
  'binghatti': 'binghatti.com',
  'danube': 'danubeproperties.ae',
  'imkan': 'imkan.ae',
  'reportage': 'reportageuae.com',
  'ellington': 'ellingtonproperties.ae',
  'bloom': 'bloomholding.com',
  'azizi': 'azizidevelopments.com',
};

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
  onRouteReady?: (routeInfo: { geometry: any; startName: string; startLng: number; startLat: number; destName: string; destLng: number; destLat: number } | null) => void;
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

const RotatingMetric = ({ distance, walk, drive }: { distance: string, walk: string, drive: string }) => {
  const [idx, setIdx] = useState(0);
  useEffect(() => { const int = setInterval(() => setIdx(i => (i + 1) % 3), 3000); return () => clearInterval(int); }, []);
  const metrics = [
    { label: 'DISTANCE', val: distance, icon: <MapPin className="w-3 h-3" />, color: 'text-blue-600' },
    { label: 'DRIVE', val: drive, icon: <Car className="w-3 h-3" />, color: 'text-emerald-600' },
    { label: 'WALK', val: walk, icon: <Footprints className="w-3 h-3" />, color: 'text-amber-600' }
  ];
  const m = metrics[idx];
  return (
    <div key={idx} className={`flex flex-col items-center justify-center w-16 h-12 bg-slate-50 rounded-lg animate-in fade-in slide-in-from-bottom-2 duration-300 ${m.color} shrink-0`}>
      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{m.label}</span>
      <div className="flex items-center gap-1 font-bold text-xs">
        {m.icon} <span>{m.val}</span>
      </div>
    </div>
  );
}



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
  const favCtx = useFavoritesContext();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const touchStartX = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
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
    const existing: string[] = JSON.parse(localStorage.getItem(key) || '[]');
    if (!existing.includes(project.id)) {
      localStorage.setItem(key, JSON.stringify([...existing, project.id]));
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
      } catch { /* Map snapshot unavailable */ }

      // 2. Lazy-load PDF renderer (~500KB) — only when user actually exports
      const [{ pdf }, { default: ProjectPdfDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./pdf/ProjectPdfDocument'),
      ]);

      // 3. Gather data
      const related = getRelatedProjects(project, allProjects);
      const categorizedAmenities = getClosestCategorizedAmenities(project, nearbyLandmarks);

      // 4. Generate PDF blob
      const blob = await pdf(
        <ProjectPdfDocument
          project={project}
          mapSnapshotUrl={snapshotUrl}
          categorizedAmenities={categorizedAmenities as any}
          related={related as any}
        />
      ).toBlob();

      // 5. Trigger download
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
  const neighborhoodScrollRef = useRef<HTMLDivElement>(null);

  // Notify AI chat when neighborhood tour state changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('neighborhood-tour-changed', { detail: { active: isTouringNeighborhood } }));
  }, [isTouringNeighborhood]);
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

  // Listen for AI chat requesting a neighborhood/landmark tour
  useEffect(() => {
    const handler = () => {
      // Open the neighborhood panel
      setShowNeighborhoodList(true);
      // Start the tour — same logic as clicking "Start Tour" button
      setIsTouringNeighborhood(true);
      setActiveTourAmenityIdx(0);
      // Fly to the first amenity
      if (project && localAmenities.length > 0) {
        const first = localAmenities[0];
        window.dispatchEvent(new CustomEvent('tour-fly-bounds', {
          detail: {
            pLng: project.longitude, pLat: project.latitude,
            aLng: first.longitude, aLat: first.latitude,
            amenityId: first.id,
          },
        }));
      }
    };

    // Listen for pause from the top bar Play/Pause button
    const handlePause = () => {
      setIsTouringNeighborhood(false);
      setActiveTourAmenityIdx(null);
    };

    window.addEventListener('ai-open-neighborhood-tour', handler);
    window.addEventListener('global-tour-pause', handlePause);
    return () => {
      window.removeEventListener('ai-open-neighborhood-tour', handler);
      window.removeEventListener('global-tour-pause', handlePause);
    };
  }, [project, localAmenities]);

  // ── Filter localAmenities by live search query ───────────────────────────
  const searchedAmenities = useMemo(() => {
    if (!amenitySearch.trim()) return localAmenities;
    const raw = amenitySearch.toLowerCase().trim();
    // Basic stemming: try the raw query, plus singular/plural variations
    const variations = [raw];
    if (raw.endsWith('ies')) variations.push(raw.slice(0, -3) + 'y'); // "cities" → "city"
    else if (raw.endsWith('es')) variations.push(raw.slice(0, -2)); // "beaches" → "beach"
    else if (raw.endsWith('s')) variations.push(raw.slice(0, -1)); // "hotels" → "hotel"
    // Also try adding 's' for when user types singular
    if (!raw.endsWith('s')) variations.push(raw + 's');
    if (raw.endsWith('y')) variations.push(raw.slice(0, -1) + 'ies');

    return localAmenities.filter(a => {
      const name = a.name.toLowerCase();
      const cat = a.category?.toLowerCase() || '';
      return variations.some(q => name.includes(q) || cat.includes(q));
    });
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

  // ---- Custom Distance Calculator: Mapbox Search Box API v1 (POI + places) ----
  const destSessionRef = useRef<string>(crypto.randomUUID());

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
    destSearchRef.current = setTimeout(async () => {
      try {
        const encoded = encodeURIComponent(query.trim());
        const proximity = `${Number(project.longitude)},${Number(project.latitude)}`;
        const bbox = '51.5,22.5,56.5,26.5';
        const url = `https://api.mapbox.com/search/searchbox/v1/suggest`
          + `?q=${encoded}`
          + `&access_token=${PUBLIC_MAPBOX_TOKEN}`
          + `&session_token=${destSessionRef.current}`
          + `&country=AE`
          + `&bbox=${bbox}`
          + `&proximity=${proximity}`
          + `&types=poi,place,neighborhood,locality,address`
          + `&language=en`
          + `&limit=5`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.suggestions?.length) {
          setDestSuggestions(data.suggestions.map((s: any) => ({
            mapbox_id: s.mapbox_id,
            description: s.name + (s.full_address ? ', ' + s.full_address : (s.place_formatted || '')),
            text: s.name,
          })));
        } else {
          setDestSuggestions([]);
        }
      } catch (err) {
        console.error('Mapbox Search Box error:', err);
        setDestSuggestions([]);
      }
      setIsSearchingDest(false);
    }, 200);
  };

  // ---- Fetch real driving route via Mapbox Directions (traffic profile) ----
  const fetchRealRoute = async (destLng: number, destLat: number, destName: string): Promise<void> => {
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
        setCustomDestResult(prev => prev ? { ...prev, roadKm, driveMinutes } : { name: destName, roadKm, driveMinutes });
        onRouteReady?.({
          geometry,
          startName: project.name,
          startLng,
          startLat,
          destName,
          destLng,
          destLat,
        });
      }
    } catch (err) {
      console.error('Directions API error:', err);
    }
    setIsFetchingRoute(false);
  };

  const handleSelectDest = async (prediction: any) => {
    const label = prediction.description;
    setCustomDestResult({ name: label, roadKm: 0, driveMinutes: 0 });
    setCustomDestQuery('');
    setDestSuggestions([]);
    try {
      // Retrieve coordinates from Search Box API
      const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${prediction.mapbox_id}`
        + `?access_token=${PUBLIC_MAPBOX_TOKEN}`
        + `&session_token=${destSessionRef.current}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.features?.[0]?.geometry?.coordinates) {
        const [lng, lat] = data.features[0].geometry.coordinates;
        await fetchRealRoute(lng, lat, label);
      }
      destSessionRef.current = crypto.randomUUID();
    } catch (err) {
      console.error('Mapbox retrieve error:', err);
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

  // Record view in smart cache for "recently viewed" history
  useEffect(() => {
    recordProjectView({
      id: project.id,
      name: project.name,
      thumbnailUrl: project.thumbnailUrl,
      community: project.community,
      city: project.city,
    }).catch(() => { });
  }, [project.id, project.name, project.thumbnailUrl, project.community, project.city]);

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

  // Auto-format plain-text descriptions into readable paragraphs
  const formatDescription = (html: string): string => {
    // If it already has paragraph tags, return as-is
    if (html.includes('<p>') || html.includes('<br')) return html;

    // Strip tags, then work with plain text
    let text = html.replace(/<[^>]*>/g, '').trim();
    if (!text) return '';

    // ── Step 1: Split pipe-separated items into line breaks ──
    // e.g. "✅ One | ✅ Two | ✅ Three" → separate lines
    text = text.replace(/\s*\|\s*/g, '\n');

    // ── Step 2: Insert line break before emoji-style section markers ──
    // Common emoji markers used as bullet points / section headers
    const emojiPattern = /([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{2705}\u{2714}\u{2716}\u{274C}\u{274E}\u{2B50}\u{2B55}\u{1F680}-\u{1F6FF}✅✨🌟📍🏡🏗️🏢🏊💎🎯🏆🌴🌊🛎️🏖️🎉🔑💰🏠🏘️🪴🔱💫🌆🏙️✔️❌])/gu;
    text = text.replace(new RegExp(`(?<!^)(?=${emojiPattern.source})`, 'gmu'), '\n');

    // ── Step 3: Insert line break before common section keywords ──
    const sectionKeywords = [
      'Welcome to', 'Key Features', 'Unique Selling', 'Strategic Location',
      'Exceptional Amenities', 'Amenities', 'Features', 'Highlights',
      'Why Invest', 'Why Choose', 'Investment Opportunity', 'About the',
      'About The', 'Project Overview', 'Location', 'Payment Plan',
      'Facilities', 'Lifestyle', 'Community', 'Connectivity',
      'Floor Plans', 'Unit Types', 'Starting Price', 'Price Range',
    ];
    for (const keyword of sectionKeywords) {
      const re = new RegExp(`(?<=[.!?\\n])\\s*(?=${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
      text = text.replace(re, '\n\n');
    }

    // ── Step 4: Split into blocks ──
    let blocks = text.split(/\n+/).map(b => b.trim()).filter(Boolean);

    // If we still have just 1 giant block, split every 2-3 sentences
    if (blocks.length <= 1 && text.length > 200) {
      const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
      blocks = [];
      for (let i = 0; i < sentences.length; i += 2) {
        blocks.push(sentences.slice(i, i + 2).join(' '));
      }
    }

    // ── Step 5: Format each block ──
    return blocks.map(block => {
      // If a block starts with an emoji + short text (likely a header)
      const isHeader = /^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}✅✨🌟📍💎🎯🏆🔑💰🏡🏗️🏢🏊🌴🌊🛎️🏖️🎉🏠🏘️💫🌆🏙️✔️❌][^\n.!?]{0,60}$/u.test(block);
      if (isHeader) {
        return `<p style="margin-top:16px;margin-bottom:4px"><strong>${block}</strong></p>`;
      }
      // Check marks / bullets become list items
      const isBullet = /^[✅✔️☑️•▪▸►✓→–—]\s/.test(block);
      if (isBullet) {
        return `<p style="padding-left:8px;margin-bottom:4px">${block}</p>`;
      }
      return `<p style="margin-bottom:12px">${block}</p>`;
    }).join('');
  };
  const formattedDescription = formatDescription(rawDescription);

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

  // ── 3 nearest projects in the same community ("Projects Around") ──────
  const projectsAround = useMemo(() => {
    if (!project.latitude || !project.longitude || !project.community) return [];
    const pLat = Number(project.latitude);
    const pLng = Number(project.longitude);
    return allProjects
      .filter(p => p.id !== project.id && p.latitude && p.longitude
        && p.community?.toLowerCase() === project.community!.toLowerCase())
      .map(p => ({
        ...p,
        _dist: calculateDistance(pLat, pLng, Number(p.latitude), Number(p.longitude)),
      }))
      .sort((a, b) => a._dist - b._dist)
      .slice(0, 3);
  }, [project.id, project.latitude, project.longitude, project.community, allProjects]);

  // ── 3 nearest projects by the same developer ("More by [Dev]") ────────
  const developerProjects = useMemo(() => {
    if (!project.latitude || !project.longitude || !project.developerName) return [];
    const devName = project.developerName;
    if (!devName || devName === 'Unknown' || devName === 'Exclusive') return [];
    const pLat = Number(project.latitude);
    const pLng = Number(project.longitude);
    return allProjects
      .filter(p => p.id !== project.id && p.latitude && p.longitude
        && (p as any).developerName === devName)
      .map(p => ({
        ...p,
        _dist: calculateDistance(pLat, pLng, Number(p.latitude), Number(p.longitude)),
      }))
      .sort((a, b) => a._dist - b._dist)
      .slice(0, 3);
  }, [project.id, project.latitude, project.longitude, project.developerName, allProjects]);
  // ── Scroll neighborhood panel to top whenever it opens ────────────────────
  useEffect(() => {
    if (showNeighborhoodList) {
      // Use rAF to ensure the DOM has been painted after the early-return swap
      requestAnimationFrame(() => {
        if (neighborhoodScrollRef.current) {
          neighborhoodScrollRef.current.scrollTop = 0;
        }
      });
    }
  }, [showNeighborhoodList]);

  // ── Neighborhood Tour view — early return when active ────────────────────
  if (showNeighborhoodList) {
    const stopTour = () => {
      setIsTouringNeighborhood(false);
      setActiveTourAmenityIdx(null);
    };
    return (
      <div className="flex flex-col h-full bg-white relative">

        {/* Sticky header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-20 shadow-sm" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
          <button
            onClick={() => { setShowNeighborhoodList(false); stopTour(); }}
            className="flex items-center gap-1 md:gap-2 text-slate-500 hover:text-slate-800 transition-colors shrink min-w-0 pr-2"
          >
            <ChevronLeft className="w-5 h-5 shrink-0" />
            <span className="font-bold text-sm truncate">Back to Project</span>
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
            className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${isTouringNeighborhood
              ? 'bg-red-100 text-red-600 hover:bg-red-200'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
              }`}
          >
            {isTouringNeighborhood
              ? <><Square className="w-4 h-4 fill-current shrink-0" /> <span className="truncate">Stop Tour</span></>
              : <><Play className="w-4 h-4 fill-current shrink-0" /> <span className="truncate">Start Tour</span></>
            }
          </button>
        </div>

        {/* Amenity list */}
        <div ref={neighborhoodScrollRef} className="p-4 flex-1 overflow-y-auto">
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
                    <div className="flex justify-between items-center gap-3 w-full">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 relative overflow-hidden ${style.bg} ${style.text}`}>
                          <div className={`w-3 h-3 rounded-full ${style.dot}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 text-sm leading-snug truncate">{amenity.name}</h4>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${style.bg} ${style.text}`}>
                            {style.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <RotatingMetric
                          distance={`${amenity.distance.toFixed(1)} km`}
                          drive={`${Math.ceil((amenity.distance / 40) * 60) + 2} m`}
                          walk={`${Math.ceil((amenity.distance / 5) * 60)} m`}
                        />
                        {isActive && (
                          <span className="block text-center text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1">● Live</span>
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
                    onClick={(e) => { e.stopPropagation(); setVisibleAmenitiesCount(searchedAmenities.length); }}
                    className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-2"
                  >
                    View all amenities ({searchedAmenities.length - visibleAmenitiesCount} remaining)
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
          className="relative h-64 w-full shrink-0 skeleton overflow-hidden group"
          onMouseEnter={() => setIsPlaying(false)}
          onMouseLeave={() => { /* only resume if already playing via user action */ }}
        >
          {/* Header action bar: Compare · Favourite · Flag · Share · PDF · Close
              z-50 keeps buttons above thumbnails (z-40) and hero image (z-0). */}
          <div className="absolute top-0 right-0 flex flex-wrap justify-end items-center gap-1 z-50 pointer-events-auto max-w-[70%] md:max-w-none p-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
            <button
              onClick={() => handleSaveLocal('compare')}
              className="pointer-events-auto p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white border border-white/20 transition-all"
              title="Add to Comparison" aria-label="Add to comparison"
            >
              <GitCompare className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleSaveLocal('favorite')}
              className="pointer-events-auto p-2 rounded-full bg-black/40 hover:bg-rose-600/80 backdrop-blur-md text-white border border-white/20 transition-all"
              title="Add to Favourites" aria-label="Add to favourites"
            >
              <Heart className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="pointer-events-auto p-2 rounded-full bg-black/40 hover:bg-orange-600/80 backdrop-blur-md text-white border border-white/20 transition-all"
              title="Report Issue" aria-label="Report an issue with this listing"
            >
              <Flag className="w-4 h-4" />
            </button>
            <button
              onClick={handleNativeShare}
              className="pointer-events-auto p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white border border-white/20 transition-all"
              title="Share" aria-label="Share listing"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isGeneratingPdf}
              className="pointer-events-auto p-2 rounded-full bg-blue-600/80 hover:bg-blue-600 backdrop-blur-md text-white border border-blue-500/50 transition-all"
              title="Download PDF Brochure" aria-label="Download PDF Brochure"
            >
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="pointer-events-auto p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white border border-white/20 transition-all ml-1"
              title="Close" aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Hero image — skeleton shimmer underneath, fades in when loaded */}
          <img
            key={currentImage?.thumb || 'fallback'}
            src={currentImage?.thumb || '/placeholder-image.png'}
            alt={project.name}
            loading="eager"
            fetchpriority="high"
            decoding="async"
            onLoad={() => setIsMainImageLoaded(true)}
            onClick={(e) => { e.stopPropagation(); setGalleryIndex(activeIdx); }}
            className={`absolute inset-0 w-full h-full object-cover cursor-zoom-in transition-opacity duration-300 z-0 pointer-events-auto ${isMainImageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onError={(e) => { e.currentTarget.src = '/placeholder-image.png'; }}
          />

          {/* Play/Pause button with circular SVG progress ring */}
          {hasMultipleImages && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsPlaying(p => !p); }}
              aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
              className="absolute top-4 left-4 bg-black/40 hover:bg-black/70 backdrop-blur-md text-white rounded-full transition-all border border-white/20 z-50 pointer-events-auto flex items-center justify-center w-9 h-9"
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

          {/* Prev / Next arrows — visible on hover */}
          {hasMultipleImages && (
            <>
              <button
                onClick={handlePrevImage}
                aria-label="Previous image"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-50 pointer-events-auto p-2 bg-black/40 hover:bg-black/70 backdrop-blur-md text-white rounded-full border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextImage}
                aria-label="Next image"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-50 pointer-events-auto p-2 bg-black/40 hover:bg-black/70 backdrop-blur-md text-white rounded-full border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Thumbnail strip — gated on isMainImageLoaded to enforce waterfall loading */}
          {hasMultipleImages && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pt-6 pb-2 px-2 flex gap-2 overflow-x-auto hide-scrollbar z-40 pointer-events-auto">
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
                  <div key={i} aria-hidden="true" className="shrink-0 w-14 h-10 rounded-lg skeleton" />
                ))
              }
            </div>
          )}

        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">

          {/* 2. Name → Location → Developer */}
          <div className="sticky top-0 z-20 bg-white px-6 pt-6 pb-5 border-b border-slate-100 shadow-sm" style={{ paddingTop: 'max(env(safe-area-inset-top), 24px)' }}>

            {/* 1. Project Name + Heart */}
            <div className="flex items-start gap-2">
              <h1 className="text-[26px] font-black text-slate-900 leading-tight mb-1.5 truncate flex-1">
                {project.name}
              </h1>
              <button
                onClick={() => favCtx.toggleFavorite(project.id)}
                className={`shrink-0 mt-1 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${favCtx.isFavorite(project.id)
                  ? 'bg-rose-100 text-rose-500 shadow-sm'
                  : 'bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-400'
                  }`}
                title={favCtx.isFavorite(project.id) ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={`w-4 h-4 ${favCtx.isFavorite(project.id) ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* 2. Location */}
            <div className="flex items-center text-slate-500 text-sm font-semibold mb-2 truncate">
              <MapPin className="w-4 h-4 mr-1.5 text-blue-600 shrink-0" />
              <button onClick={() => onQuickFilter && project.community ? onQuickFilter('community', project.community) : undefined} className="hover:text-blue-800 hover:underline transition-all text-left truncate">
                {project.community}
              </button>
              {project.city && (
                <>
                  <span className="mx-2 text-slate-300 font-normal">/</span>
                  <button onClick={() => setSelectedCity?.(project.city || '')} className="text-slate-600 hover:text-blue-800 hover:underline transition-all text-left truncate">
                    {project.city}
                  </button>
                </>
              )}
            </div>

            {/* 3. Developer */}
            <p className="text-base font-extrabold text-blue-600 truncate">
              <button onClick={() => onQuickFilter && project.developerName ? onQuickFilter('developer', project.developerName) : undefined} className="hover:text-blue-800 hover:underline transition-all text-left truncate">
                {project.developerName || 'Exclusive Developer'}
              </button>
            </p>

          </div>

          <div className="px-6 py-6 space-y-8">

            {/* 3. Data Grid — hides any field with 0, null, N/A, or empty values */}
            {(() => {
              /** Universal guard: returns true if a value is meaningless */
              const isEmpty = (v: any): boolean => {
                if (v === null || v === undefined || v === '') return true;
                const s = String(v).trim().toLowerCase();
                return ['0', 'n/a', 'na', 'null', 'undefined', '-', '—', 'none'].includes(s) || (typeof v === 'number' && (isNaN(v) || v === 0)) || Number(s) === 0;
              };
              return (
                <div className="grid grid-cols-2 gap-3">
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
                  {!isEmpty(project.type) && project.type!.toLowerCase() !== 'apartment' && (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3">
                      <LayoutTemplate className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Type</p>
                        <p className="font-bold text-slate-800 text-sm capitalize">{project.type}</p>
                      </div>
                    </div>
                  )}
                  {!isEmpty(project.bedrooms) && (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3">
                      <BedDouble className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Beds</p>
                        <p className="font-bold text-slate-800 text-sm">{project.bedrooms}</p>
                      </div>
                    </div>
                  )}
                  {!isEmpty(project.bathrooms) && (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3">
                      <Bath className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Baths</p>
                        <p className="font-bold text-slate-800 text-sm">{project.bathrooms}</p>
                      </div>
                    </div>
                  )}
                  {!isEmpty(project.completionDate) && (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Completion</p>
                        <p className="font-bold text-slate-800 text-sm">{formatCompletionDate(project.completionDate)}</p>
                      </div>
                    </div>
                  )}
                  {!isEmpty(project.builtupArea) && (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3">
                      <SquareIcon className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">BUA</p>
                        <p className="font-bold text-slate-800 text-sm">{Number(project.builtupArea).toLocaleString()} sqft</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── SECTION 1: Nearby Amenities (Top 5 list) ── */}
            {nearbyAmenities.length > 0 && (
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center">
                  <Compass className="w-4 h-4 mr-2 text-blue-600" />Nearby Amenities
                </h3>
                <div className="space-y-3 mb-4">
                  {nearbyAmenities.map((amenity) => {
                    const style = categoryStyle[amenity.category.toLowerCase()] || defaultStyle;
                    return (
                      <div key={amenity.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm gap-2">
                        <div className="flex flex-1 min-w-0 items-center gap-3 pr-2">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 relative overflow-hidden ${style.bg} ${style.text}`}>
                            <div className={`w-3 h-3 rounded-full ${style.dot}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-slate-800 truncate">{amenity.name}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{style.label}</p>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <RotatingMetric
                            distance={`${amenity.distance.toFixed(1)} km`}
                            drive={`${amenity.driveTime} m`}
                            walk={`${amenity.walkTime} m`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* View All Amenities button */}
            <button
              onClick={() => setShowNearbyPanel(true)}
              className="w-full mt-4 mb-2 py-3 bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-blue-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              View All Amenities
            </button>

            {/* ── SECTION 3: Route & Drive Time (Enhanced) ── */}
            <div className="relative mt-8 pt-0 pb-4">
              {/* Attention-grabbing banner */}
              <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-4 mb-4 relative overflow-hidden">
                {/* Animated road illustration */}
                <div className="absolute inset-0 opacity-[0.08]">
                  <div className="absolute bottom-0 left-0 right-0 h-3 bg-white/40" />
                  <div className="absolute bottom-[5px] left-[10%] right-[10%] h-[2px] bg-white/60" style={{ backgroundImage: 'repeating-linear-gradient(90deg, white 0px, white 12px, transparent 12px, transparent 24px)' }} />
                </div>
                {/* Animated car */}
                <div className="absolute bottom-2 animate-[routeCar_4s_ease-in-out_infinite] opacity-20">
                  <Car className="w-5 h-5 text-white transform -scale-x-100" />
                </div>
                <style>{`@keyframes routeCar { 0% { left: -5%; } 50% { left: 95%; } 100% { left: -5%; } }`}</style>
                <div className="relative z-10 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 mt-0.5">
                    <Navigation className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-white tracking-wide">Route & Drive Time</h3>
                    <p className="text-[11px] text-blue-200 font-medium mt-0.5 leading-snug">Search any destination — see the real traffic-adjusted route drawn on the map.</p>
                  </div>
                </div>
              </div>
              {/* Search input */}
              <div className="relative z-10">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Where would you like to go?"
                  value={customDestQuery}
                  onChange={e => fetchDestSuggestions(e.target.value)}
                  className="w-full h-12 bg-slate-50 border-2 border-slate-200 rounded-xl pl-10 pr-10 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                />
                {(isSearchingDest || isFetchingRoute) && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin pointer-events-none" />
                )}
                {destSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto custom-scrollbar z-50">
                    {destSuggestions.map((s: any, idx: number) => (
                      <button
                        key={s.mapbox_id || idx}
                        onClick={() => handleSelectDest(s)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-colors"
                      >
                        <p className="text-xs font-bold text-slate-800 truncate">{s.text || s.description?.split(',')[0]}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{s.description}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {customDestResult && destSuggestions.length === 0 && (
                <div className="mt-3 rounded-xl overflow-hidden border border-blue-100 shadow-sm">
                  <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-100">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-0.5">Destination</p>
                    <p className="text-xs font-bold text-slate-800 truncate">{customDestResult.name.split(',')[0]}</p>
                  </div>
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

            {/* ── Street View & Google Maps — HIDDEN until UX is improved ── */}
            {/* These buttons previously opened new browser tabs with often-empty desert views.
                They will be re-enabled once in-app Street View overlay is implemented.
            {project.latitude && project.longitude && !isNaN(Number(project.latitude)) && !isNaN(Number(project.longitude)) && (
              <div className="flex gap-2">
                <a href="..." target="_blank">Street View</a>
                <a href="..." target="_blank">Google Maps</a>
              </div>
            )}
            */}

            <div id="sidebar-map-section" />

            {/* ── SECTION 3: About the Project ── */}
            {rawDescription && (
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center">
                  <Activity className="w-4 h-4 mr-2 text-blue-600" />About The Project
                </h3>
                <div className="prose prose-sm text-slate-600 leading-relaxed max-w-none prose-p:mb-3 prose-strong:text-slate-900 line-clamp-4" dangerouslySetInnerHTML={{ __html: formattedDescription }} />
                {plainText.length > 120 && (
                  <button onClick={() => setIsTextModalOpen(true)} className="mt-2 text-blue-600 hover:text-blue-800 text-xs font-black uppercase tracking-widest transition-colors">
                    Read More →
                  </button>
                )}
              </div>
            )}

            {/* ── SECTION 4: Lifestyle Amenities ── */}
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

            {/* ── SECTION 5: Commute & Drive-Time Isochrone ── */}
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
          </div>

          {/* ── Projects Around (3 nearest in same community) ─────────────── */}
          {projectsAround.length > 0 && (
            <div className="px-6 pb-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center">
                <Compass className="w-4 h-4 mr-2 text-blue-600" />Projects Around
              </h3>
              <div className="space-y-2">
                {projectsAround.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (p.latitude && p.longitude) {
                        onFlyTo(Number(p.longitude), Number(p.latitude), 16);
                        // Dispatch a lightweight project-select so the sidebar updates
                        window.dispatchEvent(new CustomEvent('sidebar-select-project', { detail: { projectId: p.id } }));
                      }
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/50 transition-all group text-left"
                  >
                    <img
                      src={p.thumbnailUrl || '/placeholder-image.png'}
                      alt={p.name}
                      className="w-12 h-12 rounded-lg object-cover shrink-0 bg-slate-100"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-image.png'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-700 transition-colors">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold truncate">{(p as any).developerName || 'Developer'} · {p._dist.toFixed(1)} km</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── More by Developer (3 nearest by same developer) ──────────── */}
          {developerProjects.length > 0 && (
            <div className="px-6 pb-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center">
                <Building className="w-4 h-4 mr-2 text-violet-600" />More by {project.developerName}
              </h3>
              <div className="space-y-2">
                {developerProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (p.latitude && p.longitude) {
                        onFlyTo(Number(p.longitude), Number(p.latitude), 16);
                        window.dispatchEvent(new CustomEvent('sidebar-select-project', { detail: { projectId: p.id } }));
                      }
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 bg-white hover:border-violet-200 hover:bg-violet-50/50 transition-all group text-left"
                  >
                    <img
                      src={p.thumbnailUrl || '/placeholder-image.png'}
                      alt={p.name}
                      className="w-12 h-12 rounded-lg object-cover shrink-0 bg-slate-100"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-image.png'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate group-hover:text-violet-700 transition-colors">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold truncate">{p.community || p.city || 'UAE'} · {p._dist.toFixed(1)} km</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CTA Buttons — full width, large, inline (NOT sticky) */}
          <div className="px-6 pb-4 pt-4 space-y-3">
            <button onClick={() => setShowNeighborhoodList(true)} disabled={isDiscovering} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all hover:shadow-xl hover:shadow-blue-200 active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-3">
              <MapPin className="w-4 h-4" />
              <span>Explore Neighborhood</span>
            </button>
            <button onClick={() => setIsInquireModalOpen(true)} className="flex items-center justify-center w-full py-4 border border-blue-200 hover:border-blue-600 text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all gap-2 group">
              <MessageSquare className="w-4 h-4" />
              <span>Inquire Now</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Safety padding — ensures buttons are never cut off by mobile browser chrome */}
          <div className="px-6 pb-8 pt-2">
            <p className="text-[10px] text-slate-300 text-center font-medium">
              PSI Interactive Map · {project.community || 'UAE'}
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isTextModalOpen && (<TextModal text={formattedDescription} onClose={() => setIsTextModalOpen(false)} />)}
      {isInquireModalOpen && (
        <InquireModal projectName={project.name} community={project.community} developer={project.developerName} onClose={() => setIsInquireModalOpen(false)} />
      )}
      {lightboxIndex !== null && (
        <LightboxGallery
          images={gallery.map((g: any) => g.large)}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
      {isReportModalOpen && project && (
        <ReportModal project={project} onClose={() => setIsReportModalOpen(false)} />
      )}


      {/* Fullscreen Interactive Gallery Overlay */}
      {galleryIndex !== null && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[999999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-200"
          onClick={() => setGalleryIndex(null)}
        >
          {/* Top Toolbar */}
          <div className="absolute top-6 right-6 z-50 flex items-center gap-4">
            <span className="text-white text-sm font-bold bg-black/50 px-3 py-1 rounded-full">
              {galleryIndex + 1} / {gallery.length}
            </span>
            <button onClick={() => setGalleryIndex(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Image & Touch Swipe Area */}
          <div
            className="relative w-full h-full flex items-center justify-center p-4 md:p-12"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => touchStartX.current = e.touches[0].clientX}
            onTouchEnd={(e) => {
              const touchEndX = e.changedTouches[0].clientX;
              const diff = touchStartX.current - touchEndX;
              if (diff > 50) setGalleryIndex((prev) => (prev! + 1) % gallery.length);
              if (diff < -50) setGalleryIndex((prev) => (prev! - 1 + gallery.length) % gallery.length);
            }}
          >
            <img
              src={gallery[galleryIndex].large}
              alt="Fullscreen View"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />

            {/* Desktop Navigation Arrows */}
            {gallery.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setGalleryIndex((prev) => (prev! - 1 + gallery.length) % gallery.length); }}
                  className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 p-4 bg-black/50 hover:bg-black/80 rounded-full text-white transition-all hidden md:block"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setGalleryIndex((prev) => (prev! + 1) % gallery.length); }}
                  className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 p-4 bg-black/50 hover:bg-black/80 rounded-full text-white transition-all hidden md:block"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}
          </div>

          {/* Mobile Swipe Hint */}
          <div className="absolute bottom-8 left-0 w-full text-center text-white/50 text-xs md:hidden pointer-events-none">
            Swipe left or right to view more
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ProjectSidebar;
