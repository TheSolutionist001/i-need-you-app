// Sportarten (muessen mit dem check-Constraint in 0009_sport_meetups.sql
// uebereinstimmen). Emoji + Farbverlauf ersetzen vorerst echte Fotos.
export interface Sport {
  key: string;
  label: string;
  emoji: string;
  // Farbverlauf fuer Bildkarten (von hell nach dunkel)
  from: string;
  to: string;
}

export const sports: Sport[] = [
  { key: 'fussball', label: 'Fußball', emoji: '⚽', from: '#ff5a1f', to: '#5b1d06' },
  { key: 'laufen', label: 'Laufen', emoji: '🏃', from: '#5aa9ff', to: '#1e3a8a' },
  { key: 'wandern', label: 'Wandern', emoji: '🥾', from: '#3ccf7c', to: '#0f5132' },
  { key: 'radfahren', label: 'Radfahren', emoji: '🚴', from: '#ffb020', to: '#7c4a03' },
  { key: 'tennis', label: 'Tennis', emoji: '🎾', from: '#c6e94a', to: '#3f5a0c' },
  { key: 'volleyball', label: 'Volleyball', emoji: '🏐', from: '#38bdf8', to: '#0c4a6e' },
  { key: 'basketball', label: 'Basketball', emoji: '🏀', from: '#fb923c', to: '#7c2d12' },
  { key: 'fitness', label: 'Fitness', emoji: '💪', from: '#f472b6', to: '#831843' },
  { key: 'schwimmen', label: 'Schwimmen', emoji: '🏊', from: '#22d3ee', to: '#164e63' },
  { key: 'yoga', label: 'Yoga', emoji: '🧘', from: '#a78bfa', to: '#4c1d95' },
  { key: 'klettern', label: 'Klettern', emoji: '🧗', from: '#d6a36a', to: '#5b3a17' },
  { key: 'sonstiges', label: 'Sonstiges', emoji: '✨', from: '#a8a196', to: '#3a362e' },
];

const fallback = sports[sports.length - 1] as Sport;

export function getSport(key: string | null | undefined): Sport {
  return sports.find((s) => s.key === key) ?? fallback;
}

// CSS-Hintergrund fuer eine Bildkarte
export function sportGradient(key: string | null | undefined): string {
  const s = getSport(key);
  return `linear-gradient(135deg, ${s.from} 0%, ${s.to} 100%)`;
}
