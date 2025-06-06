
/**
 * Placeholder data for mock results when real data isn't available
 */

// Default placeholder images to match those in useGameImages hook
export const PLACEHOLDER_IMAGES = [
  {
    id: 'placeholder_1',
    title: 'Eiffel Tower Construction',
    description: 'The Eiffel Tower nearing completion for the 1889 World\'s Fair in Paris. Initially controversial, it later became one of the world\'s most iconic landmarks.',
    image_url: 'https://source.unsplash.com/random/?eiffel+tower,paris,historical',
    year: 1889,
    latitude: 48.8584,
    longitude: 2.2945,
    location_name: 'Paris, France'
  },
  {
    id: 'placeholder_2',
    title: 'Berlin Wall',
    description: 'The Berlin Wall was a guarded concrete barrier that physically and ideologically divided Berlin from 1961 to 1989.',
    image_url: 'https://source.unsplash.com/random/?berlin+wall,historical',
    year: 1961,
    latitude: 52.5163,
    longitude: 13.3777,
    location_name: 'Berlin, Germany'
  },
  {
    id: 'placeholder_3',
    title: 'Golden Gate Bridge Opening',
    description: 'The Golden Gate Bridge opened to the public in 1937 after four years of construction. It was the longest suspension bridge span in the world at the time.',
    image_url: 'https://source.unsplash.com/random/?golden+gate+bridge,historical',
    year: 1937,
    latitude: 37.8199,
    longitude: -122.4783,
    location_name: 'San Francisco, USA'
  },
  {
    id: 'placeholder_4',
    title: 'Great Wall of China',
    description: 'The Great Wall of China was built over centuries to protect Chinese states and empires from nomadic groups.',
    image_url: 'https://source.unsplash.com/random/?great+wall+china,historical',
    year: 1644,
    latitude: 40.4319,
    longitude: 116.5704,
    location_name: 'Beijing, China'
  },
  {
    id: 'placeholder_5',
    title: 'Statue of Liberty',
    description: 'The Statue of Liberty was dedicated in 1886 and was a gift to the United States from the people of France.',
    image_url: 'https://source.unsplash.com/random/?statue+liberty,historical',
    year: 1886,
    latitude: 40.6892,
    longitude: -74.0445,
    location_name: 'New York, USA'
  },
];

// Function to find a placeholder image by ID
export function findPlaceholderImageById(id: string) {
  return PLACEHOLDER_IMAGES.find(img => img.id === id);
}

// Generate unique mock image IDs when needed
export function generateMockImageIds(count: number): string[] {
  console.log(`Generating ${count} mock image IDs`);
  return Array.from({ length: count }, (_, i) => `mock_${Date.now()}_${i}`);
}

// Generate a plausible placeholder guess for an image
export function generatePlaceholderGuess(imageData: any) {
  // Create a guess that's somewhat close to the correct answer
  const yearDiff = Math.floor(Math.random() * 20) - 10; // +/- 10 years
  const latDiff = (Math.random() * 3) - 1.5; // +/- 1.5 degrees
  const lonDiff = (Math.random() * 3) - 1.5; // +/- 1.5 degrees
  
  return {
    guess_year: imageData.year + yearDiff,
    guess_lat: imageData.latitude + latDiff,
    guess_lon: imageData.longitude + lonDiff
  };
}
