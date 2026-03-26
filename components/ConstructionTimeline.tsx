import React, { useState, useEffect } from 'react';
import { ConstructionProgress } from '../types';
import { CheckCircle2, Clock, AlertTriangle, Circle, HardHat, Camera, ChevronDown, ChevronUp, Calendar, TrendingUp } from 'lucide-react';

interface ConstructionTimelineProps {
  progress: ConstructionProgress;
  projectName?: string;
  compact?: boolean;
}

const statusConfig = {
  'completed': { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500', ring: 'ring-emerald-500/30', line: 'bg-emerald-500' },
  'in-progress': { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500', ring: 'ring-blue-500/30', line: 'bg-blue-500' },
  'upcoming': { icon: Circle, color: 'text-slate-400', bg: 'bg-slate-300', ring: 'ring-slate-300/30', line: 'bg-slate-200' },
  'delayed': { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500', ring: 'ring-amber-500/30', line: 'bg-amber-500' },
};

const ConstructionTimeline: React.FC<ConstructionTimelineProps> = ({ progress, projectName, compact = false }) => {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [expandedSnapshots, setExpandedSnapshots] = useState(false);

  useEffect(() => {
    const target = progress.overallPercent;
    let current = 0;
    const step = target / 40;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        setAnimatedPercent(target);
        clearInterval(timer);
      } else {
        setAnimatedPercent(Math.round(current));
      }
    }, 25);
    return () => clearInterval(timer);
  }, [progress.overallPercent]);

  if (compact) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <HardHat className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Progress</span>
          </div>
          <span className={`text-sm font-black ${progress.isOnSchedule ? 'text-emerald-500' : 'text-amber-500'}`}>
            {animatedPercent}%
          </span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${
              progress.isOnSchedule
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                : 'bg-gradient-to-r from-amber-400 to-amber-500'
            }`}
            style={{ width: `${animatedPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-slate-400 font-bold">
            Est. {progress.expectedCompletion}
          </span>
          <span className={`text-[10px] font-black uppercase tracking-wide ${
            progress.isOnSchedule ? 'text-emerald-500' : 'text-amber-500'
          }`}>
            {progress.isOnSchedule ? '✓ On Schedule' : '⚠ Delayed'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-white text-sm font-black">Construction Progress</h4>
              {projectName && (
                <p className="text-white/70 text-[10px] font-bold truncate max-w-[180px]">{projectName}</p>
              )}
            </div>
          </div>
          <div className={`px-3 py-1 rounded-lg ${
            progress.isOnSchedule ? 'bg-emerald-500/20 text-emerald-100' : 'bg-red-500/20 text-red-100'
          } text-[10px] font-black uppercase tracking-wide`}>
            {progress.isOnSchedule ? 'On Track' : 'Delayed'}
          </div>
        </div>
      </div>

      <div className="p-5">
        {/* Overall Progress Ring */}
        <div className="flex items-center gap-5 mb-6">
          <div className="relative w-24 h-24 shrink-0">
            <svg width={96} height={96} className="-rotate-90">
              <circle cx={48} cy={48} r={38} fill="none" stroke="#f1f5f9" strokeWidth={7} />
              <circle
                cx={48} cy={48} r={38}
                fill="none"
                stroke={progress.isOnSchedule ? '#10b981' : '#f59e0b'}
                strokeWidth={7}
                strokeDasharray={2 * Math.PI * 38}
                strokeDashoffset={2 * Math.PI * 38 * (1 - animatedPercent / 100)}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-slate-800">{animatedPercent}%</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase">Complete</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-slate-700 mb-1">Expected Completion</div>
            <div className="flex items-center gap-1.5 text-lg font-black text-slate-900">
              <Calendar className="w-4 h-4 text-blue-500" />
              {progress.expectedCompletion}
            </div>
            <div className="mt-2 text-xs text-slate-400 font-medium">
              {progress.milestones.filter(m => m.status === 'completed').length} of {progress.milestones.length} milestones completed
            </div>
          </div>
        </div>

        {/* Timeline Milestones */}
        <div className="space-y-0">
          {progress.milestones.map((milestone, idx) => {
            const config = statusConfig[milestone.status];
            const Icon = config.icon;
            const isLast = idx === progress.milestones.length - 1;

            return (
              <div key={idx} className="flex gap-3">
                {/* Timeline line + dot */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center ring-4 ${config.ring} z-10 bg-white`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  {!isLast && (
                    <div className={`w-0.5 flex-1 min-h-[32px] ${config.line} opacity-30`} />
                  )}
                </div>

                {/* Content */}
                <div className={`pb-5 flex-1 ${isLast ? '' : ''}`}>
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-bold text-slate-800">{milestone.label}</h5>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${config.color}`}>
                      {milestone.status.replace('-', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400 font-medium">
                      Target: {milestone.targetDate}
                    </span>
                    {milestone.completedDate && (
                      <span className="text-xs text-emerald-500 font-bold">
                        ✓ {milestone.completedDate}
                      </span>
                    )}
                    {milestone.status === 'delayed' && (
                      <span className="text-xs text-amber-500 font-bold">
                        ⚠ Behind schedule
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Monthly Snapshots */}
        {progress.monthlySnapshots.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <button
              onClick={() => setExpandedSnapshots(!expandedSnapshots)}
              className="flex items-center justify-between w-full text-sm font-black text-slate-700 hover:text-slate-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-500" />
                <span>Monthly Snapshots ({progress.monthlySnapshots.length})</span>
              </div>
              {expandedSnapshots ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {expandedSnapshots && (
              <div className="mt-3 space-y-3">
                {progress.monthlySnapshots.map((snapshot, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                    {snapshot.imageUrl && (
                      <img
                        src={snapshot.imageUrl}
                        alt={`Progress ${snapshot.month}`}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-700">{snapshot.month}</span>
                        <span className="text-xs font-black text-blue-600">{snapshot.percentComplete}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${snapshot.percentComplete}%` }}
                        />
                      </div>
                      {snapshot.notes && (
                        <p className="text-[10px] text-slate-400 mt-1 truncate">{snapshot.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConstructionTimeline;
