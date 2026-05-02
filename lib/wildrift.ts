import * as Linking from 'expo-linking';

export function buildLobbyDeepLink(lobbyCode: string, password?: string): string {
  const base = `wildrift://lobby?code=${encodeURIComponent(lobbyCode)}`;
  return password ? `${base}&password=${encodeURIComponent(password)}` : base;
}

export async function launchWildRiftLobby(lobbyCode: string, password?: string): Promise<boolean> {
  const url = buildLobbyDeepLink(lobbyCode, password);
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) { await Linking.openURL(url); return true; }
  // Fallback: open App Store / Play Store listing
  await Linking.openURL('https://wildrift.leagueoflegends.com/');
  return false;
}

export function generateLobbyCode(matchId: string): string {
  return `TL-${matchId.slice(0, 6).toUpperCase()}`;
}

export function generateLobbyPassword(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}
