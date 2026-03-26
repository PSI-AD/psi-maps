import React, { useState } from 'react';
import { ViewSimulationEntry } from '../types';
import { Building2, Eye, Mountain, Waves, Trees, Sun, Palmtree, CircleDollarSign, ChevronUp, ChevronDown, Maximize2 } from 'lucide-react';

interface ViewSimulatorProps {
  views: ViewSimulationEntry[];
  projectName?: string;
  compact?: boolean;
}

const viewTypeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  city: { icon: <Building2 className="w-4 h-4" />, color: 'text-slate-600', bg: 'bg-slate-100', label: 'City View' },
  sea: { icon: <Waves className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Sea View' },
  garden: { icon: <Trees className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Garden View' },
  skyline: { icon: <Sun className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Skyline View' },
  mixed: { icon: <Eye className="w-4 h-4" />, color: 'text-violet-600', bg: 'bg-violet-50', label: 'Mixed View' },
  pool: { icon: <Waves className="w-4 h-4" />, color: 'text-cyan-600', bg: 'bg-cyan-50', label: 'Pool View' },
  park: { icon: <Palmtree className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-50', label: 'Park View' },
};

const ViewSimulator: React.FC<ViewSimulatorProps> = ({ views, projectName, compact = false }) => {
  const [selectedFloor, setSelectedFloor] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!views || views.length === 0) return null;

  const current = views[selectedFloor];
  const config = viewTypeConfig[current.viewType] || viewTypeConfig.mixed;

  if (compact) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Mountain className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-widest">View Sim</span>
          </div>
          <span className="text-xs font-bold text-slate-500">{views.length} floors</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {views.map((view, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedFloor(idx)}
              className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                idx === selectedFloor
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {view.floorLabel}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className={config.color + ' font-bold'}>{config.label}</span>
          <span className="text-emerald-600 font-black">{current.premium}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Mountain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-white text-sm font-black">Floor View Simulator</h4>
                {projectName && (
                  <p className="text-white/70 text-[10px] font-bold truncate max-w-[180px]">{projectName}</p>
                )}
              </div>
            </div>
            <div className="text-white/80 text-xs font-bold">
              {views.length} levels
            </div>
          </div>
        </div>

        <div className="p-5">
          {/* Floor Visual */}
          <div className="relative bg-gradient-to-b from-sky-100 to-sky-50 rounded-2xl p-4 mb-4 min-h-[160px] overflow-hidden">
            {/* Building silhouette */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
              {views.map((view, idx) => {
                const isSelected = idx === selectedFloor;
                const height = 8 + idx * 3;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedFloor(idx)}
                    className={`w-32 transition-all duration-300 ${
                      isSelected
                        ? 'bg-blue-500 border-blue-600 shadow-lg shadow-blue-500/30 z-10'
                        : idx < selectedFloor
                        ? 'bg-slate-300 border-slate-400'
                        : 'bg-slate-200 border-slate-300'
                    } border-x-2 border-t ${idx === 0 ? 'rounded-t-lg border-t-2' : ''}`}
                    style={{ height: `${height}px` }}
                    title={view.floorLabel}
                  >
                    {isSelected && (
                      <span className="text-[8px] text-white font-black">{view.floorLabel}</span>
                    )}
                  </button>
                );
              }).reverse()}
            </div>

            {/* View direction indicator */}
            <div className="absolute top-3 right-3">
              <div className={`${config.bg} ${config.color} px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5`}>
                {config.icon}
                <span>{config.label}</span>
              </div>
            </div>

            {/* Eye level indicator */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <div className="bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm">
                <Eye className="w-4 h-4 text-blue-500 mx-auto mb-0.5" />
                <span className="text-[8px] font-black text-slate-500 block text-center">VIEW</span>
              </div>
            </div>
          </div>

          {/* Floor Selector Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {views.map((view, idx) => {
              const cfg = viewTypeConfig[view.viewType] || viewTypeConfig.mixed;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedFloor(idx)}
                  className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                    idx === selectedFloor
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cfg.icon}
                  <span>{view.floorLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Selected Floor Details */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="grid grid-cols-3 gap-3">
              {/* Visibility Score */}
              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Visibility</div>
                <div className="text-xl font-black text-slate-800">{current.visibility}%</div>
                <div className="h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${current.visibility}%` }} />
                </div>
              </div>

              {/* View Type */}
              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">View Type</div>
                <div className={`inline-flex items-center gap-1.5 ${config.bg} ${config.color} px-2.5 py-1 rounded-lg`}>
                  {config.icon}
                  <span className="text-xs font-bold">{config.label.replace(' View', '')}</span>
                </div>
              </div>

              {/* Price Premium */}
              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Premium</div>
                <div className="flex items-center justify-center gap-1">
                  <CircleDollarSign className="w-4 h-4 text-emerald-500" />
                  <span className="text-xl font-black text-emerald-600">{current.premium}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Floor Navigation */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => setSelectedFloor(Math.max(0, selectedFloor - 1))}
              disabled={selectedFloor === 0}
              className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-30"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <span className="text-sm font-black text-slate-800 min-w-[100px] text-center">
              {current.floorLabel}
            </span>
            <button
              onClick={() => setSelectedFloor(Math.min(views.length - 1, selectedFloor + 1))}
              disabled={selectedFloor === views.length - 1}
              className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-30"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewSimulator;
