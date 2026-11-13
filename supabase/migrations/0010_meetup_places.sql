-- ==========================================================================
-- Treffpunkt einer Gruppe (Halle, Platz, Adresse) + eigener Standort abrufen.
--
-- Der Treffpunkt liegt bewusst in einer EIGENEN Tabelle statt in "groups":
-- Oeffentliche Gruppen sind fuer alle angemeldeten Nutzer lesbar (Entdecken).
-- Der genaue Ort soll aber nur fuer Mitglieder (inkl. Warteliste) und den
-- Ersteller sichtbar sein. Mit einer eigenen Tabelle regelt das die RLS sauber.
--
-- Es handelt sich um einen oeffentlichen Treffpunkt (keine Wohnadresse), daher
-- sind genaue Koordinaten hier vertretbar - sie werden fuer die Navigation
-- (Google-Maps-Link) gebraucht.
-- ==========================================================================

create table if not exists public.group_meetup_places (
  group_id   uuid primary key references public.groups(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 200),
  address    text check (address is null or char_length(address) <= 300),
  lat        double precision not null check (lat between -90 and 90),
  lng        double precision not null check (lng between -180 and 180),
  updated_at timestamptz not null default now()
);

alter table public.group_meetup_places enable row level security;

-- Supabase vergibt neuen Tabellen automatisch Rechte an anon -> entziehen.
revoke all on table public.group_meetup_places from anon;
grant select, insert, update, delete on table public.group_meetup_places to authenticated;

-- Lesen: Mitglieder (aktiv oder Warteliste) und Ersteller.
drop policy if exists "meetup_places_select_members" on public.group_meetup_places;
create policy "meetup_places_select_members"
  on public.group_meetup_places for select
  to authenticated
  using (
    public.has_group_membership(group_id)
    or public.is_group_creator(group_id)
  );

-- Schreiben: nur der Ersteller der Gruppe.
drop policy if exists "meetup_places_insert_creator" on public.group_meetup_places;
create policy "meetup_places_insert_creator"
  on public.group_meetup_places for insert
  to authenticated
  with check (public.is_group_creator(group_id));

drop policy if exists "meetup_places_update_creator" on public.group_meetup_places;
create policy "meetup_places_update_creator"
  on public.group_meetup_places for update
  to authenticated
  using (public.is_group_creator(group_id))
  with check (public.is_group_creator(group_id));

drop policy if exists "meetup_places_delete_creator" on public.group_meetup_places;
create policy "meetup_places_delete_creator"
  on public.group_meetup_places for delete
  to authenticated
  using (public.is_group_creator(group_id));

-- Live-Updates fuer Mitglieder (Realtime respektiert die RLS).
do $BODY$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_meetup_places'
  ) then
    alter publication supabase_realtime add table public.group_meetup_places;
  end if;
end
$BODY$;

-- ===== get_my_location =====
-- Liefert die (groben) Stadt-Koordinaten des eigenen Profils, z. B. um die
-- Ortssuche auf die Umgebung zu gewichten oder die Stadt vorzubelegen.
-- Bewusst invoker: die profiles-RLS greift, man sieht nur sich selbst.
create or replace function public.get_my_location()
returns table (lat double precision, lng double precision)
language sql
stable
security invoker
set search_path = public, extensions
as $BODY$
  select
    extensions.ST_Y(p.location::extensions.geometry) as lat,
    extensions.ST_X(p.location::extensions.geometry) as lng
  from public.profiles p
  where p.id = auth.uid()
    and p.location is not null;
$BODY$;

revoke all on function public.get_my_location() from public, anon;
grant execute on function public.get_my_location() to authenticated;

notify pgrst, 'reload schema';
