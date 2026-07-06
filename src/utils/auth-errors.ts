import { AuthError } from '@supabase/supabase-js';

const messages: Record<string, string> = {
  invalid_credentials: 'E-Mail oder Passwort ist falsch.',
  email_not_confirmed: 'Bitte bestätige zuerst deine E-Mail-Adresse (Link in der E-Mail anklicken).',
  user_already_exists: 'Für diese E-Mail-Adresse existiert bereits ein Konto.',
  email_exists: 'Für diese E-Mail-Adresse existiert bereits ein Konto.',
  weak_password: 'Das Passwort ist zu schwach (mindestens 6 Zeichen).',
  over_email_send_rate_limit: 'Zu viele Versuche. Bitte warte kurz und versuche es erneut.',
};

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof AuthError && error.code) {
    const message = messages[error.code];
    if (message) return message;
  }
  return 'Etwas ist schiefgelaufen. Bitte versuche es erneut.';
}
