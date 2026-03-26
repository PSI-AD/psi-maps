import React, { useState, useEffect } from 'react';
import { WalkabilityScore } from '../types';
import { GraduationCap, HeartPulse, UtensilsCrossed, Train, Trees, ShoppingBag, Star } from 'lucide-react';

interface WalkabilityRadialProps {
  score: WalkabilityScore;
  projectName?: string;
  compact?: boolean;
}

const categories = [
  { key: 'schools', label: 'Schools', icon: GraduationCap, color: '#10b981', bg: 'bg-emerald-500/10' },
  { key: 'hospitals', label: 'Healthcare', icon: HeartPulse, color: '#ef4444', bg: 'bg-red-500/10' },
  { key: 'dining', label: 'Dining', icon: UtensilsCrossed, color: '#f97316', bg: 'bg-orange-500/10' },
  { key: 'transit', label: 'Transit', icon: Train, color: '#3b82f6', bg: 'bg-blue-500/10' },
  { key: 'parks', label: 'Parks', icon: Trees, color: '#22c55e', bg: 'bg-green-500/10' },
  { key: 'shopping', label: 'Shopping', icon: ShoppingBag, color: '#8b5cf6', bg: 'bg-violet-500/10' },
] as const;

const getScoreLabel = (score: number): string => {
  if (score >= 9) return 'Excellent';
  if (score >= 7) return 'Very Good';
  if (score >= 5) return 'Good';
  if (score >= 3) return 'Fair';
  return 'Limited';
};

const getScoreColor = (score: number): string => {
  if (score >= 8) return 'text-emerald-400';
  if (score >= 6) return 'text-blue-400';
  if (score >= 4) return 'text-amber-400';
  return 'text-red-400';
};

const WalkabilityRadial: React.FC<WalkabilityRadialProps> = ({ score, projectName, compact = false }) => {
  const [animatedOverall, setAnimatedOverall] = useState(0);
  const [showBars, setShowBars] = useState(false);

  // Animate the overall score on mount
  useEffect(() => {
    const target = score.overall;
    let current = 0;
    const timer = setInterval(() => {
      current += 0.1;
      if (current >= target) {
        setAnimatedOverall(target);
        clearInterval(timer);
      } else {
        setAnimatedOverall(Math.round(current * 10) / 10);
      }
    }, 30);
    // Stagger category bars
    const barTimer = setTimeout(() => setShowBars(true), 300);
    return () => {
      clearInterval(timer);
      clearTimeout(barTimer);
    };
  }, [score.overall]);

  // SVG circular progress
  const radius = compact ? 36 : 52;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (animatedOverall / 10) * circumference;

  if (compact) {
    // Compact mode — inline badge
    return (
      <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
        <svg width={80} height={80} className="shrink-0 -rotate-90">
          <circle cx={40} cy={40} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={5} />
          <circle
            cx={40} cy={40} r={radius}
            fill="none"
            stroke={animatedOverall >= 7 ? '#10b981' : animatedOverall >= 5 ? '#3b82f6' : '#f59e0b'}
            strokeWidth={5}
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
          <text
            x={40} y={40}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-slate-800 text-lg font-black"
            transform="rotate(90, 40, 40)"
          >
            {animatedOverall.toFixed(1)}
          </text>
        </svg>
        <div className="min-w-0">
          <div className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">Walkability</div>
          <div className={`text-sm font-bold ${getScoreColor(score.overall)}`}>
            {getScoreLabel(score.overall)}
          </div>
        </div>
      </div>
    );
  }

  // Full mode — with radial chart + bar breakdown
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
              <Star className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-white text-sm font-black">Walkability & Lifestyle</h4>
              {projectName && (
                <p className="text-slate-400 text-[10px] font-bold truncate max-w-[180px]">{projectName}</p>
              )}
            </div>
          </div>
          <div className={`text-2xl font-black ${getScoreColor(score.overall)}`}>
            {animatedOverall.toFixed(1)}<span className="text-slate-500 text-sm">/10</span>
          </div>
        </div>
      </div>

      <div className="p-5">
        {/* Radial Chart */}
        <div className="flex justify-center mb-5">
          <div className="relative">
            <svg width={140} height={140} className="-rotate-90">
              <circle cx={70} cy={70} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={8} />
              <circle
                cx={70} cy={70} r={radius}
                fill="none"
                stroke="url(#walkGradient)"
                strokeWidth={8}
                strokeDasharray={circumference}
                strokeDashoffset={progressOffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="walkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-800">{animatedOverall.toFixed(1)}</span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${getScoreColor(score.overall)}`}>
                {getScoreLabel(score.overall)}
              </span>
            </div>
          </div>
        </div>

        {/* Category Bars */}
        <div className="space-y-3">
          {categories.map((cat, idx) => {
            const value = (score as any)[cat.key] as number;
            const Icon = cat.icon;
            return (
              <div key={cat.key} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg ${cat.bg} flex items-center justify-center shrink-0`}
                  style={{ color: cat.color }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-600">{cat.label}</span>
                    <span className="text-xs font-black text-slate-800">{value}/10</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all ease-out"
                      style={{
                        width: showBars ? `${(value / 10) * 100}%` : '0%',
                        backgroundColor: cat.color,
                        transitionDuration: `${600 + idx * 100}ms`,
                        transitionDelay: `${idx * 80}ms`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WalkabilityRadial;
