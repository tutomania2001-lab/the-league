// Format a display name with optional clan tag
export function withClanTag(name: string | null | undefined, tag: string | null | undefined): string {
  const n = name ?? 'Player';
  if (!tag) return n;
  return `[${tag.toUpperCase()}] ${n}`;
}
