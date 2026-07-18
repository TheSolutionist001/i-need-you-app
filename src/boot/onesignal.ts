import { defineBoot } from '#q-app';
import { initPush } from '@/utils/push';

// Laedt und initialisiert OneSignal beim App-Start. Ohne gesetzte App-ID
// passiert nichts (siehe utils/push.ts).
export default defineBoot(() => {
  initPush();
});
