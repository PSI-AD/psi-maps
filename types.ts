
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
}

export type LandmarkCategory = 'School' | 'Retail' | 'Culture' | 'Hospital' | 'Hotel' | 'Leisure' | 'Airport' | 'Port';

export interface Landmark {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: LandmarkCategory;
  community: string;
  isHidden?: boolean;
  thumbnailUrl?: string;
  modelUrl?: string; // URL to a .glb / .gltf 3D model file
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
