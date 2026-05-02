export type Division = 'IV' | 'III' | 'II' | 'I';

export type RankInfo = {
  tier: string;
  division: Division | null;
  divisionLP: number;      // LP within current division (0-99)
  totalLP: number;         // cumulative LP
  color: string;
  bgColor: string;
  icon: string;
  nextThreshold: number;   // total LP needed to reach next division
  prevThreshold: number;   // total LP at start of current division
};

// LP per division: 100 LP = promotion
// Iron IV starts at 0 LP, each division = 100 LP
// Iron: 0-399, Bronze: 400-799, Silver: 800-1199
// Gold: 1200-1599, Platinum: 1600-1999, Emerald: 2000-2399
// Diamond: 2400-2799, Master: 2800-3599, Grandmaster: 3600-4799, Challenger: 4800+

const LP_PER_WIN  =  20;
const LP_PER_LOSS = -15;

const TIERS = [
  { tier: 'Iron',        color: '#a8998a', bg: 'rgba(141,114,102,0.25)', startLP: 0,    noDivision: false },
  { tier: 'Bronze',      color: '#cd7f32', bg: 'rgba(205,127,50,0.25)',  startLP: 400,  noDivision: false },
  { tier: 'Silver',      color: '#c0c0c0', bg: 'rgba(192,192,192,0.25)', startLP: 800,  noDivision: false },
  { tier: 'Gold',        color: '#ffd700', bg: 'rgba(255,215,0,0.25)',   startLP: 1200, noDivision: false },
  { tier: 'Platinum',    color: '#4db8ff', bg: 'rgba(77,184,255,0.25)',  startLP: 1600, noDivision: false },
  { tier: 'Emerald',     color: '#50c878', bg: 'rgba(80,200,120,0.25)',  startLP: 2000, noDivision: false },
  { tier: 'Diamond',     color: '#b9f2ff', bg: 'rgba(185,242,255,0.25)', startLP: 2400, noDivision: false },
  { tier: 'Master',      color: '#9b59b6', bg: 'rgba(155,89,182,0.25)',  startLP: 2800, noDivision: true  },
  { tier: 'Grandmaster', color: '#e74c3c', bg: 'rgba(231,76,60,0.25)',   startLP: 3600, noDivision: true  },
  { tier: 'Challenger',  color: '#00c8ff', bg: 'rgba(0,200,255,0.25)',   startLP: 4800, noDivision: true  },
];

const DIVISIONS: Division[] = ['IV', 'III', 'II', 'I'];

const ICONS: Record<string, string> = {
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

export function getRankFromLP(totalLP: number): RankInfo {
  const clampedLP = Math.max(0, totalLP);

  for (let i = TIERS.length - 1; i >= 0; i--) {
    const t = TIERS[i];
    if (clampedLP >= t.startLP) {
      const next = TIERS[i + 1];

      if (t.noDivision) {
        return {
          tier: t.tier,
          division: null,
          divisionLP: clampedLP - t.startLP,
          totalLP: clampedLP,
          color: t.color,
          bgColor: t.bg,
          icon: ICONS[t.tier],
          prevThreshold: t.startLP,
          nextThreshold: next ? next.startLP : t.startLP + 800,
        };
      }

      // Which division within the tier (IV, III, II, I)
      const lpInTier = clampedLP - t.startLP;
      const divIndex = Math.min(Math.floor(lpInTier / 100), 3);
      const divisionLP = lpInTier % 100;
      const divStartLP = t.startLP + divIndex * 100;
      const divEndLP = divStartLP + 100;

      return {
        tier: t.tier,
        division: DIVISIONS[divIndex],
        divisionLP,
        totalLP: clampedLP,
        color: t.color,
        bgColor: t.bg,
        icon: ICONS[t.tier],
        prevThreshold: divStartLP,
        nextThreshold: divEndLP,
      };
    }
  }
  return getRankFromLP(0);
}

export function getRankLabel(lp: number): string {
  const r = getRankFromLP(lp);
  return r.division ? `${r.tier} ${r.division}` : r.tier;
}

export function getLPProgress(lp: number): number {
  const r = getRankFromLP(lp);
  const span = r.nextThreshold - r.prevThreshold;
  if (span <= 0) return 1;
  return Math.min((lp - r.prevThreshold) / span, 1);
}

// Convert tournament results to LP
export function calculateLP(wins: number, losses: number): number {
  return Math.max(0, wins * LP_PER_WIN + losses * LP_PER_LOSS);
}

export { LP_PER_WIN, LP_PER_LOSS };
