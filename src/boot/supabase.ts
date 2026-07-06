import { createClient } from '@supabase/supabase-js';
import { defineBoot } from '#q-app';

const supabaseUrl = import.meta.env.QCLI_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.QCLI_SUPABASE_ANON_KEY;

// Placeholder values let the app boot before the Supabase project exists;
// real credentials go in .env (see .env.example) once the project is created.
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env vars missing. Set QCLI_SUPABASE_URL and QCLI_SUPABASE_ANON_KEY in .env (see .env.example). Using a placeholder client for now.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

export default defineBoot(() => {
  // supabase client is ready for use via `import { supabase } from 'boot/supabase'`
});
