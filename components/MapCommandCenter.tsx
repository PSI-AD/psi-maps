import React, { useRef, useEffect, useState } from 'react';
import { Layers, Box, Compass, RefreshCw, Bird, Map as MapIcon, Sun, TreePine, ZoomIn, ZoomOut, Crosshair, Camera, PenTool, Trash2, TrendingUp, Building2 } from 'lucide-react';

interface MapCommandCenterProps {
    mapRef: React.MutableRefObject<any>;
    mapStyle: string;
    setMapStyle: (style: string) => void;
    onClose: () => void;
}

export const MapCommandCenter: React.FC<MapCommandCenterProps> = ({ mapRef, mapStyle, setMapStyle, onClose }) => {
    const [isRotating, setIsRotating] = useState(false);
    const [is3D, setIs3D] = useState(false);
    const [isLassoActive, setIsLassoActive] = useState(false);
    const [is3DBuildings, setIs3DBuildings] = useState(true);
    const animationRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        const map = mapRef?.current?.getMap?.();
        const rotateCamera = (timestamp: number) => {
            if (!map) return;
            map.rotateTo(360 - (timestamp / 150) % 360, { duration: 0 });
            animationRef.current = requestAnimationFrame(rotateCamera);
        };
        if (isRotating && map) {
            animationRef.current = requestAnimationFrame(rotateCamera);
        } else if (animationRef.current !== undefined) {
            cancelAnimationFrame(animationRef.current);
        }
        return () => {
            if (animationRef.current !== undefined) cancelAnimationFrame(animationRef.current);
        };
    }, [isRotating, mapRef]);

    const execute = (action: 'bird' | '3d' | 'north' | 'zoomIn' | 'zoomOut' | 'export') => {
        const map = mapRef?.current?.getMap?.();
        if (!map && action !== 'export') return;

        setIsRotating(false);

        if (action === 'bird') {
            const currentCenter = map.getCenter();
            map.flyTo({ center: [currentCenter.lng, currentCenter.lat], zoom: 14, pitch: 0, bearing: 0, duration: 2000 });
            setIs3D(false);
        }
        if (action === '3d') {
            const targetPitch = map.getPitch() > 30 ? 0 : 60;
            map.flyTo({ pitch: targetPitch, duration: 1500 });
            setIs3D(targetPitch > 30);
        }
        if (action === 'north') {
            map.resetNorthPitch({ duration: 1000 });
            setIs3D(false);
        }
        if (action === 'zoomIn') map.zoomIn({ duration: 500 });
        if (action === 'zoomOut') map.zoomOut({ duration: 500 });
        if (action === 'export') {
            if (!map) return;
            const canvas = map.getCanvas();
            const dataURL = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataURL;
            a.download = 'psi-map-export.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    /* ── Btn helper for consistency ──────────────────────────── */
    const Btn: React.FC<{ onClick: () => void; active?: boolean; title: string; children: React.ReactNode }> = ({ onClick, active, title, children }) => (
        <button
            onClick={onClick}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shrink-0 ${active
                ? 'bg-purple-100 text-purple-600 shadow-inner border border-purple-200'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
            title={title}
        >
            {children}
        </button>
    );

    return (
        /* ─── HORIZONTAL ROW — never wraps, scrolls if needed ─── */
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl p-3 flex flex-row flex-nowrap gap-3 animate-in slide-in-from-bottom-2 duration-200 origin-bottom-left text-slate-700 overflow-x-auto max-w-[90vw]">

            {/* ── Camera ───────────────────────────────── */}
            <div className="flex flex-col gap-1.5 border-r border-slate-200 pr-3 shrink-0">
                <span className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">Camera</span>
                <Btn onClick={() => execute('bird')} title="Bird's Eye"><Bird className="w-4.5 h-4.5" /></Btn>
                <Btn onClick={() => execute('3d')} active={is3D} title="3D Perspective"><Box className="w-4.5 h-4.5" /></Btn>
                <Btn onClick={() => setIsRotating(r => !r)} active={isRotating} title="Orbit"><RefreshCw className={`w-4.5 h-4.5 ${isRotating ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} /></Btn>
                <Btn onClick={() => execute('north')} title="Reset North"><Compass className="w-4.5 h-4.5" /></Btn>
            </div>

            {/* ── Style ──────────────────────────────── */}
            <div className="flex flex-col gap-1.5 border-r border-slate-200 pr-3 shrink-0">
                <span className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">Style</span>
                <Btn onClick={() => setMapStyle('mapbox://styles/mapbox/light-v11')} active={(mapStyle || '').includes('light')} title="Light"><Sun className="w-4.5 h-4.5" /></Btn>
                <Btn onClick={() => setMapStyle('mapbox://styles/mapbox/outdoors-v12')} active={(mapStyle || '').includes('outdoors')} title="Outdoors"><TreePine className="w-4.5 h-4.5" /></Btn>
                <Btn onClick={() => setMapStyle('mapbox://styles/mapbox/satellite-streets-v12')} active={(mapStyle || '').includes('satellite')} title="Satellite"><Layers className="w-4.5 h-4.5" /></Btn>
                <Btn onClick={() => setMapStyle('mapbox://styles/mapbox/streets-v12')} active={(mapStyle || '').includes('streets') && !(mapStyle || '').includes('satellite')} title="Streets"><MapIcon className="w-4.5 h-4.5" /></Btn>
            </div>

            {/* ── Tools ──────────────────────────────── */}
            <div className="flex flex-col gap-1.5 border-r border-slate-200 pr-3 shrink-0">
                <span className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">Tools</span>
                <Btn onClick={() => execute('zoomIn')} title="Zoom In"><ZoomIn className="w-4.5 h-4.5" /></Btn>
                <Btn onClick={() => execute('zoomOut')} title="Zoom Out"><ZoomOut className="w-4.5 h-4.5" /></Btn>
                <Btn onClick={() => execute('bird')} title="Centre Focus"><Crosshair className="w-4.5 h-4.5" /></Btn>
                <Btn
                    onClick={() => {
                        setIs3DBuildings(prev => {
                            const next = !prev;
                            window.dispatchEvent(new CustomEvent('toggle-3d-buildings', { detail: { enabled: next } }));
                            return next;
                        });
                    }}
                    active={is3DBuildings}
                    title={is3DBuildings ? 'Hide 3D Buildings' : 'Show 3D Buildings'}
                >
                    <Building2 className="w-4.5 h-4.5" />
                </Btn>
                <button
                    onClick={() => execute('export')}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 transition-all group border border-blue-100 shrink-0"
                    title="Export Map as PNG"
                >
                    <Camera className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
                </button>
            </div>

            {/* ── Lasso ──────────────────────────────── */}
            <div className="flex flex-col gap-1.5 border-r border-slate-200 pr-3 shrink-0">
                <span className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">Lasso</span>
                <Btn
                    onClick={() => {
                        setIsLassoActive(prev => !prev);
                        window.dispatchEvent(new CustomEvent('lasso-toggle'));
                    }}
                    active={isLassoActive}
                    title={isLassoActive ? 'Exit lasso mode' : 'Draw lasso selection'}
                >
                    <PenTool className="w-4.5 h-4.5" />
                </Btn>
                <button
                    onClick={() => {
                        setIsLassoActive(false);
                        window.dispatchEvent(new CustomEvent('lasso-clear'));
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-500 transition-all shrink-0"
                    title="Clear lasso selection"
                >
                    <Trash2 className="w-4.5 h-4.5" />
                </button>
            </div>

            {/* ── Insights ───────────────────────────── */}
            <div className="flex flex-col gap-1.5 shrink-0">
                <span className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">Insights</span>
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('toggle-roi-heatmap'))}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 transition-all shrink-0"
                    title="ROI Investment Zones"
                >
                    <TrendingUp className="w-4.5 h-4.5" />
                </button>
            </div>
        </div>
    );
};

export default MapCommandCenter;
