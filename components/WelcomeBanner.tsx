import React from 'react';

interface WelcomeBannerProps {
    show: boolean;
}

const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ show }) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[1500] pointer-events-none flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-1000">
            {/* PSI Logo — drop psi-logo.png into the /public folder */}
            <div className="mb-6 drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]">
                <img
                    src="/psi-logo.png"
                    alt="PSI Logo"
                    className="h-28 w-auto object-contain"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
            </div>

            {/* Main headline with heavy shadows for legibility on any map style */}
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)] mb-4 leading-none">
                PSI MAPS
            </h1>
            <p className="text-lg md:text-2xl font-bold text-white tracking-widest uppercase max-w-3xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
                Advanced Spatial Intelligence for UAE Real Estate
            </p>
        </div>
    );
};

export default WelcomeBanner;
