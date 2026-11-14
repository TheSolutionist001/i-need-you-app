// Einfache Textsuche: alle eingegebenen Woerter muessen irgendwo vorkommen.
// Gross-/Kleinschreibung und Umlaut-Schreibweisen (ae/ä, ss/ß) egal.
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

export function matchesSearch(query: string | null | undefined, fields: (string | null | undefined)[]): boolean {
  const words = normalize(query ?? '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalize(fields.filter(Boolean).join(' '));
  return words.every((w) => haystack.includes(w));
}
