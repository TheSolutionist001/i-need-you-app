import { Notify } from 'quasar';

// Einheitliche Rueckmeldungen fuer Aktionen (Erfolg / Fehler).
export function notifySuccess(message: string): void {
  Notify.create({ message, color: 'positive', icon: 'check_circle', timeout: 2000 });
}

export function notifyError(message: string): void {
  Notify.create({ message, color: 'negative', icon: 'error', timeout: 3500 });
}
