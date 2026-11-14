import { describe, expect, it } from 'vitest';
import { AuthError } from '@supabase/supabase-js';
import { getAuthErrorMessage } from '@/utils/auth-errors';

describe('getAuthErrorMessage', () => {
  it('übersetzt bekannte Supabase-Fehlercodes ins Deutsche', () => {
    expect(getAuthErrorMessage(new AuthError('x', 400, 'invalid_credentials'))).toBe(
      'E-Mail oder Passwort ist falsch.',
    );
    expect(getAuthErrorMessage(new AuthError('x', 422, 'user_already_exists'))).toMatch(
      /existiert bereits/,
    );
  });

  it('fällt bei unbekannten Fehlern auf einen allgemeinen Text zurück', () => {
    const generic = 'Etwas ist schiefgelaufen. Bitte versuche es erneut.';
    expect(getAuthErrorMessage(new AuthError('x', 500, 'irgendwas_neues'))).toBe(generic);
    expect(getAuthErrorMessage(new Error('netzwerk'))).toBe(generic);
    expect(getAuthErrorMessage(null)).toBe(generic);
  });
});
