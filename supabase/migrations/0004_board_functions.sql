-- ===== 0. Aufraeumen (nur Entwicklung) =====
drop function if exists public.set_my_location(float8, float8);
drop function if exists public.create_board_post(text, text[], float8, float8);
drop function if exists public.board_feed(integer);

-- ==========================================================================
-- Phase 4: Schwarzes Brett mit Umkreissuche.
-- Standort-Spalten (Geography) werden ueber RPCs mit ST_MakePoint gesetzt,
-- statt Koordinaten als Text ueber die REST-API zu schicken.
-- WICHTIG: board_feed ist bewusst KEINE security-definer-Funktion, damit die
-- RLS-Leseregel von board_posts (Zielgruppen-Filter + Shadow-Ban aus Phase 2)
-- automatisch greift. Sie fuegt nur den Abstandsfilter hinzu.
-- ==========================================================================

-- ===== 1. set_my_location =====
--    Setzt den groben Standort (Stadt-Koordinaten) fuer den aktuellen Nutzer.
create or replace function public.set_my_location(p_lat float8, p_lng float8)
returns void
language sql
security definer
set search_path = public, extensions
as $BODY$
  update public.profiles
  set location = extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography
  where id = auth.uid();
$BODY$;

-- ===== 2. create_board_post =====
--    Legt ein Gesuch an (author_id = auth.uid()). target_genders NULL = fuer alle.
create or replace function public.create_board_post(
  p_body text,
  p_target_genders text[],
  p_lat float8,
  p_lng float8
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $BODY$
declare
  v_id uuid;
begin
  insert into public.board_posts (author_id, body, target_genders, location)
  values (
    auth.uid(),
    p_body,
    p_target_genders,
    extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography
  )
  returning id into v_id;

  return v_id;
end;
$BODY$;

-- ===== 3. board_feed (invoker -> RLS greift automatisch) =====
--    Gibt die fuer den Aufrufer sichtbaren Gesuche im Umkreis um dessen
--    Profil-Standort zurueck, inkl. Autor-Vorname und Entfernung in Metern.
create or replace function public.board_feed(p_radius_km integer)
returns table (
  id uuid,
  body text,
  target_genders text[],
  created_at timestamptz,
  author_id uuid,
  author_first_name text,
  distance_m double precision
)
language sql
stable
set search_path = public, extensions
as $BODY$
  select
    bp.id,
    bp.body,
    bp.target_genders,
    bp.created_at,
    bp.author_id,
    pp.first_name as author_first_name,
    extensions.ST_Distance(bp.location, me.location) as distance_m
  from public.board_posts bp
  cross join (select location from public.profiles where id = auth.uid()) me
  left join public.public_profiles pp on pp.id = bp.author_id
  where bp.location is not null
    and me.location is not null
    and extensions.ST_DWithin(bp.location, me.location, p_radius_km * 1000)
  order by bp.created_at desc;
$BODY$;

-- ===== 4. Rechte (anon explizit ausschliessen) =====
revoke all on function public.set_my_location(float8, float8) from public, anon;
revoke all on function public.create_board_post(text, text[], float8, float8) from public, anon;
revoke all on function public.board_feed(integer) from public, anon;

grant execute on function public.set_my_location(float8, float8) to authenticated;
grant execute on function public.create_board_post(text, text[], float8, float8) to authenticated;
grant execute on function public.board_feed(integer) to authenticated;

-- ===== 5. Schema-Cache neu laden =====
notify pgrst, 'reload schema';
