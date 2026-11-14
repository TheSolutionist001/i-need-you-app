// Ortssuche ueber OpenStreetMap-Daten (Photon von Komoot, frei nutzbar ohne
// Konto/API-Schluessel). Wird nur beim Tippen in einem Suchfeld aufgerufen.
// Daten: (c) OpenStreetMap-Mitwirkende (ODbL) - Hinweis wird in der Auswahl angezeigt.

export const PHOTON_URL = 'https://photon.komoot.io/api/';

// Ort/Stadt fuer Profil, Gruppe, Gesuch (Koordinaten = Ortsmitte, also ungenau).
export interface City {
  name: string;
  lat: number;
  lng: number;
  region?: string | null; // z. B. "Nordrhein-Westfalen, Deutschland" (nur Anzeige)
}

// Konkreter Treffpunkt (Halle, Platz, Adresse).
export interface Place {
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  city?: string | null;
}

interface PhotonProperties {
  name?: string;
  street?: string;
  housenumber?: string;
  postcode?: string;
  city?: string;
  district?: string;
  locality?: string;
  county?: string;
  state?: string;
  country?: string;
  type?: string;
}

export interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: PhotonProperties;
}

const CITY_TYPES = new Set(['city', 'town', 'village', 'municipality', 'locality', 'district']);

function join(parts: (string | null | undefined)[], sep = ', '): string {
  return parts.filter((p) => !!p && p.trim()).join(sep);
}

export function featureToCity(f: PhotonFeature): City | null {
  const p = f.properties;
  const name = p.name?.trim();
  if (!name) return null;
  if (p.type && !CITY_TYPES.has(p.type)) return null;
  const [lng, lat] = f.geometry.coordinates;
  // Bei Bundeslaendern/Stadtstaaten nicht doppelt anzeigen ("Berlin, Berlin").
  const state = p.state && p.state !== name ? p.state : null;
  return { name, lat, lng, region: join([state, p.country]) || null };
}

export function featureToPlace(f: PhotonFeature): Place | null {
  const p = f.properties;
  const street = join([p.street, p.housenumber], ' ');
  const town = join([p.postcode, p.city ?? p.locality], ' ');
  const name = p.name?.trim() || street;
  if (!name) return null;
  const [lng, lat] = f.geometry.coordinates;
  // Adresse ohne Wiederholung des Namens (z. B. wenn der Treffer selbst eine Strasse ist).
  const address = join([street !== name ? street : null, town]) || null;
  return { name, address, lat, lng, city: p.city ?? p.locality ?? null };
}

// Doppelte Treffer (OSM fuehrt Orte oft als Punkt UND Flaeche) zusammenfassen.
export function dedupe<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function photon(params: Record<string, string>, signal?: AbortSignal): Promise<PhotonFeature[]> {
  const url = new URL(PHOTON_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.append(k, v);
  const res = await fetch(url.toString(), signal ? { signal } : {});
  if (!res.ok) throw new Error(`Ortssuche fehlgeschlagen (${res.status})`);
  const data = (await res.json()) as { features?: PhotonFeature[] };
  return data.features ?? [];
}

export async function searchCities(query: string, signal?: AbortSignal): Promise<City[]> {
  const features = await photon({ q: query, lang: 'de', limit: '10', layer: 'city' }, signal);
  const cities = features.map(featureToCity).filter((c): c is City => c !== null);
  return dedupe(cities, (c) => `${c.name}|${c.region ?? ''}`).slice(0, 8);
}

export async function searchPlaces(
  query: string,
  near?: { lat: number; lng: number } | null,
  signal?: AbortSignal,
): Promise<Place[]> {
  const params: Record<string, string> = { q: query, lang: 'de', limit: '10' };
  if (near) {
    // Treffer in der Naehe des eigenen Wohnorts bevorzugen.
    params.lat = String(near.lat);
    params.lon = String(near.lng);
  }
  const features = await photon(params, signal);
  const places = features.map(featureToPlace).filter((p): p is Place => p !== null);
  return dedupe(places, (p) => `${p.name}|${p.address ?? ''}`).slice(0, 8);
}

// Link, der Google Maps mit Routenplanung zum Ziel oeffnet (Web oder App).
// Reiner Link - kein API-Schluessel, keine Kosten, nichts wird vorab an Google gesendet.
export function googleMapsDirectionsUrl(lat: number, lng: number): string {
  const destination = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
