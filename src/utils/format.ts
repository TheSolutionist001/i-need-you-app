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

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function hhmm(d: Date): string {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Termin kurz: "Heute · 18:30", "Morgen · 9:00", "Sa · 10:00" (innerhalb einer
// Woche), sonst "12. Nov. · 18:00". Lokale Zeitzone des Geraets.
export function formatMeetup(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  if (sameDay(d, now)) return `Heute · ${hhmm(d)}`;
  if (sameDay(d, tomorrow)) return `Morgen · ${hhmm(d)}`;

  const diffDays = (d.getTime() - now.getTime()) / 86_400_000;
  if (diffDays > 0 && diffDays < 6) return `${WEEKDAYS[d.getDay()]} · ${hhmm(d)}`;

  const date = d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  return `${date} · ${hhmm(d)}`;
}

// Fuer die Kalender-Kachel: Wochentag (gross) und Tag des Monats.
export function meetupDayParts(iso: string): { weekday: string; day: number } {
  const d = new Date(iso);
  return { weekday: (WEEKDAYS[d.getDay()] ?? '').toUpperCase(), day: d.getDate() };
}

// Termin liegt heute oder in der Zukunft (vergangene Termine zaehlen nicht mehr).
export function isUpcoming(iso: string | null, now: Date = new Date()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getTime() >= now.getTime() - 2 * 3_600_000; // 2 Std. Kulanz (laeuft gerade)
}

// Kurze Entfernung fuer Plaketten: "ca. 3 km" / "< 1 km"
export function formatDistanceShort(meters: number | null): string | null {
  if (meters === null || meters === undefined) return null;
  const km = meters / 1000;
  return km < 1 ? '< 1 km' : `ca. ${Math.round(km)} km`;
}

// Wiederholung eines Gruppentermins: null = einmalig
export function formatRepeat(weeks: number | null | undefined): string | null {
  if (!weeks) return null;
  return weeks === 1 ? 'Jede Woche' : `Alle ${weeks} Wochen`;
}

// Restlaufzeit eines Gesuchs: "läuft heute ab", "noch 1 Tag", "noch 5 Tage"
export function formatExpiry(iso: string | null | undefined, now: Date = new Date()): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now.getTime();
  if (ms <= 0) return 'abgelaufen';
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return 'läuft heute ab';
  return days === 1 ? 'noch 1 Tag' : `noch ${days} Tage`;
}

// Zeit in Chats: heute nur Uhrzeit, gestern "gestern 18:30", sonst Datum + Uhrzeit
export function formatChatTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return hhmm(d);
  if (sameDay(d, yesterday)) return `gestern ${hhmm(d)}`;
  const date = d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  return `${date} ${hhmm(d)}`;
}
