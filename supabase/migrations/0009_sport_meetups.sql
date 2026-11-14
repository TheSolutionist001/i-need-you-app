-- ==========================================================================
-- Phase 7 (Redesign "Entdecken"): Sportart, Termin und grober Ort.
--
-- * groups:      sport, next_meetup_at (naechster Termin), city + location
--                (Stadt-Koordinaten, bewusst ungenau wie beim Brett)
-- * board_posts: sport
-- * discover_groups(radius): eigene Gruppen + oeffentliche Gruppen im Umkreis.
--   Bewusst INVOKER (kein security definer), damit die groups-RLS greift:
--   man sieht nur, was man ohnehin sehen darf.
-- * group_active_count(): reine Zahl der aktiven Mitglieder. Die Mitgliederliste
--   selbst bleibt fuer Nicht-Mitglieder unsichtbar (wie bei get_group_preview).
-- ==========================================================================

-- ===== 1. Neue Spalten =====
alter table public.groups
  add column if not exists sport text not null default 'sonstiges',
  add column if not exists next_meetup_at timestamptz,
  add column if not exists city text,
  add column if not exists location extensions.geography(Point, 4326);

alter table public.groups drop constraint if exists groups_sport_check;
alter table public.groups add constraint groups_sport_check check (sport in (
  'fussball', 'laufen', 'wandern', 'radfahren', 'tennis', 'volleyball',
  'basketball', 'fitness', 'schwimmen', 'yoga', 'klettern', 'sonstiges'
));

create index if not exists groups_location_idx on public.groups using gist (location);

alter table public.board_posts
  add column if not exists sport text not null default 'sonstiges';

alter table public.board_posts drop constraint if exists board_posts_sport_check;
alter table public.board_posts add constraint board_posts_sport_check check (sport in (
  'fussball', 'laufen', 'wandern', 'radfahren', 'tennis', 'volleyball',
  'basketball', 'fitness', 'schwimmen', 'yoga', 'klettern', 'sonstiges'
));

-- ===== 2. create_group mit Sportart, Termin und Ort =====
--    Neue Parameter haben Standardwerte, damit aeltere App-Versionen
--    (nur Name/Beschreibung/Groesse) weiter funktionieren.
drop function if exists public.create_group(text, text, integer);
drop function if exists public.create_group(text, text, integer, text, timestamptz, text, float8, float8);

create or replace function public.create_group(
  p_name text,
  p_description text,
  p_max_members integer,
  p_sport text default 'sonstiges',
  p_next_meetup_at timestamptz default null,
  p_city text default null,
  p_lat float8 default null,
  p_lng float8 default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $BODY$
declare
  v_group_id uuid;
begin
  insert into public.groups (name, description, max_members, created_by, sport, next_meetup_at, city, location)
  values (
    p_name,
    p_description,
    p_max_members,
    auth.uid(),
    coalesce(p_sport, 'sonstiges'),
    p_next_meetup_at,
    p_city,
    case
      when p_lat is null or p_lng is null then null
      else extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography
    end
  )
  returning id into v_group_id;

  insert into public.group_members (group_id, user_id, status)
  values (v_group_id, auth.uid(), 'active');

  return v_group_id;
end;
$BODY$;

-- ===== 3. create_board_post mit Sportart =====
drop function if exists public.create_board_post(text, text[], float8, float8);
drop function if exists public.create_board_post(text, text[], float8, float8, text);

create or replace function public.create_board_post(
  p_body text,
  p_target_genders text[],
  p_lat float8,
  p_lng float8,
  p_sport text default 'sonstiges'
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $BODY$
declare
  v_id uuid;
begin
  insert into public.board_posts (author_id, body, target_genders, location, sport)
  values (
    auth.uid(),
    p_body,
    p_target_genders,
    extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography,
    coalesce(p_sport, 'sonstiges')
  )
  returning id into v_id;

  return v_id;
end;
$BODY$;

-- ===== 4. board_feed liefert zusaetzlich die Sportart (weiterhin INVOKER) =====
drop function if exists public.board_feed(integer);

create or replace function public.board_feed(p_radius_km integer)
returns table (
  id uuid,
  body text,
  target_genders text[],
  created_at timestamptz,
  author_id uuid,
  author_first_name text,
  distance_m double precision,
  sport text
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
    extensions.ST_Distance(bp.location, me.location) as distance_m,
    bp.sport
  from public.board_posts bp
  cross join (select location from public.profiles where id = auth.uid()) me
  left join public.public_profiles pp on pp.id = bp.author_id
  where bp.location is not null
    and me.location is not null
    and extensions.ST_DWithin(bp.location, me.location, p_radius_km * 1000)
  order by bp.created_at desc;
$BODY$;

-- ===== 5. group_active_count: nur die Zahl, keine Namen =====
create or replace function public.group_active_count(p_group_id uuid)
returns integer
language sql
security definer
stable
set search_path = public
as $BODY$
  select count(*)::integer
  from public.group_members
  where group_id = p_group_id and status = 'active';
$BODY$;

-- ===== 6. discover_groups (INVOKER -> groups-RLS greift) =====
--    p_radius_km NULL = nur eigene Gruppen (Mitglied/Warteliste).
--    Sonst zusaetzlich oeffentliche Gruppen im Umkreis um den Profil-Standort.
create or replace function public.discover_groups(p_radius_km integer)
returns table (
  id uuid,
  name text,
  description text,
  sport text,
  max_members integer,
  is_public_event boolean,
  created_by uuid,
  next_meetup_at timestamptz,
  city text,
  active_count integer,
  my_status text,
  distance_m double precision
)
language sql
stable
set search_path = public, extensions
as $BODY$
  select
    g.id,
    g.name,
    g.description,
    g.sport,
    g.max_members,
    g.is_public_event,
    g.created_by,
    g.next_meetup_at,
    g.city,
    public.group_active_count(g.id) as active_count,
    gm.status as my_status,
    case
      when g.location is null or me.location is null then null
      else extensions.ST_Distance(g.location, me.location)
    end as distance_m
  from public.groups g
  left join (select location from public.profiles where id = auth.uid()) me on true
  left join public.group_members gm on gm.group_id = g.id and gm.user_id = auth.uid()
  where gm.id is not null
     or (
       p_radius_km is not null
       and g.is_public_event
       and g.location is not null
       and me.location is not null
       and extensions.ST_DWithin(g.location, me.location, p_radius_km * 1000)
     )
  order by g.next_meetup_at asc nulls last, g.created_at desc;
$BODY$;

-- ===== 7. Rechte (anon explizit ausschliessen) =====
revoke all on function public.create_group(text, text, integer, text, timestamptz, text, float8, float8) from public, anon;
revoke all on function public.create_board_post(text, text[], float8, float8, text) from public, anon;
revoke all on function public.board_feed(integer) from public, anon;
revoke all on function public.group_active_count(uuid) from public, anon;
revoke all on function public.discover_groups(integer) from public, anon;

grant execute on function public.create_group(text, text, integer, text, timestamptz, text, float8, float8) to authenticated;
grant execute on function public.create_board_post(text, text[], float8, float8, text) to authenticated;
grant execute on function public.board_feed(integer) to authenticated;
grant execute on function public.group_active_count(uuid) to authenticated;
grant execute on function public.discover_groups(integer) to authenticated;

-- ===== 8. Schema-Cache neu laden =====
notify pgrst, 'reload schema';
