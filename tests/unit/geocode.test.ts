import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dedupe,
  featureToCity,
  featureToPlace,
  googleMapsDirectionsUrl,
  searchCities,
  searchPlaces,
  type PhotonFeature,
} from '@/utils/geocode';

function feature(props: PhotonFeature['properties'], lng = 6.96, lat = 50.94): PhotonFeature {
  return { geometry: { coordinates: [lng, lat] }, properties: props };
}

describe('featureToCity', () => {
  it('liest Name, Koordinaten (lat/lng vertauscht in GeoJSON) und Region', () => {
    const c = featureToCity(feature({ name: 'Köln', type: 'city', state: 'Nordrhein-Westfalen', country: 'Deutschland' }));
    expect(c).toEqual({ name: 'Köln', lat: 50.94, lng: 6.96, region: 'Nordrhein-Westfalen, Deutschland' });
  });

  it('wiederholt den Namen nicht bei Stadtstaaten', () => {
    const c = featureToCity(feature({ name: 'Berlin', type: 'city', state: 'Berlin', country: 'Deutschland' }));
    expect(c?.region).toBe('Deutschland');
  });

  it('verwirft Strassen, Haeuser und Treffer ohne Namen', () => {
    expect(featureToCity(feature({ name: 'Hauptstraße', type: 'street' }))).toBeNull();
    expect(featureToCity(feature({ type: 'city' }))).toBeNull();
  });
});

describe('featureToPlace', () => {
  it('baut Name und Adresse fuer einen Ort (z. B. Sporthalle)', () => {
    const p = featureToPlace(
      feature({ name: 'Soccerhalle', street: 'Musterweg', housenumber: '5', postcode: '50667', city: 'Köln' }),
    );
    expect(p).toEqual({ name: 'Soccerhalle', address: 'Musterweg 5, 50667 Köln', lat: 50.94, lng: 6.96, city: 'Köln' });
  });

  it('nutzt die Strasse als Name, wenn der Treffer eine reine Adresse ist', () => {
    const p = featureToPlace(feature({ street: 'Musterweg', housenumber: '5', postcode: '50667', city: 'Köln' }));
    expect(p?.name).toBe('Musterweg 5');
    expect(p?.address).toBe('50667 Köln');
  });

  it('liefert null ohne Name und Strasse', () => {
    expect(featureToPlace(feature({ city: 'Köln' }))).toBeNull();
  });
});

describe('dedupe', () => {
  it('entfernt Doppelte anhand des Schluessels und behaelt die Reihenfolge', () => {
    expect(dedupe(['a', 'b', 'a', 'c', 'b'], (x) => x)).toEqual(['a', 'b', 'c']);
  });
});

describe('googleMapsDirectionsUrl', () => {
  it('erzeugt einen Google-Maps-Routenlink zu den Koordinaten', () => {
    expect(googleMapsDirectionsUrl(50.9375, 6.9603)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=50.937500%2C6.960300',
    );
  });
});

describe('Suche (Photon)', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch(features: PhotonFeature[], ok = true) {
    const fn = vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 500, json: () => Promise.resolve({ features }) });
    vi.stubGlobal('fetch', fn);
    return fn;
  }

  it('searchCities fragt nur Orte ab und entfernt Doppelte', async () => {
    const fn = stubFetch([
      feature({ name: 'Köln', type: 'city', country: 'Deutschland' }),
      feature({ name: 'Köln', type: 'city', country: 'Deutschland' }),
      feature({ name: 'Kölner Str.', type: 'street' }),
    ]);
    const result = await searchCities('Köln');
    expect(result.map((c) => c.name)).toEqual(['Köln']);
    const url = new URL(fn.mock.calls[0]![0] as string);
    expect(url.searchParams.get('q')).toBe('Köln');
    expect(url.searchParams.get('layer')).toBe('city');
    expect(url.searchParams.get('lang')).toBe('de');
  });

  it('searchPlaces gewichtet auf den Wohnort', async () => {
    const fn = stubFetch([feature({ name: 'Soccerhalle', city: 'Köln' })]);
    const result = await searchPlaces('Soccerhalle', { lat: 50.9, lng: 6.9 });
    expect(result[0]?.name).toBe('Soccerhalle');
    const url = new URL(fn.mock.calls[0]![0] as string);
    expect(url.searchParams.get('lat')).toBe('50.9');
    expect(url.searchParams.get('lon')).toBe('6.9');
  });

  it('wirft bei einem Serverfehler', async () => {
    stubFetch([], false);
    await expect(searchCities('Köln')).rejects.toThrow();
  });
});
