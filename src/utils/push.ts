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

/**
 * Fuehrt eine Aktion aus, sobald OneSignal bereit ist - bricht aber nach
 * `timeoutMs` ab. Ohne diese Absicherung wuerde die Oberflaeche endlos laden,
 * falls OneSignal nie initialisiert (z. B. weil die Web-Plattform in der
 * OneSignal-Konsole nicht eingerichtet ist).
 */
function withOneSignalTimeout<T>(
  fn: (os: OneSignalApi) => T | Promise<T>,
  fallback: T,
  timeoutMs = 8000,
): Promise<T> {
  if (!pushAvailable) return Promise.resolve(fallback);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: T) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = setTimeout(() => {
      console.warn('OneSignal antwortet nicht - ist die Web-Plattform in OneSignal eingerichtet?');
      finish(fallback);
    }, timeoutMs);

    withOneSignal(async (OneSignal) => {
      try {
        const result = await fn(OneSignal);
        clearTimeout(timer);
        finish(result);
      } catch (error) {
        console.error('OneSignal-Fehler:', error);
        clearTimeout(timer);
        finish(fallback);
      }
    });
  });
}

export type PushRequestResult =
  | 'granted' // Berechtigung erteilt
  | 'denied' // Nutzer/Browser hat blockiert
  | 'unavailable'; // OneSignal antwortet nicht (z. B. Web-Plattform nicht eingerichtet)

/**
 * Fragt die Browser-Berechtigung an und meldet zurueck, woran es ggf. lag.
 *
 * WICHTIG: Ist die Berechtigung im Browser bereits auf "denied" gesetzt, kehrt
 * OneSignals requestPermission() nie zurueck (kein Prompt, keine Ablehnung).
 * Deshalb pruefen wir den Browser-Status vorher selbst und fragen nur, wenn
 * ueberhaupt noch ein Prompt erscheinen kann.
 */
export function requestPushPermission(): Promise<PushRequestResult> {
  if (!pushAvailable) return Promise.resolve('unavailable');

  if (typeof Notification === 'undefined') return Promise.resolve('unavailable');
  if (Notification.permission === 'denied') return Promise.resolve('denied');
  if (Notification.permission === 'granted') return Promise.resolve('granted');

  return withOneSignalTimeout<PushRequestResult>(async (OneSignal) => {
    await OneSignal.Notifications.requestPermission();
    return OneSignal.Notifications.permission ? 'granted' : 'denied';
  }, 'unavailable');
}

/**
 * Aktueller Berechtigungsstatus (ohne Nachfrage). Liest den Browser-Status
 * direkt - das ist zuverlaessig und wartet nicht auf das SDK.
 */
export function isPushEnabled(): Promise<boolean> {
  if (!pushAvailable || typeof Notification === 'undefined') return Promise.resolve(false);
  return Promise.resolve(Notification.permission === 'granted');
}
