import React, { useState, useEffect } from 'react';

interface WelcomeBannerProps {
    show: boolean;
    isAppLoading?: boolean;
    /** How many seconds to display before fading (default 5) */
    duration?: number;
    /** Desktop position in % from top-left viewport (default { top:30, left:12 }) */
    position?: { top: number; left: number };
}

const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
    show,
    isAppLoading = false,
    duration = 5,
    position = { top: 30, left: 12 },
}) => {
    const [isFading, setIsFading] = useState(false);
    const [isHidden, setIsHidden] = useState(!show);

    useEffect(() => {
        if (!show) { setIsHidden(true); return; }

        // Wait for the data engine to finish loading before counting down
        if (isAppLoading) { setIsHidden(false); setIsFading(false); return; }

        setIsHidden(false);
        setIsFading(false);

        // Fade out after `duration` seconds, unmount 1 s later
        const fadeTimer = setTimeout(() => setIsFading(true), duration * 1000);
        const hideTimer = setTimeout(() => setIsHidden(true), (duration * 1000) + 1000);

        return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
    }, [show, isAppLoading, duration]);

    if (isHidden) return null;

    // On mobile: centred overlay. On desktop: use admin-controlled position.
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const positionStyle: React.CSSProperties = isMobile
        ? { top: '10%', left: '50%', transform: 'translate(-50%, -50%)' }
        : {
            top: `${position.top}%`,
            left: `${position.left}%`,
            transform: 'translate(0, -50%)',
        };

    return (
        <div className={`fixed inset-0 z-[1500] pointer-events-none transition-opacity duration-1000 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>
            <div
                className="absolute flex flex-col items-center text-center w-[90%] md:max-w-lg z-50 transition-all duration-300"
                style={positionStyle}
            >
                {/* Main Logo */}
                <div className="mb-2 drop-shadow-[0_10px_15px_rgba(0,0,0,0.6)]">
                    <img
                        src="/psi-logo.png"
                        alt="PSI Logo"
                        className="h-28 sm:h-32 md:h-48 lg:h-56 w-auto object-contain drop-shadow-[0_10px_15px_rgba(0,0,0,0.6)]"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                </div>

                {/* Presents Text */}
                <p className="text-xs font-bold text-white/80 tracking-[0.4em] uppercase mb-4">
                    PRESENTS
                </p>

                {/* Brand Row */}
                <div className="flex items-center justify-center gap-3 mb-2 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
                    <img
                        src="/favicon.svg"
                        alt="PSI Pin"
                        className="w-8 h-8 drop-shadow-lg"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <h1 className="text-2xl md:text-4xl font-black text-white tracking-wide leading-none whitespace-nowrap drop-shadow-lg">
                        PSI MAPS
                    </h1>
                </div>

                {/* Subtitle */}
                <p className="text-sm md:text-base text-white/90 tracking-widest font-light uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    Advanced Spatial Intelligence
                </p>
            </div>
        </div>
    );
};

export default WelcomeBanner;
