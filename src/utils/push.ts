// Kapselt OneSignal. Ist keine App-ID gesetzt, sind alle Funktionen wirkungslose
// No-Ops - die App laeuft dann ganz normal, nur ohne Push.

interface OneSignalApi {
  init(options: Record<string, unknown>): Promise<void>;
  login(externalId: string): Promise<void>;
  logout(): Promise<void>;
  Notifications: {
    permission: boolean;
    requestPermission(): Promise<void>;
  };
}

declare global {
  interface Window {
    OneSignalDeferred?: ((os: OneSignalApi) => void | Promise<void>)[];
  }
}

const APP_ID = import.meta.env.QCLI_ONESIGNAL_APP_ID;
const SDK_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';

export const pushAvailable = Boolean(APP_ID);

let initialized = false;

/** Stellt eine Aktion in die OneSignal-Warteschlange (SDK laedt asynchron). */
function withOneSignal(fn: (os: OneSignalApi) => void | Promise<void>) {
  if (!pushAvailable) return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(fn);
}

/** Laedt das SDK und initialisiert es. Wird einmalig beim App-Start aufgerufen. */
export function initPush() {
  if (!pushAvailable || initialized) return;
  initialized = true;

  const script = document.createElement('script');
  script.src = SDK_URL;
  script.defer = true;
  document.head.appendChild(script);

  withOneSignal(async (OneSignal) => {
    await OneSignal.init({
      appId: APP_ID,
      // Noetig, damit Push auf http://localhost getestet werden kann.
      allowLocalhostAsSecureOrigin: true,
    });
  });
}

/** Verknuepft das Geraet mit dem Nutzer (OneSignal "External ID" = Supabase-ID). */
export function loginPush(userId: string) {
  withOneSignal(async (OneSignal) => {
    await OneSignal.login(userId);
  });
}

/** Loest die Verknuepfung beim Abmelden. */
export function logoutPush() {
  withOneSignal(async (OneSignal) => {
    await OneSignal.logout();
  });
}

/** Fragt die Browser-Berechtigung an. Gibt zurueck, ob sie danach erteilt ist. */
export async function requestPushPermission(): Promise<boolean> {
  if (!pushAvailable) return false;
  return new Promise((resolve) => {
    withOneSignal(async (OneSignal) => {
      await OneSignal.Notifications.requestPermission();
      resolve(OneSignal.Notifications.permission);
    });
  });
}

/** Aktueller Berechtigungsstatus (ohne Nachfrage). */
export async function isPushEnabled(): Promise<boolean> {
  if (!pushAvailable) return false;
  return new Promise((resolve) => {
    withOneSignal((OneSignal) => {
      resolve(OneSignal.Notifications.permission);
    });
  });
}
