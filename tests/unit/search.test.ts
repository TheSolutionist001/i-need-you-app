import { describe, expect, it } from 'vitest';
import { matchesSearch } from '@/utils/search';

describe('matchesSearch', () => {
  it('leere Suche passt immer', () => {
    expect(matchesSearch('', ['x'])).toBe(true);
    expect(matchesSearch(null, ['x'])).toBe(true);
  });

  it('ignoriert Groß-/Kleinschreibung und Umlaut-Schreibweisen', () => {
    expect(matchesSearch('FUSSBALL', ['Fußball'])).toBe(true);
    expect(matchesSearch('koeln', [null, 'Köln'])).toBe(true);
  });

  it('alle Wörter müssen vorkommen', () => {
    expect(matchesSearch('kick köln', ['Feierabend-Kick', 'Köln'])).toBe(true);
    expect(matchesSearch('kick bonn', ['Feierabend-Kick', 'Köln'])).toBe(false);
  });
});
