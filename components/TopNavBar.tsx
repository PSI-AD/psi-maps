import React from 'react';

interface TopNavBarProps {
  onAdminClick?: () => void;
}

const TopNavBar: React.FC<TopNavBarProps> = ({ onAdminClick }) => {
  return (
    <nav className="fixed top-0 left-0 w-full h-20 bg-white/90 backdrop-blur-md shadow-[0_2px_15px_rgba(0,0,0,0.05)] z-[4000] flex items-center px-4 md:px-6 justify-between border-b border-gray-100">
      {/* PSI Brand Logo - Luxury Identity with Version */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="w-11 h-11 relative flex items-center justify-center">
          <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 115C50 115 92 72 92 46C92 22.804 73.196 4 50 4C26.804 4 8 22.804 8 46C8 72 50 115 50 115Z" fill="#0F172A" stroke="#D4AF37" strokeWidth="2.5" />
            <text x="50" y="58" fill="#D4AF37" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="24" textAnchor="middle" style={{ letterSpacing: '-1px' }}>
              PSI
            </text>
          </svg>
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none block">PSI</span>
          <div className="flex items-center gap-1 mt-1 leading-none">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em]">Maps Pro</span>
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">v2.1.0</span>
          </div>
        </div>
      </div>

      {/* Admin Button */}
      <div className="flex items-center shrink-0">
        <button
          onClick={onAdminClick}
          title="Admin Settings"
          className="p-2.5 text-slate-400 hover:text-slate-900 transition-colors bg-slate-50 rounded-xl border border-slate-200 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </nav>
  );
};

export default TopNavBar;