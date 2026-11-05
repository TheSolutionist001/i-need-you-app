import { describe, expect, it } from 'vitest';
import { findCity, germanCities } from '@/data/german-cities';

describe('findCity', () => {
  it('findet Städte unabhängig von Groß-/Kleinschreibung und Leerzeichen', () => {
    expect(findCity('Köln')?.name).toBe('Köln');
    expect(findCity('  köln ')?.name).toBe('Köln');
    expect(findCity('FRANKFURT (ODER)')?.name).toBe('Frankfurt (Oder)');
  });

  it('erkennt Umlaut-Ersatzschreibweisen bewusst nicht (bekannte Grenze)', () => {
    expect(findCity('Koeln')).toBeUndefined();
  });

  it('leere Eingaben ergeben nichts', () => {
    expect(findCity(null)).toBeUndefined();
    expect(findCity(undefined)).toBeUndefined();
    expect(findCity('')).toBeUndefined();
  });
});

describe('germanCities (Datenqualität)', () => {
  it('jeder Name kommt nur einmal vor', () => {
    const names = germanCities.map((c) => c.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('alle Koordinaten liegen in Deutschland', () => {
    for (const c of germanCities) {
      expect(c.lat, c.name).toBeGreaterThan(47.2);
      expect(c.lat, c.name).toBeLessThan(55.1);
      expect(c.lng, c.name).toBeGreaterThan(5.8);
      expect(c.lng, c.name).toBeLessThan(15.1);
    }
  });
});
