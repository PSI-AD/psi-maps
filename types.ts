
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
}

export type LandmarkCategory = 'School' | 'Retail' | 'Culture' | 'Hospital';

export interface Landmark {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: LandmarkCategory;
  community: string;
  isHidden?: boolean;
  thumbnailUrl?: string;
}

export interface MapViewState {
  latitude: number;
  longitude: number;
  zoom: number;
}
