-- ==========================================================================
-- Live-Updates: Supabase Realtime sendet nur Aenderungen an Tabellen, die in
-- der Publikation "supabase_realtime" stehen.
--
-- Sicherheit: Realtime respektiert die bestehenden RLS-Leseregeln automatisch -
-- ein Client erhaelt nur Aenderungen an Zeilen, die er ohnehin lesen duerfte.
-- Zielgruppen-Filter (board_posts) und Shadow-Ban bleiben also wirksam.
-- Kein RLS-Eingriff noetig.
-- ==========================================================================

do $BODY$
declare
  v_table text;
begin
  foreach v_table in array array['group_members', 'board_posts', 'groups']
  loop
    -- Nur hinzufuegen, wenn noch nicht in der Publikation (idempotent).
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end;
$BODY$;

-- Kontrolle: welche Tabellen senden jetzt Live-Updates?
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
order by tablename;
