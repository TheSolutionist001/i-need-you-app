// Auswahl fuer wiederkehrende Gruppentermine (muss zum DB-check 1..4 passen)
export const repeatOptions: { label: string; value: number | null }[] = [
  { label: 'Einmalig', value: null },
  { label: 'Jede Woche', value: 1 },
  { label: 'Alle 2 Wochen', value: 2 },
  { label: 'Alle 4 Wochen', value: 4 },
];
