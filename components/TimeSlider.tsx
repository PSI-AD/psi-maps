import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Clock, TrendingUp, Calendar } from 'lucide-react';

interface TimeSliderProps {
  years?: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  /** Growth data per year: { [year]: percentGrowth } */
  growthData?: Record<number, number>;
  onClose?: () => void;
  /** Auto-play through years */
  autoPlay?: boolean;
}

const DEFAULT_YEARS = [2015, 2018, 2020, 2022, 2024, 2025];

const TimeSlider: React.FC<TimeSliderProps> = ({
  years = DEFAULT_YEARS,
  selectedYear,
  onYearChange,
  growthData = {},
  onClose,
  autoPlay = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isAnimating, setIsAnimating] = useState(false);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentIndex = years.indexOf(selectedYear);
  const growth = growthData[selectedYear];

  // Auto-play: advance every 2.5s
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        onYearChange(years[(years.indexOf(selectedYear) + 1) % years.length]);
      }, 2500);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, selectedYear, years, onYearChange]);

  // Animation trigger on year change
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [selectedYear]);

  const handlePrev = () => {
    const idx = Math.max(0, currentIndex - 1);
    onYearChange(years[idx]);
  };

  const handleNext = () => {
    const idx = Math.min(years.length - 1, currentIndex + 1);
    onYearChange(years[idx]);
  };

  const progressPercent = ((currentIndex) / (years.length - 1)) * 100;

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="text-white text-sm font-black tracking-tight">Timeline</h4>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              {years[0]} — {years[years.length - 1]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {growth !== undefined && (
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all duration-300 ${
              isAnimating ? 'scale-110' : 'scale-100'
            } ${growth >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{growth >= 0 ? '+' : ''}{growth}%</span>
            </div>
          )}
          {onClose && (
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors text-xs font-bold">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Current Year Display */}
      <div className="px-4 py-3 flex items-center justify-center">
        <div className={`text-5xl font-black text-white tracking-tight transition-all duration-500 ${
          isAnimating ? 'scale-110 text-violet-400' : 'scale-100'
        }`}>
          {selectedYear}
        </div>
      </div>

      {/* Progress Track */}
      <div className="px-4 mb-3">
        <div className="relative h-2 bg-slate-700/60 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Year dots */}
          {years.map((year, idx) => {
            const pos = (idx / (years.length - 1)) * 100;
            const isActive = idx <= currentIndex;
            const isCurrent = year === selectedYear;
            return (
              <button
                key={year}
                onClick={() => onYearChange(year)}
                className={`absolute top-1/2 -translate-y-1/2 rounded-full transition-all duration-300 ${
                  isCurrent
                    ? 'w-5 h-5 bg-white shadow-lg shadow-violet-500/40 z-10 -ml-2.5 ring-4 ring-violet-500/30'
                    : isActive
                    ? 'w-3 h-3 bg-violet-400 -ml-1.5 hover:scale-125'
                    : 'w-3 h-3 bg-slate-600 -ml-1.5 hover:bg-slate-500 hover:scale-125'
                }`}
                style={{ left: `${pos}%` }}
                title={String(year)}
              />
            );
          })}
        </div>
      </div>

      {/* Year Labels */}
      <div className="px-4 mb-3 flex justify-between">
        {years.map((year) => (
          <button
            key={year}
            onClick={() => onYearChange(year)}
            className={`text-[10px] font-black uppercase tracking-wider transition-colors ${
              year === selectedYear ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Playback Controls */}
      <div className="px-4 pb-4 flex items-center justify-center gap-3">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
            isPlaying
              ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
              : 'bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 shadow-violet-500/30'
          }`}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white fill-current" />
          ) : (
            <Play className="w-5 h-5 text-white fill-current ml-0.5" />
          )}
        </button>

        <button
          onClick={handleNext}
          disabled={currentIndex === years.length - 1}
          className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TimeSlider;
