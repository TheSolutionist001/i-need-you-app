// Anzeige-Formatierungen (Deutsch). Bewusst ohne Abhaengigkeiten, damit sie
// einfach testbar sind.

// Entfernung ungenau anzeigen (Privatsphaere): nie Meter, immer gerundete km.
export function formatDistance(meters: number): string {
  const km = meters / 1000;
  return km < 1 ? 'unter 1 km entfernt' : `ca. ${Math.round(km)} km entfernt`;
}

// Relative Zeitangabe wie "vor 2 Std." – aeltere Eintraege mit Datum.
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffMin < 1) return 'gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min.`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `vor ${diffHours} Std.`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'gestern';
  if (diffDays < 7) return `vor ${diffDays} Tagen`;

  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}
