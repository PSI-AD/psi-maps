
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
}

export type LandmarkCategory = 'culture' | 'leisure' | 'school' | 'hotel' | 'retail';

export interface Landmark {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: LandmarkCategory;
  thumbnailUrl: string;
}

export interface MapViewState {
  latitude: number;
  longitude: number;
  zoom: number;
}
