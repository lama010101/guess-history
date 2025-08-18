export const normalize = (s: string) =>
  s
    .normalize('NFD')
    // Strip diacritics
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
