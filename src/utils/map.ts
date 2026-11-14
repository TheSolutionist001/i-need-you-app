// Hilfsfunktionen fuer die Entdecken-Karte.

// Ein Marker auf der Karte (Gruppe oder Gesuch)
export interface MapItem {
  id: string;
  kind: 'group' | 'post';
  lat: number;
  lng: number;
  emoji: string;
  color: string; // Sportfarbe
}

// Einfacher, stabiler Hash (FNV-1a) - gleiche ID ergibt immer denselben Wert.
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Verteilt Marker leicht um ihre (Stadt-)Position, damit Gesuche und Gruppen
 * aus derselben Stadt nicht exakt uebereinander liegen.
 * Deterministisch: derselbe Eintrag landet immer an derselben Stelle (kein
 * "Springen" beim Nachladen). Abstand 400 m bis 2 km.
 * Hinweis: Die Position bleibt bewusst ungenau - sie zeigt nur "ungefaehr hier".
 */
export function spreadPoint(id: string, lat: number, lng: number): { lat: number; lng: number } {
  const h = hashString(id);
  const angle = ((h % 3600) / 3600) * 2 * Math.PI;
  const distanceKm = 0.4 + ((Math.floor(h / 3600) % 1000) / 1000) * 1.6;
  const dLat = (distanceKm / 111.32) * Math.cos(angle);
  const dLng = (distanceKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
  return { lat: lat + dLat, lng: lng + dLng };
}

// Abstand zweier Punkte in km (Haversine) - u. a. fuer Tests.
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
