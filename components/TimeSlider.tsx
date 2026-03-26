import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Clock, TrendingUp } from 'lucide-react';

interface TimeSliderProps {
  years?: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  /** Growth data per year: { [year]: percentGrowth } */
  growthData?: Record<number, number>;
  onClose?: () => void;
  autoPlay?: boolean;
}

const DEFAULT_YEARS = [2015, 2018, 2020, 2022, 2024, 2025];
const SPEED_OPTIONS = [
  { label: '1×', ms: 4000 },
  { label: '2×', ms: 2000 },
  { label: '3×', ms: 1200 },
];

const TimeSlider: React.FC<TimeSliderProps> = ({
  years = DEFAULT_YEARS,
  selectedYear,
  onYearChange,
  growthData = {},
  onClose,
  autoPlay = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentIndex = years.indexOf(selectedYear);
  const growth = growthData[selectedYear];

  // Auto-play — speed controlled
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        onYearChange(years[(years.indexOf(selectedYear) + 1) % years.length]);
      }, SPEED_OPTIONS[speedIdx].ms);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, selectedYear, years, onYearChange, speedIdx]);

  // Animate the year change
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 400);
    return () => clearTimeout(timer);
  }, [selectedYear]);

  const handlePrev = useCallback(() => {
    const idx = Math.max(0, currentIndex - 1);
    onYearChange(years[idx]);
  }, [currentIndex, years, onYearChange]);

  const handleNext = useCallback(() => {
    const idx = Math.min(years.length - 1, currentIndex + 1);
    onYearChange(years[idx]);
  }, [currentIndex, years, onYearChange]);

  const cycleSpeed = () => setSpeedIdx(prev => (prev + 1) % SPEED_OPTIONS.length);
  const progressPercent = ((currentIndex) / (years.length - 1)) * 100;

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 overflow-hidden w-full">
      {/* Header — compact */}
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h4 className="text-white text-xs font-black tracking-tight leading-none">Timeline</h4>
            <p className="text-slate-500 text-[9px] font-bold mt-0.5">
              {years[0]}–{years[years.length - 1]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {growth !== undefined && (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black transition-all duration-300 ${
              isAnimating ? 'scale-105' : 'scale-100'
            } ${growth >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              <TrendingUp className="w-3 h-3" />
              <span>{growth >= 0 ? '+' : ''}{growth}%</span>
            </div>
          )}
          {onClose && (
            <button onClick={onClose} className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors text-xs">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Year Display + Controls — inline row */}
      <div className="px-3 py-2 flex items-center gap-2">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        >
          <SkipBack className="w-3 h-3" />
        </button>

        <div className={`text-3xl font-black text-white tracking-tight transition-all duration-400 text-center flex-1 ${
          isAnimating ? 'scale-105 text-violet-400' : 'scale-100'
        }`}>
          {selectedYear}
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === years.length - 1}
          className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        >
          <SkipForward className="w-3 h-3" />
        </button>
      </div>

      {/* Progress Track */}
      <div className="px-3 mb-2">
        <div className="relative h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
          {years.map((year, idx) => {
            const pos = (idx / (years.length - 1)) * 100;
            const isCurrent = year === selectedYear;
            const isActive = idx <= currentIndex;
            return (
              <button
                key={year}
                onClick={() => onYearChange(year)}
                className={`absolute top-1/2 -translate-y-1/2 rounded-full transition-all duration-300 ${
                  isCurrent
                    ? 'w-4 h-4 bg-white shadow-md z-10 -ml-2 ring-2 ring-violet-500/40'
                    : isActive
                    ? 'w-2 h-2 bg-violet-400 -ml-1 hover:scale-125'
                    : 'w-2 h-2 bg-slate-600 -ml-1 hover:bg-slate-500 hover:scale-125'
                }`}
                style={{ left: `${pos}%` }}
                title={String(year)}
              />
            );
          })}
        </div>
        {/* Year labels */}
        <div className="flex justify-between mt-1.5">
          {years.map((year) => (
            <button
              key={year}
              onClick={() => onYearChange(year)}
              className={`text-[9px] font-bold transition-colors ${
                year === selectedYear ? 'text-white' : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom: Play + Speed */}
      <div className="px-3 pb-3 flex items-center justify-between">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-md ${
            isPlaying
              ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
              : 'bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 shadow-violet-500/30'
          }`}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 text-white fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 text-white fill-current ml-0.5" />
          )}
        </button>

        {/* Speed control */}
        <button
          onClick={cycleSpeed}
          className="px-2 py-1 rounded-md bg-white/10 text-white text-[10px] font-black hover:bg-white/20 transition-colors"
          title="Playback speed"
        >
          Speed: {SPEED_OPTIONS[speedIdx].label}
        </button>
      </div>
    </div>
  );
};

export default TimeSlider;
