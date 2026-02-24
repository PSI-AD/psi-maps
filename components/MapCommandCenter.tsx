import React, { useRef, useEffect, useState } from 'react';
import { Layers, Box, Compass, RefreshCw, Bird, Map as MapIcon, Moon, ZoomIn, ZoomOut, Crosshair } from 'lucide-react';

interface MapCommandCenterProps {
    mapRef: React.MutableRefObject<any>;
    mapStyle: string;
    setMapStyle: (style: string) => void;
    onClose: () => void;
}

export const MapCommandCenter: React.FC<MapCommandCenterProps> = ({ mapRef, mapStyle, setMapStyle, onClose }) => {
    const [isRotating, setIsRotating] = useState(false);
    const [is3D, setIs3D] = useState(false);
    const animationRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        const map = mapRef?.current?.getMap?.();
        const rotateCamera = (timestamp: number) => {
            if (!map) return;
            map.rotateTo((timestamp / 150) % 360, { duration: 0 });
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

    const execute = (action: 'bird' | '3d' | 'north' | 'zoomIn' | 'zoomOut') => {
        const map = mapRef?.current?.getMap?.();
        if (!map) return;

        setIsRotating(false);

        if (action === 'bird') {
            // Localized — centers on the current map view, not a hardcoded coordinate
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
        if (action === 'zoomIn') {
            map.zoomIn({ duration: 500 });
        }
        if (action === 'zoomOut') {
            map.zoomOut({ duration: 500 });
        }
    };

    return (
        <div className="absolute bottom-[110%] left-0 bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-2xl p-4 flex gap-4 z-50 animate-in slide-in-from-bottom-2 duration-200 origin-bottom-left text-slate-300">

            {/* ── Camera Controls ───────────────────────────────── */}
            <div className="flex flex-col gap-2 border-r border-slate-700/80 pr-4">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Camera</span>

                <button
                    onClick={() => execute('bird')}
                    className="p-2.5 rounded-xl hover:bg-blue-600/20 hover:text-blue-400 hover:shadow-[inset_0_0_15px_rgba(37,99,235,0.2)] transition-all group border border-transparent"
                    title="Community Bird's Eye"
                >
                    <Bird className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                </button>

                <button
                    onClick={() => execute('3d')}
                    className={`p-2.5 rounded-xl transition-all ${is3D
                            ? 'bg-blue-600/30 text-blue-400 shadow-[inset_0_0_15px_rgba(37,99,235,0.3)] border border-blue-500/30'
                            : 'hover:bg-slate-800 border border-transparent'
                        }`}
                    title="Toggle 3D Drone View"
                >
                    <Box className="w-5 h-5" />
                </button>

                <button
                    onClick={() => setIsRotating(r => !r)}
                    className={`p-2.5 rounded-xl transition-all ${isRotating
                            ? 'bg-purple-600/30 text-purple-400 shadow-[inset_0_0_15px_rgba(147,51,234,0.3)] border border-purple-500/30'
                            : 'hover:bg-slate-800 border border-transparent'
                        }`}
                    title="Cinematic Orbit"
                >
                    <RefreshCw className={`w-5 h-5 ${isRotating ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
                </button>

                <button
                    onClick={() => execute('north')}
                    className="p-2.5 rounded-xl hover:bg-slate-800 transition-all border border-transparent"
                    title="Reset Compass"
                >
                    <Compass className="w-5 h-5" />
                </button>
            </div>

            {/* ── Map Style / Display ───────────────────────────── */}
            <div className="flex flex-col gap-2 border-r border-slate-700/80 pr-4">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Display</span>

                <button
                    onClick={() => setMapStyle('mapbox://styles/mapbox/satellite-streets-v12')}
                    className={`p-2.5 rounded-xl transition-all ${(mapStyle || '').includes('satellite')
                            ? 'bg-emerald-600/30 text-emerald-400 shadow-[inset_0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500/30'
                            : 'hover:bg-slate-800 border border-transparent'
                        }`}
                    title="Satellite View"
                >
                    <Layers className="w-5 h-5" />
                </button>

                <button
                    onClick={() => setMapStyle('mapbox://styles/mapbox/dark-v11')}
                    className={`p-2.5 rounded-xl transition-all ${(mapStyle || '').includes('dark')
                            ? 'bg-blue-600/30 text-blue-400 shadow-[inset_0_0_15px_rgba(37,99,235,0.3)] border border-blue-500/30'
                            : 'hover:bg-slate-800 border border-transparent'
                        }`}
                    title="Midnight Protocol"
                >
                    <Moon className="w-5 h-5" />
                </button>

                <button
                    onClick={() => setMapStyle('mapbox://styles/mapbox/streets-v12')}
                    className={`p-2.5 rounded-xl transition-all ${(mapStyle || '').includes('streets')
                            ? 'bg-sky-600/30 text-sky-400 shadow-[inset_0_0_15px_rgba(14,165,233,0.3)] border border-sky-500/30'
                            : 'hover:bg-slate-800 border border-transparent'
                        }`}
                    title="Vector Streets"
                >
                    <MapIcon className="w-5 h-5" />
                </button>
            </div>

            {/* ── Altitude / Zoom Controls ──────────────────────── */}
            <div className="flex flex-col gap-2">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Altitude</span>

                <button
                    onClick={() => execute('zoomIn')}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 hover:text-white transition-all border border-slate-700 shadow-sm"
                    title="Zoom In"
                >
                    <ZoomIn className="w-5 h-5" />
                </button>

                <button
                    onClick={() => execute('zoomOut')}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 hover:text-white transition-all border border-slate-700 shadow-sm"
                    title="Zoom Out"
                >
                    <ZoomOut className="w-5 h-5" />
                </button>

                <button
                    onClick={() => execute('bird')}
                    className="p-2.5 rounded-xl hover:bg-slate-800 transition-all border border-transparent mt-auto"
                    title="Center Focus"
                >
                    <Crosshair className="w-5 h-5 text-slate-500 hover:text-white transition-colors" />
                </button>
            </div>
        </div>
    );
};

export default MapCommandCenter;
