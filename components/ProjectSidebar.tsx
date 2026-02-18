
import React, { useEffect, useState, useMemo } from 'react';
import { Project } from '../types';
import { getProjectInsights } from '../services/geminiService';
import { calculateLandmarkPremium } from '../utils/valuationEngine';
import { landmarks } from '../data/saadiyatLandmarks';
import RentVsBuyCalculator from './RentVsBuyCalculator';

interface ProjectSidebarProps {
  project: Project | null;
  onClose: () => void;
  onDiscoverNeighborhood: (lat: number, lng: number) => Promise<void>;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ project, onClose, onDiscoverNeighborhood }) => {
  const [insight, setInsight] = useState<string>('Generating AI Analysis...');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const valuation = useMemo(() => {
    if (!project) return null;
    return calculateLandmarkPremium(project, landmarks);
  }, [project]);

  // Helper to extract a baseline numeric price from strings like "AED 2.5M - 15M"
  const numericPrice = useMemo(() => {
    if (!project?.priceRange) return 2500000;
    const match = project.priceRange.match(/(\d+\.?\d*)/);
    const factor = project.priceRange.toLowerCase().includes('m') ? 1000000 : 1;
    return match ? parseFloat(match[1]) * factor : 2500000;
  }, [project]);

  useEffect(() => {
    if (project) {
      setLoadingInsight(true);
      setInsight('Analyzing investment data...');
      getProjectInsights(project).then((res) => {
        setInsight(res);
        setLoadingInsight(false);
      });
    }
  }, [project]);

  const handleDiscovery = async () => {
    if (!project) return;
    setIsDiscovering(true);
    // Mimic processing time for smoother UI transition
    await new Promise(r => setTimeout(r, 600));
    await onDiscoverNeighborhood(project.latitude, project.longitude);
    setIsDiscovering(false);
  };

  return (
    <div 
      className={`fixed top-0 right-0 h-full bg-white shadow-2xl transition-transform duration-500 ease-in-out z-50 w-full sm:w-[400px] border-l border-gray-100 flex flex-col ${
        project ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h2 className="font-bold text-gray-800 text-lg truncate pr-4">Property Details</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {project && (
        <div className="flex-1 overflow-y-auto">
          <div className="w-full h-56 overflow-hidden bg-gray-200">
            <img src={project.thumbnailUrl} alt={project.name} className="w-full h-full object-cover" />
          </div>

          <div className="p-6 space-y-6 pb-12">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  project.type === 'villa' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {project.type}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-500 text-sm font-medium">Saadiyat Island</span>
              </div>
              <h1 className="text-2xl font-black text-gray-900 leading-tight">{project.name}</h1>
              <p className="text-sm text-gray-500 mt-1 font-semibold italic">by {project.developerName}</p>
            </div>

            <button 
              onClick={handleDiscovery}
              disabled={isDiscovering}
              className={`
                w-full text-white font-black py-4 px-4 rounded-xl flex items-center justify-center space-x-3 transition-all
                uppercase text-xs tracking-widest relative overflow-hidden
                ${isDiscovering 
                  ? 'bg-indigo-800 cursor-not-allowed opacity-90' 
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl active:scale-95'}
              `}
            >
              {isDiscovering ? (
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
              <span>{isDiscovering ? 'Exploring Area...' : 'Discover Neighborhood'}</span>
            </button>

            {valuation && (
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
                    AI Valuation Insights
                  </h3>
                  {valuation.isPremium && (
                    <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                      Premium Locality
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-lg font-black text-gray-900 leading-none">{valuation.title}</p>
                    <p className="text-xs text-indigo-600 font-bold mt-1 uppercase tracking-wide">{valuation.appreciation}</p>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 bg-white p-3 rounded-xl border border-gray-100">
                    <span className="font-bold text-gray-900">{valuation.yield}</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-xs">{valuation.description}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Financial Analysis Section */}
            <RentVsBuyCalculator propertyPrice={numericPrice} />

            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <h3 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-2 flex items-center">
                AI Market Sentiment
              </h3>
              <p className={`text-sm text-gray-700 leading-relaxed italic ${loadingInsight ? 'animate-pulse' : ''}`}>
                "{insight}"
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Price Range</p>
                <p className="text-sm font-bold text-gray-800">{project.priceRange}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Status</p>
                <p className="text-sm font-bold text-gray-800">Available</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 border-t border-gray-100 space-y-3 bg-white">
        <a href={project?.projectUrl} target="_blank" rel="noopener noreferrer" className="w-full bg-gray-900 text-white font-black py-3 px-4 rounded-xl block text-center uppercase text-xs tracking-widest hover:bg-gray-800 transition-colors">
          Request Floor Plans
        </a>
      </div>
    </div>
  );
};

export default ProjectSidebar;
