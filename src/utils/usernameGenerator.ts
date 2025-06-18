// List of adjectives and nouns to generate random usernames
const adjectives = [
  'Happy', 'Brave', 'Swift', 'Clever', 'Gentle', 'Witty', 'Noble', 'Proud',
  'Calm', 'Daring', 'Eager', 'Fair', 'Jolly', 'Kind', 'Lively', 'Mighty',
  'Pleasant', 'Proud', 'Silly', 'Wise', 'Zany', 'Adventurous', 'Bright',
  'Charming', 'Dazzling', 'Energetic', 'Friendly', 'Gleaming', 'Joyful', 'Lucky'
];

const nouns = [
  'Explorer', 'Adventurer', 'Traveler', 'Pioneer', 'Voyager', 'Navigator',
  'Discoverer', 'Wanderer', 'Globetrotter', 'Seeker', 'Pathfinder', 'Scout',
  'Pilgrim', 'Wayfarer', 'Rover', 'Nomad', 'Rambler', 'Roamer', 'Excursionist',
  'Journeyer', 'Vagabond', 'Globetrotter', 'Excursionist', 'Peregrinator',
  'Globester', 'Worldbeater', 'Globetrekker', 'Wanderluster', 'Worldly', 'Voyager'
];

// Generate a random username
// Format: Adjective + Noun + Random 3-digit number (e.g., HappyExplorer123)
export function generateRandomUsername(): string {
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNum = Math.floor(100 + Math.random() * 900); // 3-digit number
  
  return `${randomAdjective}${randomNoun}${randomNum}`.replace(/\s+/g, '');
}

// Validate username format
export function isValidUsername(username: string): boolean {
  // 3-20 characters, alphanumeric, underscores and hyphens allowed
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username);
}
