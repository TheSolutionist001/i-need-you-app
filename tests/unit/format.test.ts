import { describe, expect, it } from 'vitest';
import {
  formatDistance,
  formatDistanceShort,
  formatMeetup,
  formatRelativeTime,
  isUpcoming,
  meetupDayParts,
} from '@/utils/format';

describe('formatDistance', () => {
  it('zeigt unter 1 km nie Meter (Privatsphäre)', () => {
    expect(formatDistance(0)).toBe('unter 1 km entfernt');
    expect(formatDistance(999)).toBe('unter 1 km entfernt');
  });

  it('rundet auf ganze Kilometer', () => {
    expect(formatDistance(1000)).toBe('ca. 1 km entfernt');
    expect(formatDistance(2300)).toBe('ca. 2 km entfernt');
    expect(formatDistance(2600)).toBe('ca. 3 km entfernt');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-11-05T12:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it('sehr frische Einträge', () => {
    expect(formatRelativeTime(ago(10_000), now)).toBe('gerade eben');
  });

  it('Minuten und Stunden', () => {
    expect(formatRelativeTime(ago(5 * MIN), now)).toBe('vor 5 Min.');
    expect(formatRelativeTime(ago(59 * MIN), now)).toBe('vor 59 Min.');
    expect(formatRelativeTime(ago(2 * HOUR), now)).toBe('vor 2 Std.');
    expect(formatRelativeTime(ago(23 * HOUR), now)).toBe('vor 23 Std.');
  });

  it('Tage', () => {
    expect(formatRelativeTime(ago(DAY + HOUR), now)).toBe('gestern');
    expect(formatRelativeTime(ago(3 * DAY), now)).toBe('vor 3 Tagen');
  });

  it('ab einer Woche mit Datum', () => {
    expect(formatRelativeTime(ago(10 * DAY), now)).toMatch(/^26\. Okt/);
  });

  it('Uhren leicht vorgehend (Zeit in der Zukunft) gilt als "gerade eben"', () => {
    expect(formatRelativeTime(ago(-30_000), now)).toBe('gerade eben');
  });
});

describe('formatMeetup', () => {
  // Lokale Zeit (Testumgebung kann jede Zeitzone haben)
  const now = new Date(2026, 10, 9, 12, 0); // Mo, 9. Nov 2026, 12:00

  it('heute und morgen', () => {
    expect(formatMeetup(new Date(2026, 10, 9, 18, 30).toISOString(), now)).toBe('Heute · 18:30');
    expect(formatMeetup(new Date(2026, 10, 10, 9, 5).toISOString(), now)).toBe('Morgen · 9:05');
  });

  it('innerhalb der Woche mit Wochentag', () => {
    expect(formatMeetup(new Date(2026, 10, 14, 10, 0).toISOString(), now)).toBe('Sa · 10:00');
  });

  it('weiter weg mit Datum', () => {
    expect(formatMeetup(new Date(2026, 10, 30, 18, 0).toISOString(), now)).toMatch(/^30\. Nov\.? · 18:00$/);
  });
});

describe('isUpcoming / meetupDayParts / formatDistanceShort', () => {
  const now = new Date(2026, 10, 9, 12, 0);

  it('vergangene Termine zählen nicht (2 Std. Kulanz)', () => {
    expect(isUpcoming(null, now)).toBe(false);
    expect(isUpcoming(new Date(2026, 10, 9, 11, 0).toISOString(), now)).toBe(true);
    expect(isUpcoming(new Date(2026, 10, 8, 12, 0).toISOString(), now)).toBe(false);
  });

  it('Kalender-Kachel', () => {
    expect(meetupDayParts(new Date(2026, 10, 10, 18, 0).toISOString())).toEqual({ weekday: 'DI', day: 10 });
  });

  it('kurze Entfernung, nie Meter', () => {
    expect(formatDistanceShort(null)).toBeNull();
    expect(formatDistanceShort(400)).toBe('< 1 km');
    expect(formatDistanceShort(2600)).toBe('ca. 3 km');
  });
});
