import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getSport, sports } from '@/data/sports';

describe('sports', () => {
  it('hat eindeutige Schlüssel', () => {
    const keys = sports.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('unbekannte Sportart fällt auf "Sonstiges" zurück', () => {
    expect(getSport('quidditch').key).toBe('sonstiges');
    expect(getSport(null).key).toBe('sonstiges');
  });

  it('stimmt exakt mit der Datenbank-Regel (Migration 0009) überein', () => {
    const sql = readFileSync('supabase/migrations/0009_sport_meetups.sql', 'utf8');
    const match = sql.match(/groups_sport_check check \(sport in \(([^)]*)\)/);
    expect(match).not.toBeNull();
    const dbKeys = [...(match?.[1] ?? '').matchAll(/'([a-z]+)'/g)].map((m) => m[1]).sort();
    expect(sports.map((s) => s.key).sort()).toEqual(dbKeys);
  });
});
