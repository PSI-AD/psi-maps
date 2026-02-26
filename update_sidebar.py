import re

with open('components/ProjectSidebar.tsx', 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { getRelatedProjects, getClosestCategorizedAmenities } from '../utils/projectHelpers';",
    "import { getRelatedProjects, getClosestCategorizedAmenities } from '../utils/projectHelpers';\nimport { Swiper, SwiperSlide } from 'swiper/react';\nimport { Navigation, Pagination, A11y, FreeMode } from 'swiper/modules';\nimport 'swiper/css';\nimport 'swiper/css/navigation';\nimport 'swiper/css/pagination';\nimport 'swiper/css/free-mode';\nimport LightboxGallery from './LightboxGallery';"
)

# 2. State
content = content.replace(
    "const [activeIdx, setActiveIdx] = useState(0);\n  const [isPlaying, setIsPlaying] = useState(false); // start paused — user opts in\n  const [tick, setTick] = useState(0);\n  const [isMainImageLoaded, setIsMainImageLoaded] = useState(false);",
    "const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);"
)

# 3. `gallery` to `displayImages`
gallery_old = """  // ── Build a unified gallery: prefer optimizedGallery, fall back to images[]
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
  };"""

display_images_new = """  // ── Build a unified gallery: prefer optimizedGallery, fall back to images[]
  const displayImages = useMemo(() => {
    if (project.optimizedGallery && project.optimizedGallery.length > 0) {
      return project.optimizedGallery.map(g => g.large);
    }
    const rawUrls = (project.images && project.images.length > 0)
      ? project.images
      : [project.thumbnailUrl || ''];
    return rawUrls.filter(Boolean);
  }, [project.optimizedGallery, project.images, project.thumbnailUrl]);"""

content = content.replace(gallery_old, display_images_new)

# 4. Replace Hero Gallery with Swiper + top action bar
hero_start = '        {/* 1. Hero Gallery — single optimized thumb + tick-based slideshow engine */}'
hero_end = '          </div>\n        </div>'

hero_replacement = """        {/* Header action bar (Preserved at top of sidebar) */}
        <div className="flex items-center justify-end px-4 py-3 bg-white border-b border-slate-100 z-50 shrink-0 gap-2">
            <button onClick={() => handleSaveLocal('compare')} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-all" title="Compare"><GitCompare className="w-4 h-4" /></button>
            <button onClick={() => handleSaveLocal('favorite')} className="p-2 rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center gap-1" title="Favorite"><Heart className="w-4 h-4" /> Save</button>
            <button onClick={() => setIsReportModalOpen(true)} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-all" title="Report"><Flag className="w-4 h-4" /></button>
            <button onClick={handleNativeShare} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-all font-bold" title="Share"><Share2 className="w-4 h-4" /></button>
            <button onClick={handleExportPdf} disabled={isGeneratingPdf} className="p-2 rounded-full text-blue-600 hover:bg-blue-50 transition-all" title="PDF Brochure">
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-all font-bold">
              <X className="w-5 h-5" />
            </button>
        </div>

        {/* Inline Swipeable Gallery inside Scrollable Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
          <div className="relative group w-full bg-slate-50 border-b border-slate-200 shadow-inner">
              <Swiper
                  modules={[Navigation, Pagination, A11y, FreeMode]}
                  spaceBetween={12}
                  slidesPerView={'auto'}
                  freeMode={true}
                  grabCursor={true}
                  pagination={{ clickable: true, dynamicBullets: true }}
                  className="w-full px-6 !pb-8 pt-6" 
              >
                  {displayImages.map((img, index) => (
                      <SwiperSlide key={index} className="!w-[280px] md:!w-[340px] first:ml-0">
                          <div 
                              onClick={() => setLightboxIndex(index)}
                              className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-200 shadow-md relative cursor-zoom-in group/img"
                          >
                              <img 
                                  src={img} 
                                  alt={`${project.name} image ${index + 1}`} 
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105" 
                                  onError={(e) => e.currentTarget.src = 'https://placehold.co/600x400?text=No+Image'}
                              />
                               <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors duration-300"></div>
                          </div>
                      </SwiperSlide>
                  ))}
              </Swiper>
          </div>"""

# Extract the part before Scrollable Content. Wait, the exact match using string manipulation might fail if indentation changed slightly.
# Let's use regex to replace between hero_start and  {/* Scrollable Content */}
import re
content = re.sub(
    r'\s*\{\/\* 1\. Hero Gallery .*?(?=\s*\{\/\* Scrollable Content \*\/ \})',
    '\n' + hero_replacement + '\n',
    content,
    flags=re.DOTALL
)

# wait, we removed `<div className="flex-1 overflow-y-auto custom-scrollbar bg-white">` from the original string via logic?
# Let's just fix it up.
content = content.replace(
    "{/* Scrollable Content */}\n        <div className=\"flex-1 overflow-y-auto custom-scrollbar bg-white\">",
    ""
)

# 5. Quick Actions
qa_old = """            <div className="flex flex-col gap-2 shrink-0 pt-1">
              <button
                onClick={() => setIsInquireModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Enquire
              </button>
              <button
                onClick={() => setShowNeighborhoodList(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 text-slate-700 hover:bg-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm border border-slate-100"
              >
                <MapPin className="w-3.5 h-3.5" />
                Explore
              </button>
            </div>"""

qa_new = """            <div className="flex flex-col gap-2 shrink-0 pt-0.5">
              {/* Enquire Button - Strong Primary Style */}
              <button
                onClick={() => setIsInquireModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-full text-[11px] font-black uppercase tracking-widest transition-all shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 border border-blue-700"
              >
                <MessageSquare className="w-3.5 h-3.5 fill-white/20" />
                Enquire
              </button>
              {/* Explore Button - Strong Secondary/Outline Style */}
              <button
                onClick={() => setShowNeighborhoodList(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white text-slate-700 rounded-full text-[11px] font-black uppercase tracking-widest transition-all shadow-sm hover:shadow-md hover:bg-slate-50 hover:text-slate-900 active:scale-95 border-2 border-slate-200"
              >
                <MapPin className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
                Explore
              </button>
            </div>"""
content = content.replace(qa_old, qa_new)

# 6. Lightbox
lightbox_new = """      {lightboxIndex !== null && (
        <LightboxGallery 
          images={displayImages} 
          initialIndex={lightboxIndex} 
          onClose={() => setLightboxIndex(null)} 
        />
      )}
      {isReportModalOpen && project && ("""
content = content.replace("      {isReportModalOpen && project && (", lightbox_new)

with open('components/ProjectSidebar.tsx', 'w') as f:
    f.write(content)

