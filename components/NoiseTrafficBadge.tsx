import React from 'react';
import { Volume2, VolumeX, Car, Plane, AlertTriangle } from 'lucide-react';

interface NoiseTrafficBadgeProps {
  noiseLevel?: 'Quiet' | 'Moderate' | 'Busy' | 'Noisy';
  trafficDensity?: number; // 1–10
  airportProximity?: number; // km
  compact?: boolean;
}

const noiseConfig: Record<string, { color: string; bg: string; border: string; label: string; db: string; icon: React.ReactNode }> = {
  Quiet: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Quiet Zone', db: '<40 dB', icon: <VolumeX className="w-4 h-4" /> },
  Moderate: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Moderate', db: '40-60 dB', icon: <Volume2 className="w-4 h-4" /> },
  Busy: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Busy Area', db: '60-75 dB', icon: <Volume2 className="w-4 h-4" /> },
  Noisy: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', label: 'High Noise', db: '>75 dB', icon: <AlertTriangle className="w-4 h-4" /> },
};

const getTrafficColor = (density: number): string => {
  if (density <= 3) return '#10b981';
  if (density <= 5) return '#3b82f6';
  if (density <= 7) return '#f59e0b';
  return '#ef4444';
};

const getTrafficLabel = (density: number): string => {
  if (density <= 3) return 'Light';
  if (density <= 5) return 'Moderate';
  if (density <= 7) return 'Heavy';
  return 'Congested';
};

const NoiseTrafficBadge: React.FC<NoiseTrafficBadgeProps> = ({
  noiseLevel,
  trafficDensity,
  airportProximity,
  compact = false,
}) => {
  if (!noiseLevel && !trafficDensity) return null;

  const noise = noiseLevel ? noiseConfig[noiseLevel] : null;
  const trafficColor = trafficDensity ? getTrafficColor(trafficDensity) : '#94a3b8';
  const trafficLabel = trafficDensity ? getTrafficLabel(trafficDensity) : '';

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {noise && (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${noise.bg} ${noise.border} border ${noise.color} text-xs font-bold`}>
            {noise.icon}
            <span>{noise.label}</span>
          </div>
        )}
        {trafficDensity !== undefined && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
            <Car className="w-3.5 h-3.5" style={{ color: trafficColor }} />
            <span>{trafficLabel}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center">
            <Volume2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="text-white text-sm font-black">Noise & Traffic</h4>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Environmental Data</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Noise Level */}
        {noise && (
          <div className={`${noise.bg} ${noise.border} border rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg bg-white flex items-center justify-center ${noise.color}`}>
                  {noise.icon}
                </div>
                <div>
                  <div className="text-xs font-black text-slate-800 uppercase tracking-widest">Noise Level</div>
                  <div className={`text-sm font-bold ${noise.color}`}>{noise.label}</div>
                </div>
              </div>
              <div className={`text-lg font-black ${noise.color}`}>{noise.db}</div>
            </div>

            {/* Noise indicator bars */}
            <div className="flex gap-1.5 mt-2">
              {['Quiet', 'Moderate', 'Busy', 'Noisy'].map((level, idx) => {
                const levels = ['Quiet', 'Moderate', 'Busy', 'Noisy'];
                const activeIdx = levels.indexOf(noiseLevel!);
                const isActive = idx <= activeIdx;
                const colors = ['bg-emerald-400', 'bg-blue-400', 'bg-amber-400', 'bg-red-400'];
                return (
                  <div key={level} className="flex-1">
                    <div className={`h-2 rounded-full ${isActive ? colors[idx] : 'bg-slate-200'} transition-colors duration-300`} />
                    <div className="text-[8px] font-bold text-slate-400 text-center mt-1 uppercase">{level}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Traffic Density */}
        {trafficDensity !== undefined && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-200">
                  <Car className="w-4 h-4" style={{ color: trafficColor }} />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-800 uppercase tracking-widest">Traffic</div>
                  <div className="text-sm font-bold" style={{ color: trafficColor }}>{trafficLabel}</div>
                </div>
              </div>
              <div className="text-xl font-black text-slate-800">
                {trafficDensity}<span className="text-slate-400 text-sm">/10</span>
              </div>
            </div>

            {/* Traffic density visual bars */}
            <div className="flex gap-1">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-6 rounded-md transition-all duration-300 ${
                    i < trafficDensity! ? '' : 'bg-slate-200'
                  }`}
                  style={{
                    backgroundColor: i < trafficDensity! ? getTrafficColor(Math.min(i + 1, 10)) : undefined,
                    opacity: i < trafficDensity! ? 0.8 + (i * 0.02) : 0.3,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Airport Proximity */}
        {airportProximity !== undefined && (
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-sky-200 shrink-0">
              <Plane className="w-4 h-4 text-sky-500" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-black text-slate-800 uppercase tracking-widest">Airport Distance</div>
              <div className="text-sm font-bold text-sky-600">{airportProximity} km away</div>
            </div>
            {airportProximity < 5 && (
              <div className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full uppercase">
                Near Flight Path
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NoiseTrafficBadge;
