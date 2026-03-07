import React, { useState } from 'react';
import { X, Maximize2, Minimize2, ExternalLink, Eye } from 'lucide-react';

interface StreetViewPanelProps {
    lat: number;
    lng: number;
    projectName: string;
    onClose: () => void;
}

const StreetViewPanel: React.FC<StreetViewPanelProps> = ({ lat, lng, projectName, onClose }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Google Maps embed — shows interactive map at location, user can drag pegman for Street View
    const embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=18&t=k&ie=UTF8&iwloc=&output=embed`;

    // Direct Google Street View link (opens in new tab)
    const streetViewUrl = `https://www.google.com/maps/@${lat},${lng},3a,90y,0h,85t/data=!3m6!1e1!3m4!1s!2e0!6s!7i16384!8i8192`;

    // Google Maps link for directions
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

    return (
        <div
            className={`fixed z-[6500] transition-all duration-500 ease-out ${isExpanded
                    ? 'inset-0'
                    : 'bottom-0 left-0 right-0 h-[45vh] md:left-[420px] md:right-0'
                }`}
        >
            {/* Dark backdrop when expanded */}
            {isExpanded && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            )}

            <div className={`relative w-full h-full bg-slate-900 flex flex-col ${isExpanded ? 'rounded-none' : 'rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)]'
                }`}>
                {/* Header Bar */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                            <Eye className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.2em]">Street View</p>
                            <p className="text-xs font-bold text-white truncate">{projectName}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {/* Open in Google Maps */}
                        <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-all"
                            title="Open in Google Maps"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        {/* Expand/Collapse */}
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-all"
                            title={isExpanded ? 'Minimize' : 'Expand'}
                        >
                            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        </button>

                        {/* Close */}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-red-500/80 hover:text-white transition-all"
                            title="Close Street View"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Google Maps Embed iframe */}
                <div className="flex-1 relative">
                    <iframe
                        src={embedUrl}
                        className="absolute inset-0 w-full h-full border-0"
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title={`Street View - ${projectName}`}
                    />

                    {/* Floating hint overlay */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 backdrop-blur rounded-full text-white text-[10px] font-bold uppercase tracking-wider pointer-events-none animate-pulse">
                        Drag the pegman 🟡 onto the map for Street View
                    </div>
                </div>

                {/* Quick action bar at bottom */}
                <div className="flex items-center justify-center gap-3 px-4 py-2 bg-slate-900/95 border-t border-white/10 shrink-0">
                    <a
                        href={streetViewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-full text-xs font-bold hover:bg-blue-700 transition-colors"
                    >
                        <Eye className="w-3.5 h-3.5" />
                        Open Full Street View
                    </a>
                    <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-1.5 bg-white/10 text-white rounded-full text-xs font-bold hover:bg-white/20 transition-colors"
                    >
                        Get Directions
                    </a>
                </div>
            </div>
        </div>
    );
};

export default StreetViewPanel;
