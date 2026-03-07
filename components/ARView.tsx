import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Crosshair, Compass, MapPin, Building2, AlertTriangle } from 'lucide-react';
import { Project } from '../types';

interface ARViewProps {
    projects: Project[];
    onClose: () => void;
    onSelectProject?: (project: Project) => void;
}

// Calculate bearing between two lat/lng points (in degrees 0-360)
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
    const x =
        Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
        Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
}

// Haversine distance (km)
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Format price for display
function formatPrice(price: number | string | undefined): string {
    if (!price) return '';
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num) || num === 0) return '';
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M AED`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K AED`;
    return `${num.toLocaleString()} AED`;
}

const AR_RANGE_KM = 10; // Only show projects within 10km
const FOV_DEGREES = 70; // Camera horizontal field of view

const ARView: React.FC<ARViewProps> = ({ projects, onClose, onSelectProject }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [heading, setHeading] = useState<number>(0);
    const [userLat, setUserLat] = useState<number | null>(null);
    const [userLng, setUserLng] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [permissionState, setPermissionState] = useState<'pending' | 'granted' | 'denied'>('pending');
    const headingRef = useRef(0);

    // Get GPS location
    useEffect(() => {
        if (!navigator.geolocation) {
            setError('GPS is not supported on this device');
            return;
        }
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setUserLat(pos.coords.latitude);
                setUserLng(pos.coords.longitude);
            },
            (err) => {
                setError(`GPS Error: ${err.message}. Please enable location services.`);
            },
            { enableHighAccuracy: true, maximumAge: 2000 }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    // Get Camera stream
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
                    audio: false,
                });
                if (mounted) {
                    setStream(mediaStream);
                    if (videoRef.current) videoRef.current.srcObject = mediaStream;
                    setPermissionState('granted');
                }
            } catch {
                if (mounted) {
                    setError('Camera access denied. Please allow camera access to use AR mode.');
                    setPermissionState('denied');
                }
            }
        })();
        return () => {
            mounted = false;
            stream?.getTracks().forEach(t => t.stop());
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Device orientation (compass heading)
    useEffect(() => {
        const handleOrientation = (e: DeviceOrientationEvent) => {
            // Use webkitCompassHeading if available (iOS), otherwise alpha
            const h = (e as any).webkitCompassHeading ?? (e.alpha != null ? (360 - e.alpha) % 360 : 0);
            headingRef.current = h;
            setHeading(h);
        };

        // iOS 13+ requires permission
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            (DeviceOrientationEvent as any).requestPermission().then((state: string) => {
                if (state === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation, true);
                }
            });
        } else {
            window.addEventListener('deviceorientation', handleOrientation, true);
        }

        return () => window.removeEventListener('deviceorientation', handleOrientation, true);
    }, []);

    // Compute visible projects
    const visibleProjects = useMemo(() => {
        if (userLat == null || userLng == null) return [];

        return projects
            .filter(p => {
                const lat = Number(p.latitude);
                const lng = Number(p.longitude);
                return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
            })
            .map(p => {
                const lat = Number(p.latitude);
                const lng = Number(p.longitude);
                const dist = distanceKm(userLat, userLng, lat, lng);
                const bearing = calculateBearing(userLat, userLng, lat, lng);
                return { project: p, dist, bearing };
            })
            .filter(p => p.dist <= AR_RANGE_KM)
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 20); // Max 20 labels
    }, [projects, userLat, userLng]);

    // Calculate screen position for each project based on bearing vs heading
    const getScreenPosition = useCallback(
        (projectBearing: number): { x: number; visible: boolean } => {
            let diff = projectBearing - heading;
            // Normalize to -180..180
            while (diff > 180) diff -= 360;
            while (diff < -180) diff += 360;

            const halfFov = FOV_DEGREES / 2;
            const visible = Math.abs(diff) < halfFov;
            // Map -halfFov..+halfFov to 0..1 screen width
            const x = 0.5 + diff / (FOV_DEGREES);
            return { x, visible };
        },
        [heading]
    );

    // Render vertical position based on distance (closer = lower on screen)
    const getVerticalPosition = (dist: number): number => {
        // Near (0-1km): bottom 70%, Far (10km): top 30%
        const t = Math.min(dist / AR_RANGE_KM, 1);
        return 0.3 + (1 - t) * 0.4; // 30% to 70% from top
    };

    if (error) {
        return (
            <div className="fixed inset-0 z-[10000] bg-slate-900 flex items-center justify-center">
                <div className="text-center p-8 max-w-md">
                    <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                    <h2 className="text-xl font-black text-white mb-2">AR Mode Unavailable</h2>
                    <p className="text-slate-400 text-sm mb-6">{error}</p>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[10000] bg-black overflow-hidden">
            {/* Camera Feed */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Dark overlay for contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none" />

            {/* Crosshair center indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <Crosshair className="w-12 h-12 text-white/20" />
            </div>

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-4 bg-gradient-to-b from-black/70 to-transparent z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/90 backdrop-blur flex items-center justify-center">
                        <Compass className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.2em]">AR Explorer</p>
                        <p className="text-sm font-bold text-white">
                            {visibleProjects.filter(p => getScreenPosition(p.bearing).visible).length} projects visible
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-red-500/80 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Compass strip at top */}
            <div className="absolute top-28 left-0 right-0 flex justify-center pointer-events-none z-10">
                <div className="bg-black/50 backdrop-blur-md rounded-full px-4 py-1.5 flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs font-bold text-white">{Math.round(heading)}°</span>
                    <span className="text-[10px] font-bold text-blue-400 uppercase">
                        {heading >= 337.5 || heading < 22.5 ? 'N' :
                            heading < 67.5 ? 'NE' :
                                heading < 112.5 ? 'E' :
                                    heading < 157.5 ? 'SE' :
                                        heading < 202.5 ? 'S' :
                                            heading < 247.5 ? 'SW' :
                                                heading < 292.5 ? 'W' : 'NW'}
                    </span>
                    {userLat && <span className="text-[10px] text-white/50 ml-1">GPS ✓</span>}
                </div>
            </div>

            {/* AR Labels — floating project markers */}
            {visibleProjects.map(({ project, dist, bearing }) => {
                const { x, visible } = getScreenPosition(bearing);
                if (!visible) return null;

                const y = getVerticalPosition(dist);
                const scale = Math.max(0.6, 1 - dist / AR_RANGE_KM * 0.5);
                const opacity = Math.max(0.5, 1 - dist / AR_RANGE_KM * 0.6);
                const distLabel = dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`;

                return (
                    <div
                        key={project.id}
                        className="absolute transition-all duration-300 ease-out pointer-events-auto cursor-pointer"
                        style={{
                            left: `${x * 100}%`,
                            top: `${y * 100}%`,
                            transform: `translate(-50%, -50%) scale(${scale})`,
                            opacity,
                            zIndex: Math.round((1 - dist / AR_RANGE_KM) * 100),
                        }}
                        onClick={() => onSelectProject?.(project)}
                    >
                        {/* Connecting line to pin */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-px h-8 bg-gradient-to-b from-white/60 to-transparent" />

                        {/* Pin dot */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-8 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_8px_rgba(59,130,246,0.6)]" />

                        {/* Label card */}
                        <div className="bg-slate-900/85 backdrop-blur-lg rounded-xl border border-white/15 px-3 py-2 shadow-2xl min-w-[140px] max-w-[200px]">
                            <div className="flex items-start gap-2">
                                <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-white truncate leading-tight">
                                        {project.name}
                                    </p>
                                    {project.developerName && (
                                        <p className="text-[8px] text-blue-300/80 truncate">
                                            {project.developerName}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-white/10">
                                <span className="text-[9px] font-bold text-amber-400">
                                    {formatPrice(project.startingPrice)}
                                </span>
                                <div className="flex items-center gap-1">
                                    <MapPin className="w-2.5 h-2.5 text-white/40" />
                                    <span className="text-[9px] font-bold text-white/60">{distLabel}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Bottom info bar */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center pb-8 pt-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none z-10">
                <div className="text-center">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                        Point your phone at the skyline to discover properties
                    </p>
                    <p className="text-[10px] text-white/30 mt-1">
                        {visibleProjects.length} projects within {AR_RANGE_KM}km • Tap a label for details
                    </p>
                </div>
            </div>

            {/* Loading state */}
            {permissionState === 'pending' && (
                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center z-20">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-white font-bold">Initializing AR...</p>
                        <p className="text-slate-400 text-sm mt-1">Allow camera and location access</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ARView;
