import { describe, expect, it } from 'vitest';
import { formatDistance, formatRelativeTime } from '@/utils/format';

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
