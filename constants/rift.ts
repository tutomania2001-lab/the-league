// HD Runeterra location artwork from the official League of Legends Universe CDN
// cmsassets.rgpub.io — Riot's official universe content delivery network

export const RIFT_IMAGES = [
  // Demacia — golden stone citadel
  'https://cmsassets.rgpub.io/sanity/images/dsfx7636/universe/5b80fe8ddd3d935c3f258f3e145b8aed4b7460bf-1920x887.jpg?accountingTag=LoL',
  // Noxus — dark iron empire
  'https://cmsassets.rgpub.io/sanity/images/dsfx7636/universe/6310fe5db818f80b84ee784a746cc28ee1273e6b-1920x1080.jpg?accountingTag=LoL',
  // Piltover — clockwork city of progress
  'https://cmsassets.rgpub.io/sanity/images/dsfx7636/universe/6c77423961def6e3a82d9a36545782f1a06386e0-4681x2114.jpg?accountingTag=LoL',
  // Freljord — frozen tundra
  'https://cmsassets.rgpub.io/sanity/images/dsfx7636/universe/ee60551d26850cfbff088f571bc5e1688b1a143b-2034x1080.jpg?accountingTag=LoL',
  // Bilgewater — pirate port city
  'https://cmsassets.rgpub.io/sanity/images/dsfx7636/universe/9700d7bf76ec15c8c526f7fea2a960e3846e44a6-2825x1080.jpg?accountingTag=LoL',
  // Shadow Isles — haunted ruined kingdom
  'https://cmsassets.rgpub.io/sanity/images/dsfx7636/universe/94e4bf2e1b30ba553b4fc0f93e94983837082210-2503x1080.jpg?accountingTag=LoL',
  // Demacia story art (wider)
  'https://cmsassets.rgpub.io/sanity/images/dsfx7636/universe/e542dbab1925ff2d1fdddaf60a8412b6095ee316-1920x1149.jpg?accountingTag=LoL',
  // Noxus story art
  'https://cmsassets.rgpub.io/sanity/images/dsfx7636/universe/e653368823aa1fbaf7955ce92bca15a81abc8440-1920x1190.jpg?accountingTag=LoL',
];

export const RIFT_REGION_NAMES = [
  'Demacia', 'Noxus', 'Piltover', 'Freljord', 'Bilgewater', 'Shadow Isles', 'Demacia', 'Noxus',
];

export function getRiftImage(index: number): string {
  return RIFT_IMAGES[index % RIFT_IMAGES.length];
}

export function getRiftRegion(index: number): string {
  return RIFT_REGION_NAMES[index % RIFT_REGION_NAMES.length];
}
