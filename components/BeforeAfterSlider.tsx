import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Layers, Calendar } from 'lucide-react';

interface BeforeAfterSliderProps {
  /** Left (before) tile URL or map style layer name */
  beforeLabel?: string;
  afterLabel?: string;
  beforeYear?: number;
  afterYear?: number;
  /** Mapbox map ref — for swipe-controlling two raster layers */
  mapRef?: React.MutableRefObject<any>;
  /** Layer IDs to control (before/after) */
  beforeLayerId?: string;
  afterLayerId?: string;
  /** Optional standalone image mode (no Mapbox) */
  beforeImage?: string;
  afterImage?: string;
  onClose?: () => void;
}

const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeLabel = 'Before',
  afterLabel = 'After',
  beforeYear = 2015,
  afterYear = 2025,
  mapRef,
  beforeLayerId,
  afterLayerId,
  beforeImage,
  afterImage,
  onClose,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Apply clip to Mapbox layers based on slider position
  useEffect(() => {
    const map = mapRef?.current?.getMap?.();
    if (!map || !beforeLayerId || !afterLayerId) return;

    const canvas = map.getCanvas();
    if (!canvas) return;

    const clipWidth = (sliderPosition / 100) * canvas.width;

    // Before layer: visible on the left side
    if (map.getLayer(beforeLayerId)) {
      map.setLayoutProperty(beforeLayerId, 'visibility', 'visible');
    }
    // After layer: visible on the right side  
    if (map.getLayer(afterLayerId)) {
      map.setLayoutProperty(afterLayerId, 'visibility', 'visible');
    }
  }, [sliderPosition, mapRef, beforeLayerId, afterLayerId]);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = () => { isDragging.current = true; };
  const handleMouseUp = () => { isDragging.current = false; };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) handleMove(e.clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  // Standalone image comparison mode
  if (beforeImage && afterImage) {
    return (
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 select-none">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-white" />
            <span className="text-white text-xs font-black uppercase tracking-widest">Before / After</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/40 transition-colors">
              ✕
            </button>
          )}
        </div>

        {/* Image Container */}
        <div
          ref={containerRef}
          className="relative w-full h-[300px] md:h-[400px] cursor-col-resize"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          onTouchStart={(e) => handleMove(e.touches[0].clientX)}
        >
          {/* After Image (behind) */}
          <img
            src={afterImage}
            alt={afterLabel}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />

          {/* Before Image (clipped) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${sliderPosition}%` }}
          >
            <img
              src={beforeImage}
              alt={beforeLabel}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ width: containerRef.current?.offsetWidth || '100%' }}
              draggable={false}
            />
          </div>

          {/* Slider Handle */}
          <div
            className="absolute top-0 bottom-0 z-20"
            style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
          >
            <div className="w-1 h-full bg-white shadow-lg shadow-black/30" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-2xl shadow-black/40 flex items-center justify-center cursor-col-resize group hover:scale-110 transition-transform">
              <ChevronLeft className="w-4 h-4 text-slate-600 -mr-1 group-hover:text-blue-600" />
              <ChevronRight className="w-4 h-4 text-slate-600 -ml-1 group-hover:text-blue-600" />
            </div>
          </div>

          {/* Year Labels */}
          <div className="absolute bottom-4 left-4 z-10 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-lg">
            <div className="text-[10px] font-black uppercase tracking-widest opacity-70">{beforeLabel}</div>
            <div className="text-lg font-black">{beforeYear}</div>
          </div>
          <div className="absolute bottom-4 right-4 z-10 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-lg">
            <div className="text-[10px] font-black uppercase tracking-widest opacity-70">{afterLabel}</div>
            <div className="text-lg font-black">{afterYear}</div>
          </div>
        </div>

        {/* Bottom Info Bar */}
        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
          <span className="text-slate-400 text-xs font-bold">
            Drag slider to compare • {afterYear - beforeYear} years of development
          </span>
          <div className="flex items-center gap-1 text-emerald-400 text-xs font-black">
            <Calendar className="w-3.5 h-3.5" />
            <span>{beforeYear} → {afterYear}</span>
          </div>
        </div>
      </div>
    );
  }

  // Map-based mode (floating overlay)
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[6000] w-[320px] md:w-[400px]">
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-white text-sm font-black">Time Comparison</h4>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                {beforeYear} vs {afterYear}
              </p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors text-xs">
              ✕
            </button>
          )}
        </div>

        {/* Slider Track */}
        <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden mb-2">
          <div
            className="absolute inset-0 bg-gradient-to-r from-amber-500 to-blue-500 rounded-full"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={sliderPosition}
            onChange={(e) => setSliderPosition(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-col-resize"
          />
        </div>

        <div className="flex justify-between text-xs font-black">
          <span className="text-amber-400">{beforeYear}</span>
          <span className="text-slate-500">{Math.round(sliderPosition)}%</span>
          <span className="text-blue-400">{afterYear}</span>
        </div>
      </div>
    </div>
  );
};

export default BeforeAfterSlider;
