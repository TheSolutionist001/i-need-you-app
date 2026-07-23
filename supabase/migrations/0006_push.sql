-- ===== 0. Aufraeumen (nur Entwicklung) =====
drop trigger if exists notify_on_promotion on public.group_members;
drop function if exists public.notify_on_promotion();
drop function if exists public.send_push_to_user(uuid, text, text);

-- ==========================================================================
-- Phase 6: Push-Benachrichtigungen ueber OneSignal.
-- Der geheime REST-Schluessel liegt im Supabase Vault und verlaesst die
-- Datenbank nie. Der Versand laeuft asynchron ueber pg_net, blockiert die
-- Transaktion also nicht. Zuordnung ueber OneSignals "External ID", die
-- gleich der Supabase-Nutzer-ID ist (keine eigene Geraete-Tabelle noetig).
-- ==========================================================================

-- ===== 1. pg_net aktivieren (HTTP aus der Datenbank) =====
--    Hinweis: pg_net legt seine Funktionen immer im eigenen Schema "net" ab
--    (unabhaengig von "with schema"). Aufruf daher als net.http_post(...).
create extension if not exists pg_net with schema extensions;

-- ===== 2. send_push_to_user =====
--    Bricht still ab, wenn die Secrets fehlen -> Push ist optional, die App
--    funktioniert auch ohne OneSignal-Einrichtung normal weiter.
create or replace function public.send_push_to_user(
  p_user_id uuid,
  p_title text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $BODY$
declare
  v_app_id text;
  v_api_key text;
begin
  select decrypted_secret into v_app_id
  from vault.decrypted_secrets where name = 'onesignal_app_id';

  select decrypted_secret into v_api_key
  from vault.decrypted_secrets where name = 'onesignal_rest_api_key';

  -- Ohne hinterlegte Zugangsdaten passiert einfach nichts.
  if v_app_id is null or v_api_key is null then
    return;
  end if;

  perform net.http_post(
    url := 'https://api.onesignal.com/notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Key ' || v_api_key
    ),
    body := jsonb_build_object(
      'app_id', v_app_id,
      'target_channel', 'push',
      'include_aliases', jsonb_build_object(
        'external_id', jsonb_build_array(p_user_id::text)
      ),
      'headings', jsonb_build_object('de', p_title, 'en', p_title),
      'contents', jsonb_build_object('de', p_body, 'en', p_body)
    )
  );
end;
$BODY$;

-- ===== 3. Trigger: Benachrichtigung beim Nachruecken =====
--    Feuert genau beim Statuswechsel waitlist -> active, egal ueber welchen Weg.
create or replace function public.notify_on_promotion()
returns trigger
language plpgsql
security definer
set search_path = public
as $BODY$
declare
  v_group_name text;
begin
  select name into v_group_name from public.groups where id = new.group_id;

  perform public.send_push_to_user(
    new.user_id,
    'Platz frei geworden',
    'Du bist von der Warteliste nachgerueckt: ' || coalesce(v_group_name, 'Gruppe')
  );

  return new;
end;
$BODY$;

create trigger notify_on_promotion
  after update on public.group_members
  for each row
  when (old.status = 'waitlist' and new.status = 'active')
  execute function public.notify_on_promotion();

-- ===== 4. Rechte =====
--    send_push_to_user wird NUR intern vom Trigger genutzt und ist bewusst
--    fuer niemanden per API aufrufbar (sonst waere es ein Spam-Versender).
revoke all on function public.send_push_to_user(uuid, text, text) from public, anon, authenticated;

-- ===== 5. Schema-Cache neu laden =====
notify pgrst, 'reload schema';
