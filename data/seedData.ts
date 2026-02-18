
import { Project, Landmark } from '../types';

export const projectsData: Project[] = [
  {
    id: "saad-1",
    name: "Mamsha Al Saadiyat",
    latitude: 24.5385,
    longitude: 54.4320,
    type: "apartment",
    thumbnailUrl: "https://images.unsplash.com/photo-1600607687969-b6139b5f40bb?auto=format&fit=crop&w=1200&q=80",
    developerName: "Aldar Properties",
    projectUrl: "https://www.psinv.net/en/projects/abu-dhabi/saadiyat-island/mamsha-al-saadiyat/",
    priceRange: "AED 2.5M - 15M",
    description: "Beachfront residences offering a vibrant lifestyle with direct access to a 1.4km white-sand beach and the Soul Beach club."
  },
  {
    id: "saad-2",
    name: "Saadiyat Lagoons",
    latitude: 24.5450,
    longitude: 54.4550,
    type: "villa",
    thumbnailUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
    developerName: "Aldar Properties",
    projectUrl: "https://www.psinv.net/en/projects/abu-dhabi/saadiyat-island/saadiyat-lagoons/",
    priceRange: "AED 6.1M - 12.5M",
    description: "Sustainable villa living surrounded by mangroves and wilderness. Designed for families seeking a connection with nature."
  },
  {
    id: "saad-3",
    name: "Louvre Abu Dhabi Residences",
    latitude: 24.5345,
    longitude: 54.3985,
    type: "apartment",
    thumbnailUrl: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80",
    developerName: "Aldar Properties",
    projectUrl: "https://www.psinv.net/en/projects/abu-dhabi/saadiyat-island/louvre-abu-dhabi-residences/",
    priceRange: "AED 1.8M - 18M",
    description: "An ultra-luxury development inspired by art and culture, offering residents exclusive access to the Louvre Abu Dhabi lifestyle."
  },
  {
    id: "saad-4",
    name: "Nudra",
    latitude: 24.5480,
    longitude: 54.4420,
    type: "villa",
    thumbnailUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    developerName: "IMKAN",
    projectUrl: "https://www.psinv.net/en/projects/abu-dhabi/saadiyat-island/nudra/",
    priceRange: "AED 8M - 25M",
    description: "An exclusive beachfront community of only 37 villas, where residents can design their own 'Shell and Core' interiors."
  },
  {
    id: "saad-5",
    name: "Soho Square",
    latitude: 24.5310,
    longitude: 54.4180,
    type: "apartment",
    thumbnailUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    developerName: "Bloom Holding",
    projectUrl: "https://www.psinv.net/en/projects/abu-dhabi/saadiyat-island/soho-square/",
    priceRange: "AED 800k - 4.5M",
    description: "Modern urban living inspired by the Soho district of New York, featuring creative spaces and artistic vibes."
  },
  {
    id: "saad-6",
    name: "The Source",
    latitude: 24.5420,
    longitude: 54.4150,
    type: "apartment",
    thumbnailUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
    developerName: "Aldar Properties",
    projectUrl: "https://www.psinv.net/en/projects/abu-dhabi/saadiyat-island/the-source/",
    priceRange: "AED 2.3M - 9.5M",
    description: "A wellness-centric residential community located in the heart of Saadiyat’s Cultural District."
  },
  {
    id: "saad-7",
    name: "Park View",
    latitude: 24.5320,
    longitude: 54.4210,
    type: "apartment",
    thumbnailUrl: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80",
    developerName: "Bloom Holding",
    projectUrl: "https://www.psinv.net/en/projects/abu-dhabi/saadiyat-island/park-view/",
    priceRange: "AED 900k - 5M",
    description: "A strategic mixed-use development across from NYU Abu Dhabi, popular with students and young professionals."
  },
  {
    id: "saad-8",
    name: "Jawaher Saadiyat",
    latitude: 24.5470,
    longitude: 54.4250,
    type: "villa",
    thumbnailUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
    developerName: "Aldar Properties",
    projectUrl: "https://www.psinv.net/en/projects/abu-dhabi/saadiyat-island/jawaher-saadiyat/",
    priceRange: "AED 10M - 30M",
    description: "Modern gated community offering 4 to 6-bedroom villas with premium views of the golf course and the sea."
  }
];

export const amenitiesData: Landmark[] = [
  // Schools
  { id: "am-1", name: "Cranleigh Abu Dhabi", latitude: 24.5440, longitude: 54.4180, category: "school", thumbnailUrl: "https://picsum.photos/seed/cranleigh/400/300" },
  { id: "am-2", name: "Redwood Montessori Nursery", latitude: 24.5380, longitude: 54.4250, category: "school", thumbnailUrl: "https://picsum.photos/seed/redwood/400/300" },
  
  // Hotels
  { id: "am-3", name: "The St. Regis Saadiyat Island", latitude: 24.5420, longitude: 54.4350, category: "hotel", thumbnailUrl: "https://picsum.photos/seed/stregis/400/300" },
  { id: "am-4", name: "Park Hyatt Abu Dhabi", latitude: 24.5480, longitude: 54.4450, category: "hotel", thumbnailUrl: "https://picsum.photos/seed/parkhyatt/400/300" },
  { id: "am-5", name: "Jumeirah at Saadiyat Island", latitude: 24.5520, longitude: 54.4650, category: "hotel", thumbnailUrl: "https://picsum.photos/seed/jumeirah/400/300" },

  // Culture
  { id: "am-6", name: "Louvre Abu Dhabi", latitude: 24.5337, longitude: 54.3982, category: "culture", thumbnailUrl: "https://picsum.photos/seed/louvre/400/300" },
  { id: "am-7", name: "Manarat Al Saadiyat", latitude: 24.5323, longitude: 54.4035, category: "culture", thumbnailUrl: "https://picsum.photos/seed/manarat/400/300" },
  { id: "am-8", name: "Abrahamic Family House", latitude: 24.5348, longitude: 54.4048, category: "culture", thumbnailUrl: "https://picsum.photos/seed/abrahamic/400/300" },

  // Leisure
  { id: "am-9", name: "Saadiyat Beach Club", latitude: 24.5461, longitude: 54.4345, category: "leisure", thumbnailUrl: "https://picsum.photos/seed/beachclub/400/300" },
  { id: "am-10", name: "Saadiyat Beach Golf Club", latitude: 24.5447, longitude: 54.4285, category: "leisure", thumbnailUrl: "https://picsum.photos/seed/golf/400/300" },

  // Retail
  { id: "am-11", name: "Waitrose Saadiyat (The Collection)", latitude: 24.5385, longitude: 54.4320, category: "retail", thumbnailUrl: "https://picsum.photos/seed/waitrose/400/300" },
  { id: "am-12", name: "Saadiyat Grove", latitude: 24.5350, longitude: 54.4050, category: "retail", thumbnailUrl: "https://picsum.photos/seed/grove/400/300" }
];
