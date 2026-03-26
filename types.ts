
export type PropertyType = 'villa' | 'apartment';

export interface Project {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: PropertyType;
  thumbnailUrl: string;
  developerName: string;
  projectUrl: string;
  priceRange?: string;
  description?: string;
  // Extended Data
  images?: string[];
  bedrooms?: string | number;
  bathrooms?: string | number;
  builtupArea?: string | number;
  plotArea?: string | number;
  completionDate?: string;
  status?: string;
  amenities?: string[];
  city?: string;
  community?: string;
  subCommunity?: string;
  // Optimized media (written by batch-optimize.cjs)
  optimizedGallery?: { thumb: string; large: string }[];
  responsiveMedia?: { thumb: string; medium: string; large: string } | null;
  isHidden?: boolean;
  // Audit fields (written by audit-locations.cjs — never overwrite originals)
  auditLatitude?: number;
  auditLongitude?: number;
  auditDistanceMeters?: number;
  auditMapboxPlaceName?: string;
  auditStatus?: 'pending' | 'approved' | 'rejected';
  // ── Phase 1–3: Time-Based Map + Advanced Features ─────────────────────────
  constructionProgress?: ConstructionProgress;
  walkabilityScore?: WalkabilityScore;
  viewSimulation?: ViewSimulationEntry[];
  noiseLevel?: 'Quiet' | 'Moderate' | 'Busy' | 'Noisy';
  trafficDensity?: number; // 1–10 scale
  investmentStory?: InvestmentStory;
}

// ── Construction Progress Tracking ──────────────────────────────────────────
export interface ConstructionMilestone {
  label: string;
  targetDate: string;       // ISO date or "Q# YYYY"
  completedDate?: string;   // ISO date if completed
  status: 'completed' | 'in-progress' | 'upcoming' | 'delayed';
}

export interface MonthlySnapshot {
  month: string;        // "2024-01", "2025-03"
  percentComplete: number;
  imageUrl?: string;
  notes?: string;
}

export interface ConstructionProgress {
  overallPercent: number;
  milestones: ConstructionMilestone[];
  monthlySnapshots: MonthlySnapshot[];
  expectedCompletion: string;
  isOnSchedule: boolean;
}

// ── Walkability & Lifestyle Score ───────────────────────────────────────────
export interface WalkabilityScore {
  overall: number;    // 0–10
  schools: number;
  hospitals: number;
  dining: number;
  transit: number;
  parks: number;
  shopping: number;
}

// ── View Simulation ─────────────────────────────────────────────────────────
export interface ViewSimulationEntry {
  floor: number;
  floorLabel: string;            // "Floor 3", "Penthouse"
  viewType: 'city' | 'sea' | 'garden' | 'skyline' | 'mixed' | 'pool' | 'park';
  visibility: number;            // 0–100 score
  premium: string;               // "+5%", "+15%"
  imageUrl?: string;
}

// ── Investment Story Mode ───────────────────────────────────────────────────
export interface InvestmentStoryPhase {
  year: number;
  pricePerSqft: number;
  areaDescription: string;
  highlights: string[];
  imageUrl?: string;
}

export interface InvestmentStory {
  past: InvestmentStoryPhase;
  present: InvestmentStoryPhase;
  future: InvestmentStoryPhase;
}

// ── ROI / Future Value Zones ────────────────────────────────────────────────
export interface ROIZone {
  id: string;
  name: string;
  center: [number, number];       // [lng, lat]
  growthRate: number;             // annual % e.g. 12.5
  rating: 'Hot' | 'Warm' | 'Emerging' | 'Stable';
  color: string;                  // hex color
  radius?: number;                // km
}

export type LandmarkCategory = 'School' | 'Retail' | 'Culture' | 'Hospital' | 'Hotel' | 'Leisure' | 'Airport' | 'Port';

export interface Landmark {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: LandmarkCategory;
  community: string;
  city?: string;       // Optional city label (e.g. "Abu Dhabi", "Dubai")
  isHidden?: boolean;
  thumbnailUrl?: string;
  imageUrl?: string;   // Hero image URL for the LandmarkInfoModal
  images?: string[]; // Array for multiple slideshow images
  modelUrl?: string;   // URL to a .glb / .gltf 3D model file
  domain?: string;     // Brand domain for Clearbit logo (e.g. hilton.com)
  facts?: string[];    // Animated slide-facts shown in the LandmarkInfoModal
}

export interface MapViewState {
  latitude: number;
  longitude: number;
  zoom: number;
}

export interface ClientPresentation {
  id: string;
  title: string;
  projectIds: string[];
  intervalSeconds: number;
  createdAt: string;
}

export interface Developer {
  id?: string;
  name: string;
  logoUrl?: string;
  description?: string;
  website?: string;
  tags?: string[];
  isHidden?: boolean;
}

export interface Community {
  id?: string;
  name: string;
  city?: string;
  imageUrl?: string;
  description?: string;
  images?: string[];
  latitude?: number;
  longitude?: number;
  tags?: string[];
  placeId?: string;
  isHidden?: boolean;
}

export interface City {
  id?: string;
  name: string;
  country: string;
  isActive: boolean;
  isHidden?: boolean;
}
