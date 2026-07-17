-- ===== 0. Aufraeumen (nur Entwicklung) =====
drop function if exists public.create_group(text, text, integer);
drop function if exists public.join_group(uuid);
drop function if exists public.leave_group(uuid);
drop function if exists public.get_group_preview(uuid);

-- ==========================================================================
-- Phase 3: Funktionen fuer Gruppenbeitritt mit Warteliste.
-- Alle Schreibzugriffe auf group_members laufen ueber diese security-definer
-- Funktionen (die Tabelle hat bewusst keine direkte Insert-Regel), damit die
-- Kapazitaets-Sperre nicht umgangen werden kann.
-- ==========================================================================

-- ===== 1. create_group =====
--    Legt die Gruppe an UND traegt den Ersteller als erstes aktives Mitglied ein.
create or replace function public.create_group(
  p_name text,
  p_description text,
  p_max_members integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $BODY$
declare
  v_group_id uuid;
begin
  insert into public.groups (name, description, max_members, created_by)
  values (p_name, p_description, p_max_members, auth.uid())
  returning id into v_group_id;

  insert into public.group_members (group_id, user_id, status)
  values (v_group_id, auth.uid(), 'active');

  return v_group_id;
end;
$BODY$;

-- ===== 2. join_group (die atomare Funktion) =====
--    Sperrt die Gruppen-Zeile, zaehlt dann erst die aktiven Mitglieder. Dadurch
--    koennen gleichzeitige Beitritte max_members nicht ueberschreiten.
create or replace function public.join_group(p_group_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $BODY$
declare
  v_max integer;
  v_active_count integer;
  v_existing text;
  v_status text;
begin
  -- Gruppen-Zeile sperren (serialisiert gleichzeitige Beitritte)
  select max_members into v_max
  from public.groups
  where id = p_group_id
  for update;

  if not found then
    raise exception 'Gruppe nicht gefunden';
  end if;

  -- Schon Mitglied? Dann aktuellen Status zurueckgeben (idempotent).
  select status into v_existing
  from public.group_members
  where group_id = p_group_id and user_id = auth.uid();

  if found then
    return v_existing;
  end if;

  -- Aktive Mitglieder zaehlen (unter der Sperre)
  select count(*) into v_active_count
  from public.group_members
  where group_id = p_group_id and status = 'active';

  if v_active_count < v_max then
    v_status := 'active';
  else
    v_status := 'waitlist';
  end if;

  insert into public.group_members (group_id, user_id, status)
  values (p_group_id, auth.uid(), v_status);

  return v_status;
end;
$BODY$;

-- ===== 3. leave_group (mit automatischem Nachruecken) =====
create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $BODY$
declare
  v_was_active boolean;
begin
  -- Gruppen-Zeile sperren
  perform 1 from public.groups where id = p_group_id for update;

  -- Eigene Mitgliedschaft finden
  select (status = 'active') into v_was_active
  from public.group_members
  where group_id = p_group_id and user_id = auth.uid();

  if not found then
    return; -- war kein Mitglied
  end if;

  delete from public.group_members
  where group_id = p_group_id and user_id = auth.uid();

  -- War ich aktiv: die am laengsten wartende Person nachruecken lassen.
  if v_was_active then
    update public.group_members
    set status = 'active'
    where id = (
      select id from public.group_members
      where group_id = p_group_id and status = 'waitlist'
      order by joined_at asc
      limit 1
    );
  end if;
end;
$BODY$;

-- ===== 4. get_group_preview =====
--    Begrenzte Infos fuer Nicht-Mitglieder, die einen Einladelink oeffnen.
--    Gibt NICHT die Mitgliederliste preis.
create or replace function public.get_group_preview(p_group_id uuid)
returns table (
  id uuid,
  name text,
  description text,
  max_members integer,
  active_count bigint,
  is_full boolean,
  already_member boolean
)
language sql
security definer
stable
set search_path = public
as $BODY$
  select
    g.id,
    g.name,
    g.description,
    g.max_members,
    (select count(*) from public.group_members m
       where m.group_id = g.id and m.status = 'active') as active_count,
    (select count(*) from public.group_members m
       where m.group_id = g.id and m.status = 'active') >= g.max_members as is_full,
    exists (select 1 from public.group_members m
       where m.group_id = g.id and m.user_id = auth.uid()) as already_member
  from public.groups g
  where g.id = p_group_id;
$BODY$;

-- ===== 5. Rechte =====
--    Supabase erteilt neuen Funktionen automatisch EXECUTE an anon UND authenticated.
--    "revoke from public" allein entfernt die separate anon-Berechtigung NICHT, daher
--    anon zusaetzlich explizit entziehen (sonst koennten Ausgeloggte z. B. ueber
--    get_group_preview Gruppennamen sehen).
revoke all on function public.create_group(text, text, integer) from public, anon;
revoke all on function public.join_group(uuid) from public, anon;
revoke all on function public.leave_group(uuid) from public, anon;
revoke all on function public.get_group_preview(uuid) from public, anon;

grant execute on function public.create_group(text, text, integer) to authenticated;
grant execute on function public.join_group(uuid) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.get_group_preview(uuid) to authenticated;

-- ===== 6. Schema-Cache neu laden =====
notify pgrst, 'reload schema';
