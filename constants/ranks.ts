export type Division = 'IV' | 'III' | 'II' | 'I';

export type Rank = {
  tier: string;
  division: Division | null;
  color: string;
  bgColor: string;
  emoji: string;
  winsRequired: number;
  maxWins: number;
};

// Mirrors Wild Rift ranked system exactly
// Iron → Bronze → Silver → Gold → Platinum → Emerald → Diamond → Master → Grandmaster → Challenger
const TIERS = [
  { tier: 'Iron',        color: '#8d7266', bg: 'rgba(141,114,102,0.2)', emoji: '🪨', start: 0  },
  { tier: 'Bronze',      color: '#cd7f32', bg: 'rgba(205,127,50,0.2)',  emoji: '🥉', start: 4  },
  { tier: 'Silver',      color: '#c0c0c0', bg: 'rgba(192,192,192,0.2)', emoji: '🥈', start: 8  },
  { tier: 'Gold',        color: '#ffd700', bg: 'rgba(255,215,0,0.2)',   emoji: '🥇', start: 12 },
  { tier: 'Platinum',    color: '#4db8ff', bg: 'rgba(77,184,255,0.2)',  emoji: '💎', start: 16 },
  { tier: 'Emerald',     color: '#50c878', bg: 'rgba(80,200,120,0.2)',  emoji: '💚', start: 20 },
  { tier: 'Diamond',     color: '#b9f2ff', bg: 'rgba(185,242,255,0.2)', emoji: '🔷', start: 24 },
  { tier: 'Master',      color: '#9b59b6', bg: 'rgba(155,89,182,0.2)',  emoji: '🔮', start: 28, noDivision: true },
  { tier: 'Grandmaster', color: '#e74c3c', bg: 'rgba(231,76,60,0.2)',  emoji: '👑', start: 36, noDivision: true },
  { tier: 'Challenger',  color: '#00c8ff', bg: 'rgba(0,200,255,0.2)',   emoji: '⚡', start: 48, noDivision: true },
];

const DIVISIONS: Division[] = ['IV', 'III', 'II', 'I'];

export function getRank(wins: number): Rank {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    const t = TIERS[i];
    if (wins >= t.start) {
      if ((t as any).noDivision) {
        const next = TIERS[i + 1];
        return {
          tier: t.tier,
          division: null,
          color: t.color,
          bgColor: t.bg,
          emoji: t.emoji,
          winsRequired: t.start,
          maxWins: next ? next.start : t.start + 20,
        };
      }
      const divIndex = Math.min(wins - t.start, 3);
      const division = DIVISIONS[divIndex];
      const next = TIERS[i + 1];
      return {
        tier: t.tier,
        division,
        color: t.color,
        bgColor: t.bg,
        emoji: t.emoji,
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
