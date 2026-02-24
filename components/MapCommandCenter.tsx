import React, { useRef, useEffect, useState } from 'react';
import { Layers, Box, Compass, RefreshCw, Bird, Map as MapIcon, Sun, TreePine, ZoomIn, ZoomOut, Crosshair, Camera, PenTool, Trash2 } from 'lucide-react';

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
            // preserveDrawingBuffer must be true on the Map component for this to work
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

    return (
        <div className="absolute bottom-[110%] left-0 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl p-4 flex gap-4 z-50 animate-in slide-in-from-bottom-2 duration-200 origin-bottom-left text-slate-700">

            {/* ── Camera Controls ──────────────────────────────── */}
            <div className="flex flex-col gap-2 border-r border-slate-200 pr-4">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 text-center">Camera</span>

                <button
                    onClick={() => execute('bird')}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-all group"
                    title="Community Bird's Eye"
                >
                    <Bird className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                </button>

                <button
                    onClick={() => execute('3d')}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${is3D ? 'bg-purple-100 text-purple-600 shadow-inner border border-purple-200' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                        }`}
                    title="Toggle 3D Perspective"
                >
                    <Box className="w-5 h-5" />
                </button>

                <button
                    onClick={() => setIsRotating(r => !r)}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${isRotating ? 'bg-amber-100 text-amber-600 shadow-inner' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                        }`}
                    title="Cinematic Orbit"
                >
                    <RefreshCw className={`w-5 h-5 ${isRotating ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
                </button>

                <button
                    onClick={() => execute('north')}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all"
                    title="Reset Compass"
                >
                    <Compass className="w-5 h-5" />
                </button>
            </div>

            {/* ── Map Styles Matrix ─────────────────────────────── */}
            <div className="flex flex-col gap-2 border-r border-slate-200 pr-4">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 text-center">Style</span>

                {/* Light Minimal */}
                <button
                    onClick={() => setMapStyle('mapbox://styles/mapbox/light-v11')}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${(mapStyle || '').includes('light')
                        ? 'bg-purple-100 text-purple-600 shadow-inner border border-purple-200'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                        }`}
                    title="Light Minimal"
                >
                    <Sun className="w-5 h-5" />
                </button>

                {/* Outdoors & Terrain */}
                <button
                    onClick={() => setMapStyle('mapbox://styles/mapbox/outdoors-v12')}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${(mapStyle || '').includes('outdoors')
                        ? 'bg-purple-100 text-purple-600 shadow-inner border border-purple-200'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                        }`}
                    title="Outdoors & Terrain"
                >
                    <TreePine className="w-5 h-5" />
                </button>

                {/* Satellite View */}
                <button
                    onClick={() => setMapStyle('mapbox://styles/mapbox/satellite-streets-v12')}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${(mapStyle || '').includes('satellite')
                        ? 'bg-purple-100 text-purple-600 shadow-inner border border-purple-200'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                        }`}
                    title="Satellite View"
                >
                    <Layers className="w-5 h-5" />
                </button>

                {/* Standard Streets */}
                <button
                    onClick={() => setMapStyle('mapbox://styles/mapbox/streets-v12')}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${(mapStyle || '').includes('streets') && !(mapStyle || '').includes('satellite')
                        ? 'bg-purple-100 text-purple-600 shadow-inner border border-purple-200'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                        }`}
                    title="Standard Streets"
                >
                    <MapIcon className="w-5 h-5" />
                </button>
            </div>

            {/* ── Tools: Altitude + Export ──────────────────────── */}
            <div className="flex flex-col gap-2">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 text-center">Tools</span>

                <button
                    onClick={() => execute('zoomIn')}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200"
                    title="Zoom In"
                >
                    <ZoomIn className="w-5 h-5" />
                </button>

                <button
                    onClick={() => execute('zoomOut')}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200"
                    title="Zoom Out"
                >
                    <ZoomOut className="w-5 h-5" />
                </button>

                {/* Crosshair center focus — re-runs bird's eye to snap back to current position */}
                <button
                    onClick={() => execute('bird')}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all"
                    title="Center Focus"
                >
                    <Crosshair className="w-5 h-5" />
                </button>

                {/* Export screenshot */}
                <button
                    onClick={() => execute('export')}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 transition-all group mt-auto border border-blue-100"
                    title="Export Map as PNG"
                >
                    <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
            </div>

            {/* ── Lasso Spatial Filter ────────────────────────────────────── */}
            <div className="flex flex-col gap-2 border-l border-slate-200 pl-4">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 text-center">Lasso</span>

                <button
                    onClick={() => {
                        setIsLassoActive(prev => !prev);
                        window.dispatchEvent(new CustomEvent('lasso-toggle'));
                    }}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${isLassoActive
                            ? 'bg-violet-100 text-violet-600 shadow-inner border border-violet-200'
                            : 'bg-slate-50 hover:bg-violet-50 text-slate-600 hover:text-violet-600'
                        }`}
                    title={isLassoActive ? 'Exit lasso mode' : 'Draw lasso selection'}
                >
                    <PenTool className="w-5 h-5" />
                </button>

                <button
                    onClick={() => {
                        setIsLassoActive(false);
                        window.dispatchEvent(new CustomEvent('lasso-clear'));
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-500 transition-all"
                    title="Clear lasso selection"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default MapCommandCenter;
