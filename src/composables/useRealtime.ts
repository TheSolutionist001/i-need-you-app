import { onMounted, onUnmounted } from 'vue';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/boot/supabase';

/**
 * Abonniert Aenderungen an einer Tabelle und meldet sich beim Verlassen der
 * Seite sauber wieder ab (sonst bleiben Verbindungen offen).
 *
 * Sicherheit: Realtime respektiert die RLS - es kommen nur Aenderungen an
 * Zeilen an, die der angemeldete Nutzer ohnehin lesen darf.
 *
 * @param table   Tabellenname, z. B. 'group_members'
 * @param filter  optionaler Serverfilter, z. B. 'group_id=eq.<uuid>'
 * @param onChange wird bei jeder relevanten Aenderung aufgerufen
 */
export function useRealtime(
  table: string,
  filter: string | null,
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
) {
  // Eindeutiger Kanalname, damit sich mehrere Abos nicht gegenseitig stoeren.
  const channelName = `rt-${table}-${filter ?? 'all'}-${Math.random().toString(36).slice(2, 8)}`;
  let channel: ReturnType<typeof supabase.channel> | null = null;

  onMounted(() => {
    channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        (payload) => onChange(payload),
      )
      .subscribe();
  });

  onUnmounted(() => {
    if (channel) {
      void supabase.removeChannel(channel);
      channel = null;
    }
  });
}
