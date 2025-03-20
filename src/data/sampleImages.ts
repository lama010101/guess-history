
import { HistoricalImage } from '@/types/game';

// Sample historical images
export const sampleImages: HistoricalImage[] = [
  {
    id: 1,
    src: 'https://images.unsplash.com/photo-1565711561500-49678a10a63f?q=80&w=2940&auto=format&fit=crop',
    year: 1950,
    location: { lat: 48.8584, lng: 2.2945 },
    description: 'Eiffel Tower, Paris'
  },
  {
    id: 2,
    src: 'https://images.unsplash.com/photo-1568797629192-789acf8e4df3?q=80&w=3174&auto=format&fit=crop',
    year: 1932,
    location: { lat: 40.7484, lng: -73.9857 },
    description: 'Empire State Building, New York'
  },
  {
    id: 3,
    src: 'https://images.unsplash.com/photo-1526711657229-e7e080961425?q=80&w=2832&auto=format&fit=crop',
    year: 1969,
    location: { lat: 37.8199, lng: -122.4783 },
    description: 'Golden Gate Bridge, San Francisco'
  }
];
