import { describe, expect, it } from 'vitest';
import { distanceKm, hashString, spreadPoint } from '@/utils/map';

describe('hashString', () => {
  it('ist stabil und unterscheidet verschiedene Texte', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
  });
});

describe('spreadPoint', () => {
  const koeln = { lat: 50.94, lng: 6.96 };

  it('liefert fuer dieselbe ID immer dieselbe Position', () => {
    expect(spreadPoint('id-1', koeln.lat, koeln.lng)).toEqual(spreadPoint('id-1', koeln.lat, koeln.lng));
  });

  it('verschiebt um 400 m bis 2 km', () => {
    for (let i = 0; i < 200; i++) {
      const d = distanceKm(koeln, spreadPoint(`post-${i}`, koeln.lat, koeln.lng));
      expect(d).toBeGreaterThanOrEqual(0.39);
      expect(d).toBeLessThanOrEqual(2.01);
    }
  });

  it('verteilt Eintraege derselben Stadt auf verschiedene Punkte', () => {
    const a = spreadPoint('a', koeln.lat, koeln.lng);
    const b = spreadPoint('b', koeln.lat, koeln.lng);
    expect(distanceKm(a, b)).toBeGreaterThan(0.05);
  });
});

describe('distanceKm', () => {
  it('Koeln-Bonn ca. 25 km', () => {
    expect(distanceKm({ lat: 50.94, lng: 6.96 }, { lat: 50.737, lng: 7.098 })).toBeGreaterThan(23);
    expect(distanceKm({ lat: 50.94, lng: 6.96 }, { lat: 50.737, lng: 7.098 })).toBeLessThan(27);
  });
});
