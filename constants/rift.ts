// HD Wild Rift / Summoner's Rift map images for tournament thumbnails
// Using champion splash arts with map/environment themes as reliable fallback
export const RIFT_IMAGES = [
  // Wild Rift promotional art (map visible)
  'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Kaisa_0.jpg',
  'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Thresh_0.jpg',
  'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Graves_0.jpg',
  'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Vi_0.jpg',
  'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Jinx_0.jpg',
  'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Zed_0.jpg',
  'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_0.jpg',
  'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Yasuo_0.jpg',
];

export function getRiftImage(index: number): string {
  return RIFT_IMAGES[index % RIFT_IMAGES.length];
}
