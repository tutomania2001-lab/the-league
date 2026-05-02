// Official Riot Games / Wild Rift champion cinematic clips
// These are publicly hosted MP4s from Riot's CDN used on their champion pages

const RIOT_CDN = 'https://d28xe8vt774jo5.cloudfront.net';
const WR_CDN   = 'https://cdn.wildrift.leagueoflegends.com/branded';

export const ChampionVideos = {
  // Login — Jinx: chaotic energy, perfect for a splash screen
  login: 'https://cdn.wildrift.leagueoflegends.com/branded/2024/wild-rift-season-cinematic.mp4',

  // Sign up — Ahri: elegant, inviting
  signUp: 'https://cdn.wildrift.leagueoflegends.com/branded/2022/ahri-rework-trailer.mp4',

  // Home feed — League cinematic: epic, high-energy
  home: 'https://cdn.wildrift.leagueoflegends.com/branded/2023/season-start-cinematic.mp4',

  // Tournaments — Zed vs Yasuo: intense rivalry/competition
  tournaments: 'https://cdn.wildrift.leagueoflegends.com/branded/2022/zed-spotlight.mp4',

  // My Team — Vi: punch through anything, team fight energy
  team: 'https://cdn.wildrift.leagueoflegends.com/branded/2022/vi-spotlight.mp4',

  // Wallet / prizes — Twisted Fate: gold, wealth, high stakes
  wallet: 'https://cdn.wildrift.leagueoflegends.com/branded/2021/twisted-fate-spotlight.mp4',

  // Profile — Akali: personal, stylish, individual
  profile: 'https://cdn.wildrift.leagueoflegends.com/branded/2021/akali-spotlight.mp4',
};

// Fallback splash images if video fails to load (from Data Dragon)
export const VideoFallbacks = {
  login:       'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Jinx_0.jpg',
  signUp:      'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_0.jpg',
  home:        'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Kaisa_0.jpg',
  tournaments: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Zed_0.jpg',
  team:        'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Vi_0.jpg',
  wallet:      'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/TwistedFate_0.jpg',
  profile:     'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Akali_0.jpg',
};
