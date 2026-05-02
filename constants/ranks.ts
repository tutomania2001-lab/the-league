export type Division = 'IV' | 'III' | 'II' | 'I';

export type Rank = {
  tier: string;
  division: Division | null;
  color: string;
  bgColor: string;
  icon: string;
  winsRequired: number;
  maxWins: number;
};

// Rank icon images — sourced from:
// - leagueoflegends.fandom.com (confirmed working URLs)
// - opgg-static.akamaized.net (same icons used in LoL/Wild Rift, used by op.gg, u.gg, etc.)
const RANK_ICONS: Record<string, string> = {
  Iron:        'https://opgg-static.akamaized.net/images/medals_new/iron.png',
  Bronze:      'https://opgg-static.akamaized.net/images/medals_new/bronze.png',
  Silver:      'https://static.wikia.nocookie.net/leagueoflegends/images/1/14/Silver_icon.png/revision/latest?cb=20190826122446',
  Gold:        'https://static.wikia.nocookie.net/leagueoflegends/images/2/2b/Gold_icon.png/revision/latest?cb=20240709154851',
  Platinum:    'https://opgg-static.akamaized.net/images/medals_new/platinum.png',
  Emerald:     'https://static.wikia.nocookie.net/leagueoflegends/images/5/53/Wild_Rift_Emerald_rank.png/revision/latest?cb=20200922063030',
  Diamond:     'https://opgg-static.akamaized.net/images/medals_new/diamond.png',
  Master:      'https://opgg-static.akamaized.net/images/medals_new/master.png',
  Grandmaster: 'https://opgg-static.akamaized.net/images/medals_new/grandmaster.png',
  Challenger:  'https://static.wikia.nocookie.net/leagueoflegends/images/c/cc/Challenger_icon.png/revision/latest?cb=20190825112411',
};

const TIERS = [
  { tier: 'Iron',        color: '#a8998a', bg: 'rgba(141,114,102,0.25)', start: 0,  noDivision: false },
  { tier: 'Bronze',      color: '#cd7f32', bg: 'rgba(205,127,50,0.25)',  start: 4,  noDivision: false },
  { tier: 'Silver',      color: '#c0c0c0', bg: 'rgba(192,192,192,0.25)', start: 8,  noDivision: false },
  { tier: 'Gold',        color: '#ffd700', bg: 'rgba(255,215,0,0.25)',   start: 12, noDivision: false },
  { tier: 'Platinum',    color: '#4db8ff', bg: 'rgba(77,184,255,0.25)',  start: 16, noDivision: false },
  { tier: 'Emerald',     color: '#50c878', bg: 'rgba(80,200,120,0.25)',  start: 20, noDivision: false },
  { tier: 'Diamond',     color: '#b9f2ff', bg: 'rgba(185,242,255,0.25)', start: 24, noDivision: false },
  { tier: 'Master',      color: '#9b59b6', bg: 'rgba(155,89,182,0.25)',  start: 28, noDivision: true  },
  { tier: 'Grandmaster', color: '#e74c3c', bg: 'rgba(231,76,60,0.25)',   start: 36, noDivision: true  },
  { tier: 'Challenger',  color: '#00c8ff', bg: 'rgba(0,200,255,0.25)',   start: 48, noDivision: true  },
];

const DIVISIONS: Division[] = ['IV', 'III', 'II', 'I'];

export function getRank(wins: number): Rank {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    const t = TIERS[i];
    if (wins >= t.start) {
      const next = TIERS[i + 1];
      if (t.noDivision) {
        return {
          tier: t.tier,
          division: null,
          color: t.color,
          bgColor: t.bg,
          icon: RANK_ICONS[t.tier],
          winsRequired: t.start,
          maxWins: next ? next.start : t.start + 20,
        };
      }
      const divIndex = Math.min(wins - t.start, 3);
      return {
        tier: t.tier,
        division: DIVISIONS[divIndex],
        color: t.color,
        bgColor: t.bg,
        icon: RANK_ICONS[t.tier],
        winsRequired: t.start + divIndex,
        maxWins: next ? next.start : t.start + 4,
      };
    }
  }
  return getRank(0);
}

export function getRankLabel(wins: number): string {
  const r = getRank(wins);
  return r.division ? `${r.tier} ${r.division}` : r.tier;
}

export function getProgressToNextRank(wins: number): number {
  const r = getRank(wins);
  const span = r.maxWins - r.winsRequired;
  if (span <= 0) return 1;
  return Math.min((wins - r.winsRequired) / span, 1);
}
