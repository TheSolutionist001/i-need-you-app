-- ==========================================================================
-- Karte in "Entdecken": board_feed und discover_groups liefern zusaetzlich
-- Koordinaten (lat/lng) fuer die Kartenmarker.
--
-- Datenschutz: Gespeichert sind ohnehin nur Stadt-Koordinaten (keine GPS-
-- Position). Zusaetzlich werden sie hier auf 2 Nachkommastellen gerundet
-- (~1 km), damit die Karte nie genauer ist als "ungefaehr in diesem Ort".
-- Der genaue Gruppen-Treffpunkt (group_meetup_places) erscheint NICHT hier.
--
-- Beide Funktionen bleiben INVOKER, damit die RLS (Zielgruppe, Shadow-Ban,
-- Gruppen-Sichtbarkeit) unveraendert greift. Die Rueckgabe bekommt nur zwei
-- neue Spalten am Ende - aeltere App-Versionen ignorieren sie einfach.
-- ==========================================================================

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
  sport text,
  lat double precision,
  lng double precision
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
    bp.sport,
    round(extensions.ST_Y(bp.location::extensions.geometry)::numeric, 2)::double precision as lat,
    round(extensions.ST_X(bp.location::extensions.geometry)::numeric, 2)::double precision as lng
  from public.board_posts bp
  cross join (select location from public.profiles where id = auth.uid()) me
  left join public.public_profiles pp on pp.id = bp.author_id
  where bp.location is not null
    and me.location is not null
    and extensions.ST_DWithin(bp.location, me.location, p_radius_km * 1000)
  order by bp.created_at desc;
$BODY$;

drop function if exists public.discover_groups(integer);

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
  distance_m double precision,
  lat double precision,
  lng double precision
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
    end as distance_m,
    round(extensions.ST_Y(g.location::extensions.geometry)::numeric, 2)::double precision as lat,
    round(extensions.ST_X(g.location::extensions.geometry)::numeric, 2)::double precision as lng
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
  order by g.next_meetup_at nulls last, g.created_at desc;
$BODY$;

revoke all on function public.board_feed(integer) from public, anon;
revoke all on function public.discover_groups(integer) from public, anon;
grant execute on function public.board_feed(integer) to authenticated;
grant execute on function public.discover_groups(integer) to authenticated;

notify pgrst, 'reload schema';
