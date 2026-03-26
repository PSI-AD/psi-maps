import React, { useState, useEffect } from 'react';
import { InvestmentStory } from '../types';
import { TrendingUp, Clock, Zap, Rocket, ArrowRight, Building2, MapPin, DollarSign, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface InvestmentStoryPanelProps {
  story: InvestmentStory;
  projectName?: string;
  onClose?: () => void;
}

const phases = [
  { key: 'past', label: 'Past', icon: Clock, color: 'from-amber-500 to-orange-500', ring: 'ring-amber-400/30', dot: 'bg-amber-500', text: 'text-amber-500' },
  { key: 'present', label: 'Present', icon: Zap, color: 'from-blue-500 to-indigo-600', ring: 'ring-blue-400/30', dot: 'bg-blue-500', text: 'text-blue-500' },
  { key: 'future', label: 'Future', icon: Rocket, color: 'from-violet-500 to-purple-600', ring: 'ring-violet-400/30', dot: 'bg-violet-500', text: 'text-violet-500' },
] as const;

const InvestmentStoryPanel: React.FC<InvestmentStoryPanelProps> = ({ story, projectName, onClose }) => {
  const [activePhase, setActivePhase] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);

  // Animation trigger
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 600);
    return () => clearTimeout(timer);
  }, [activePhase]);

  // Auto-play
  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setActivePhase(prev => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(timer);
  }, [autoPlay]);

  const currentPhase = phases[activePhase];
  const currentData = story[currentPhase.key as keyof InvestmentStory];

  // Calculate growth from past to present
  const pastPrice = story.past.pricePerSqft;
  const presentPrice = story.present.pricePerSqft;
  const futurePrice = story.future.pricePerSqft;
  const pastToPresent = pastPrice > 0 ? Math.round(((presentPrice - pastPrice) / pastPrice) * 100) : 0;
  const presentToFuture = presentPrice > 0 ? Math.round(((futurePrice - presentPrice) / presentPrice) * 100) : 0;

  const PhaseIcon = currentPhase.icon;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${currentPhase.color} px-5 py-4 transition-all duration-500`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center ring-4 ${currentPhase.ring}`}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-white text-sm font-black">Investment Story</h4>
              {projectName && (
                <p className="text-white/70 text-[10px] font-bold truncate max-w-[180px]">{projectName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                autoPlay ? 'bg-white/30 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {autoPlay ? '⏸ Auto' : '▶ Auto'}
            </button>
            {onClose && (
              <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors text-xs">
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Phase Navigation Tabs */}
      <div className="flex border-b border-slate-100">
        {phases.map((phase, idx) => {
          const Icon = phase.icon;
          const isActive = idx === activePhase;
          return (
            <button
              key={phase.key}
              onClick={() => setActivePhase(idx)}
              className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-all border-b-2 ${
                isActive
                  ? `border-current ${phase.text} bg-white font-black`
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">{phase.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className={`p-5 transition-all duration-500 ${isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
        {/* Year & Price */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Year</div>
            <div className="text-4xl font-black text-slate-800">{currentData.year}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Price / sqft</div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              <span className="text-3xl font-black text-slate-800">
                {currentData.pricePerSqft.toLocaleString()}
              </span>
              <span className="text-sm text-slate-400 font-bold">AED</span>
            </div>
          </div>
        </div>

        {/* Growth Banner */}
        {activePhase === 1 && pastToPresent > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-black text-emerald-800 uppercase tracking-widest">Growth Since {story.past.year}</div>
              <div className="text-xl font-black text-emerald-600">+{pastToPresent}%</div>
            </div>
          </div>
        )}

        {activePhase === 2 && presentToFuture > 0 && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center shadow-sm">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-black text-violet-800 uppercase tracking-widest">Projected Growth</div>
              <div className="text-xl font-black text-violet-600">+{presentToFuture}%</div>
            </div>
          </div>
        )}

        {/* Area Description */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Area Overview</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{currentData.areaDescription}</p>
        </div>

        {/* Highlights */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
              {activePhase === 0 ? 'Historical Events' : activePhase === 1 ? 'Current Highlights' : 'Planned Developments'}
            </span>
          </div>
          <div className="space-y-2">
            {currentData.highlights.map((highlight, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-sm text-slate-700"
                style={{
                  animationDelay: `${idx * 100}ms`,
                  animation: isAnimating ? 'none' : `fadeSlideIn 0.3s ease-out ${idx * 100}ms forwards`,
                  opacity: 0,
                }}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${currentPhase.dot} mt-2 shrink-0`} />
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Price Timeline Bar */}
      <div className="px-5 pb-5">
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Price Journey (AED/sqft)</div>
          <div className="flex items-end justify-between gap-3">
            {[story.past, story.present, story.future].map((phase, idx) => {
              const maxPrice = Math.max(story.past.pricePerSqft, story.present.pricePerSqft, story.future.pricePerSqft);
              const heightPercent = (phase.pricePerSqft / maxPrice) * 100;
              const isActive = idx === activePhase;
              const colors = ['bg-amber-400', 'bg-blue-500', 'bg-violet-500'];
              const labels = ['Past', 'Now', 'Future'];

              return (
                <button
                  key={idx}
                  onClick={() => setActivePhase(idx)}
                  className={`flex-1 flex flex-col items-center gap-2 transition-all ${isActive ? 'scale-105' : 'opacity-60 hover:opacity-80'}`}
                >
                  <span className="text-xs font-black text-slate-800">
                    {phase.pricePerSqft.toLocaleString()}
                  </span>
                  <div className="w-full flex justify-center">
                    <div
                      className={`w-10 ${colors[idx]} rounded-t-lg transition-all duration-700 ease-out ${
                        isActive ? 'ring-4 ring-blue-200' : ''
                      }`}
                      style={{ height: `${Math.max(20, heightPercent * 0.8)}px` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">{labels[idx]}</span>
                  <span className="text-[10px] font-black text-slate-400">{phase.year}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <div className="flex items-center justify-between px-5 pb-4">
        <button
          onClick={() => setActivePhase(Math.max(0, activePhase - 1))}
          disabled={activePhase === 0}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{activePhase > 0 ? phases[activePhase - 1].label : ''}</span>
        </button>

        {/* Phase Dots */}
        <div className="flex gap-2">
          {phases.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActivePhase(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                idx === activePhase ? `${phases[idx].dot} scale-125` : 'bg-slate-200 hover:bg-slate-300'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setActivePhase(Math.min(2, activePhase + 1))}
          disabled={activePhase === 2}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-30"
        >
          <span>{activePhase < 2 ? phases[activePhase + 1].label : ''}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* CSS for fadeSlideIn */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default InvestmentStoryPanel;
