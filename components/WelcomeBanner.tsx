import React, { useState, useEffect } from 'react';

interface WelcomeBannerProps {
    show: boolean;
}

const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ show }) => {
    const [isFading, setIsFading] = useState(false);
    const [isHidden, setIsHidden] = useState(!show);

    useEffect(() => {
        if (!show) {
            setIsHidden(true);
            return;
        }

        // Reset states if it shows
        setIsHidden(false);
        setIsFading(false);

        // Start fading out after 5 seconds
        const fadeTimer = setTimeout(() => setIsFading(true), 5000);

        // Unmount completely after 6 seconds (allows 1s for fade transition)
        const hideTimer = setTimeout(() => setIsHidden(true), 6000);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(hideTimer);
        };
    }, [show]);

    if (isHidden) return null;

    return (
        <div className={`fixed inset-0 z-[1500] pointer-events-none transition-opacity duration-1000 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute top-[10%] left-1/2 -translate-x-1/2 md:top-[15%] md:left-[8%] md:translate-x-0 flex flex-col items-center md:items-start w-[90%] md:max-w-lg z-50">

                {/* Main Logo - Responsive Size */}
                <div className="mb-2 drop-shadow-[0_10px_15px_rgba(0,0,0,0.6)]">
                    <img
                        src="/psi-logo.png"
                        alt="PSI Logo"
                        className="h-28 sm:h-32 md:h-48 lg:h-56 w-auto object-contain drop-shadow-[0_10px_15px_rgba(0,0,0,0.6)]"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                </div>

                {/* Presents Text */}
                <p className="text-sm md:text-base font-bold text-white/90 tracking-[0.4em] uppercase mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-center md:text-left">
                    PRESENTS
                </p>

                {/* Message with Favicon Pin */}
                <div className="flex items-center justify-center md:justify-start gap-3 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] text-center md:text-left">
                    <img
                        src="/favicon.svg"
                        alt="PSI Pin"
                        className="w-8 h-8 md:w-10 md:h-10 drop-shadow-lg"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide leading-tight whitespace-nowrap">
                        Advanced Spatial Intelligence
                    </h2>
                </div>

            </div>
        </div>
    );
};

export default WelcomeBanner;
