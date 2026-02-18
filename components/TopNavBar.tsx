
import React from 'react';

interface TopNavBarProps {
  onAdminClick?: () => void;
}

const TopNavBar: React.FC<TopNavBarProps> = ({ onAdminClick }) => {
  return (
    <nav className="fixed top-0 left-0 w-full h-20 bg-white shadow-[0_2px_15px_rgba(0,0,0,0.05)] z-[4000] flex items-center px-4 md:px-6 gap-3 md:gap-6 border-b border-gray-100">
      {/* PSI Brand Logo - Luxury Identity */}
      <div className="flex items-center space-x-3 pr-3 md:pr-6 border-r border-gray-100 shrink-0">
        <div className="w-11 h-11 relative flex items-center justify-center">
          <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Elegant Map Pin Base - Navy & Gold */}
            <path d="M50 115C50 115 92 72 92 46C92 22.804 73.196 4 50 4C26.804 4 8 22.804 8 46C8 72 50 115 50 115Z" fill="#0F172A" stroke="#D4AF37" strokeWidth="2.5"/>
            {/* PSI Monogram Text Inside Pin */}
            <text 
              x="50" 
              y="58" 
              fill="#D4AF37" 
              fontFamily="system-ui, -apple-system, sans-serif" 
              fontWeight="900" 
              fontSize="24" 
              textAnchor="middle" 
              style={{ letterSpacing: '-1px' }}
            >
              PSI
            </text>
            {/* Stylized Accent Ring */}
            <circle cx="50" cy="46" r="32" stroke="#D4AF37" strokeWidth="1" strokeDasharray="4 2" opacity="0.3" />
          </svg>
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none block">PSI</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-0.5 leading-none">Explorer</span>
        </div>
      </div>

      {/* Main Search Area */}
      <div className="flex-1 flex items-center gap-2 md:gap-3 max-w-5xl mx-auto h-12 bg-gray-50 rounded-2xl px-3 md:px-4 border border-gray-100 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-200">
        <div className="flex items-center flex-1 gap-2 md:gap-3 overflow-hidden">
          <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="City, community or project name" 
            className="bg-transparent w-full text-sm font-medium text-slate-700 placeholder:text-transparent md:placeholder:text-slate-400 outline-none"
          />
        </div>

        <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

        {/* Filters Dropdowns */}
        <div className="hidden lg:flex items-center gap-6 px-2">
          <div className="relative group cursor-pointer">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Type</span>
              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>

          <div className="relative group cursor-pointer">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Status</span>
              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
        </div>

        <button className="bg-blue-700 hover:bg-blue-800 text-white px-4 md:px-8 py-2.5 rounded-xl transition-all shadow-md shadow-blue-100 shrink-0 active:scale-95 flex items-center justify-center">
          <span className="hidden md:inline text-xs font-black uppercase tracking-[0.15em]">Search</span>
          <svg className="w-5 h-5 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {/* Quick Links / Profile */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        <button 
          onClick={onAdminClick}
          title="Admin Settings"
          className="p-2.5 text-slate-400 hover:text-slate-900 transition-colors bg-slate-50 rounded-xl border border-slate-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <button className="hidden md:flex p-2 text-slate-400 hover:text-blue-700 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
        <div className="w-10 h-10 rounded-full bg-slate-100 border border-gray-100 overflow-hidden flex items-center justify-center">
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </div>
    </nav>
  );
};

export default TopNavBar;
