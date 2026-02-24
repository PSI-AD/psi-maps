import React, { useRef, useEffect, useState } from 'react';
import { Layers, Box, Compass, RefreshCw, Bird, Map as MapIcon, Moon } from 'lucide-react';

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

    const execute = (action: 'bird' | '3d' | 'north') => {
        const map = mapRef?.current?.getMap?.();
        if (!map) return;
        setIsRotating(false);
        if (action === 'bird') {
            map.flyTo({ center: [54.5, 24.5], zoom: 6, pitch: 0, bearing: 0, duration: 2500 });
            setIs3D(false);
        }
        if (action === '3d') {
            const targetPitch = map.getPitch() > 30 ? 0 : 60;
            map.flyTo({ pitch: targetPitch, duration: 1000 });
            setIs3D(targetPitch > 30);
        }
        if (action === 'north') {
            map.resetNorthPitch({ duration: 1000 });
            setIs3D(false);
        }
    };

    return (
        <div className="absolute bottom-[110%] left-0 bg-white/98 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-3 flex gap-2 z-50 animate-in slide-in-from-bottom-2 duration-200">
            {/* Camera controls column */}
            <div className="flex flex-col gap-1.5 border-r border-slate-200 pr-2.5">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center mb-1">Camera</p>
                <button
                    onClick={() => execute('bird')}
                    className="p-2 rounded-xl text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all"
                    title="Bird's Eye View"
                >
                    <Bird className="w-5 h-5" />
                </button>
                <button
                    onClick={() => execute('3d')}
                    className={`p-2 rounded-xl transition-all ${is3D ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'}`}
                    title="Toggle 3D Perspective"
                >
                    <Box className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setIsRotating(r => !r)}
                    className={`p-2 rounded-xl transition-all ${isRotating ? 'bg-amber-100 text-amber-600' : 'text-slate-600 hover:bg-amber-50 hover:text-amber-600'}`}
                    title="Cinematic Auto-Rotate"
                >
                    <RefreshCw className={`w-5 h-5 ${isRotating ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                </button>
                <button
                    onClick={() => execute('north')}
                    className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
                    title="Reset Compass North"
                >
                    <Compass className="w-5 h-5" />
                </button>
            </div>

            {/* Style column */}
            <div className="flex flex-col gap-1.5 pl-0.5">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center mb-1">Style</p>
                <button
                    onClick={() => { setMapStyle('mapbox://styles/mapbox/satellite-streets-v12'); onClose(); }}
                    className={`p-2 rounded-xl transition-all ${(mapStyle || '').includes('satellite') ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    title="Satellite View"
                >
                    <Layers className="w-5 h-5" />
                </button>
                <button
                    onClick={() => { setMapStyle('mapbox://styles/mapbox/dark-v11'); onClose(); }}
                    className={`p-2 rounded-xl transition-all ${(mapStyle || '').includes('dark') ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    title="Night Mode"
                >
                    <Moon className="w-5 h-5" />
                </button>
                <button
                    onClick={() => { setMapStyle('mapbox://styles/mapbox/streets-v12'); onClose(); }}
                    className={`p-2 rounded-xl transition-all ${(mapStyle || '').includes('streets') ? 'bg-sky-100 text-sky-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    title="Street Map"
                >
                    <MapIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default MapCommandCenter;
