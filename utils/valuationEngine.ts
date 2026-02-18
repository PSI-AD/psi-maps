
import { Project, Landmark } from '../types';

export interface ValuationResult {
  title: string;
  appreciation: string;
  yield: string;
  description: string;
  isPremium: boolean;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const deltaP = ((lat2 - lat1) * Math.PI) / 180;
  const deltaL = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaP / 2) * Math.sin(deltaP / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(deltaL / 2) * Math.sin(deltaL / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const calculateLandmarkPremium = (project: Project, landmarks: Landmark[]): ValuationResult => {
  let closestCultureDist = Infinity;
  let closestLeisureDist = Infinity;

  landmarks.forEach((landmark) => {
    const dist = calculateDistance(
      project.latitude,
      project.longitude,
      landmark.latitude,
      landmark.longitude
    );

    if (landmark.category === 'culture') {
      closestCultureDist = Math.min(closestCultureDist, dist);
    } else if (landmark.category === 'leisure') {
      closestLeisureDist = Math.min(closestLeisureDist, dist);
    }
  });

  if (closestCultureDist <= 1000) {
    return {
      title: "High Cultural Premium",
      appreciation: "+28% projected 3-year appreciation",
      yield: "9.4% short-term rental yield",
      description: "Exceptional proximity to the Cultural District and Louvre Abu Dhabi drives sustained capital growth.",
      isPremium: true
    };
  }

  if (closestLeisureDist <= 1000) {
    return {
      title: "Coastal Lifestyle Premium",
      appreciation: "+18% projected 3-year appreciation",
      yield: "7.2% annual rental yield",
      description: "Walking distance to Saadiyat's protected beaches and beach clubs ensures high desirability.",
      isPremium: true
    };
  }

  return {
    title: "Standard Island Yield",
    appreciation: "+12% projected 3-year appreciation",
    yield: "6.5% consistent annual yield",
    description: "Stable growth driven by the overall scarcity and prestige of Saadiyat Island real estate.",
    isPremium: false
  };
};
