import { describe, expect, it } from 'vitest';
import { formatChatTime, formatExpiry, formatRepeat } from '@/utils/format';

describe('formatRepeat', () => {
  it('einmalige Termine haben keinen Text', () => {
    expect(formatRepeat(null)).toBeNull();
    expect(formatRepeat(undefined)).toBeNull();
  });
  it('Wochen-Rhythmus', () => {
    expect(formatRepeat(1)).toBe('Jede Woche');
    expect(formatRepeat(2)).toBe('Alle 2 Wochen');
  });
});

describe('formatExpiry', () => {
  const now = new Date('2026-11-14T12:00:00Z');
  const inMs = (ms: number) => new Date(now.getTime() + ms).toISOString();
  const DAY = 86_400_000;
  it('Restlaufzeit in Tagen', () => {
    expect(formatExpiry(inMs(5 * DAY + 1000), now)).toBe('noch 5 Tage');
    expect(formatExpiry(inMs(DAY + 1000), now)).toBe('noch 1 Tag');
    expect(formatExpiry(inMs(3 * 3_600_000), now)).toBe('läuft heute ab');
  });
  it('vergangene Daten und fehlende Werte', () => {
    expect(formatExpiry(inMs(-1000), now)).toBe('abgelaufen');
    expect(formatExpiry(null, now)).toBeNull();
  });
});

describe('formatChatTime', () => {
  const now = new Date(2026, 10, 14, 15, 0);
  it('heute nur Uhrzeit, gestern mit Hinweis', () => {
    expect(formatChatTime(new Date(2026, 10, 14, 9, 5).toISOString(), now)).toBe('9:05');
    expect(formatChatTime(new Date(2026, 10, 13, 18, 30).toISOString(), now)).toBe('gestern 18:30');
  });
  it('ältere Nachrichten mit Datum', () => {
    expect(formatChatTime(new Date(2026, 10, 2, 8, 0).toISOString(), now)).toMatch(/^2\. Nov\.? 8:00$/);
  });
});
