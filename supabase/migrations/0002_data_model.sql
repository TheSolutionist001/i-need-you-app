-- ===== 0. Aufraeumen (nur Entwicklung, solange keine echten Daten existieren) =====
--    Reihenfolge beachtet die Abhaengigkeiten. profiles bleibt unangetastet.
drop table if exists public.reports cascade;
drop table if exists public.board_posts cascade;
drop table if exists public.group_members cascade;
drop table if exists public.groups cascade;
drop function if exists public.is_group_member(uuid);
drop function if exists public.is_group_creator(uuid);
drop function if exists public.current_user_gender();

-- ===== 1. PostGIS aktivieren (fuer Umkreissuche in Phase 4) =====
--    In Supabase gehoeren Erweiterungen ins Schema "extensions", nicht nach public.
create extension if not exists postgis with schema extensions;

-- ===== 2. profiles: groben Standort ergaenzen =====
--    Koordinaten der angegebenen Stadt (kein exaktes GPS). Wird in Phase 4 befuellt.
alter table public.profiles
  add column if not exists location extensions.geography(Point, 4326);

comment on column public.profiles.location is
  'Grober Standort (Koordinaten der angegebenen Stadt, kein exaktes GPS). Nur serverseitig fuer die Umkreissuche; nie in public_profiles sichtbar.';

create index if not exists profiles_location_idx
  on public.profiles using gist (location);

-- ==========================================================================
-- WICHTIG zur Reihenfolge: Erst alle TABELLEN anlegen, dann die FUNKTIONEN
-- (die auf die Tabellen zugreifen), dann die POLICIES (die auf die Funktionen
-- zugreifen). Postgres prueft SQL-Funktionen sofort gegen die Tabellen, daher
-- muessen die Tabellen bereits existieren, wenn die Funktion erstellt wird.
-- ==========================================================================

-- ===== 3. Tabelle: groups =====
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text,
  max_members integer not null check (max_members > 0),
  is_public_event boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.groups is
  'Interessengruppen. Sichtbar fuer Mitglieder, Ersteller und - wenn is_public_event - fuer alle Eingeloggten.';

alter table public.groups enable row level security;
revoke all on public.groups from anon;
grant select, insert, update, delete on public.groups to authenticated;

-- ===== 4. Tabelle: group_members =====
create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('active', 'waitlist')),
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

comment on table public.group_members is
  'Zuordnung Nutzer <-> Gruppe. status: active oder waitlist. Eintraege entstehen ausschliesslich ueber die atomare Beitritts-Funktion (Phase 3), nie per direktem Insert.';

-- Macht das Zaehlen aktiver Mitglieder schnell - wichtig fuer die gesperrte
-- Zaehlung in der atomaren Beitritts-Funktion (Phase 3).
create index group_members_group_status_idx
  on public.group_members (group_id, status);

alter table public.group_members enable row level security;
revoke all on public.group_members from anon;
grant select, delete on public.group_members to authenticated;

-- ===== 5. Tabelle: board_posts (Schwarzes Brett) =====
create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  location extensions.geography(Point, 4326),
  target_genders text[] check (
    target_genders is null
    or (
      cardinality(target_genders) > 0
      and target_genders <@ array['maennlich', 'weiblich', 'divers', 'keine_angabe']
    )
  ),
  created_at timestamptz not null default now()
);

comment on table public.board_posts is
  'Gesuche am Schwarzen Brett. target_genders NULL = fuer alle sichtbar, sonst nur fuer die genannten Geschlechter. Kein Radius: den bestimmt der Suchende (Phase 4).';

create index board_posts_location_idx on public.board_posts using gist (location);
create index board_posts_created_at_idx on public.board_posts (created_at desc);

alter table public.board_posts enable row level security;
revoke all on public.board_posts from anon;
grant select, insert, update, delete on public.board_posts to authenticated;

-- ===== 6. Tabelle: reports (Meldungen / Shadow-Ban) =====
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_post_id uuid references public.board_posts(id) on delete cascade,
  reported_profile_id uuid references public.profiles(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  -- Genau eines von beiden muss gesetzt sein
  check (num_nonnulls(reported_post_id, reported_profile_id) = 1),
  -- Niemand meldet sich selbst
  check (reported_profile_id is null or reported_profile_id <> reporter_id)
);

comment on table public.reports is
  'Meldungen zu Beitraegen oder Profilen. Wirken sofort als Shadow-Ban fuer den Meldenden (siehe Leseregel von board_posts). Moderation ueber Admin-Dashboard in Phase 5.';

-- Verhindert Mehrfachmeldungen desselben Ziels durch dieselbe Person
create unique index reports_unique_post_idx
  on public.reports (reporter_id, reported_post_id)
  where reported_post_id is not null;

create unique index reports_unique_profile_idx
  on public.reports (reporter_id, reported_profile_id)
  where reported_profile_id is not null;

alter table public.reports enable row level security;
revoke all on public.reports from anon;
grant select, insert on public.reports to authenticated;

-- ===== 7. Hilfsfunktionen =====
--    Sie laufen mit erhoehten Rechten (security definer) und umgehen dadurch RLS.
--    Das ist hier kein Sicherheitsloch, sondern noetig: ohne sie wuerden sich die
--    Leseregeln von groups und group_members gegenseitig endlos aufrufen.
--    Stehen bewusst NACH den Tabellen (siehe Hinweis oben).
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $BODY$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id
      and user_id = auth.uid()
      and status = 'active'
  );
$BODY$;

create or replace function public.is_group_creator(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $BODY$
  select exists (
    select 1 from public.groups
    where id = p_group_id
      and created_by = auth.uid()
  );
$BODY$;

create or replace function public.current_user_gender()
returns text
language sql
security definer
stable
set search_path = public
as $BODY$
  select gender from public.profiles where id = auth.uid();
$BODY$;

revoke all on function public.is_group_member(uuid) from public;
revoke all on function public.is_group_creator(uuid) from public;
revoke all on function public.current_user_gender() from public;

grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_creator(uuid) to authenticated;
grant execute on function public.current_user_gender() to authenticated;

-- ===== 8. Zugriffsregeln (Policies) =====
--    Stehen NACH den Funktionen, weil sie diese aufrufen.

-- --- groups ---
create policy "groups_select_visible"
  on public.groups for select
  to authenticated
  using (
    is_public_event
    or created_by = auth.uid()
    or public.is_group_member(id)
  );

create policy "groups_insert_own"
  on public.groups for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "groups_update_creator"
  on public.groups for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "groups_delete_creator"
  on public.groups for delete
  to authenticated
  using (created_by = auth.uid());

-- --- group_members ---
create policy "group_members_select_same_group"
  on public.group_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_group_member(group_id)
    or public.is_group_creator(group_id)
  );

-- Bewusst KEIN Insert-/Update-Policy: Beitritt und Statuswechsel laufen
-- ausschliesslich ueber die atomare Funktion in Phase 3 (security definer).
-- Verhindert, dass jemand max_members umgeht oder sich selbst hochstuft.

create policy "group_members_delete_self_or_creator"
  on public.group_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_group_creator(group_id)
  );

-- --- board_posts ---
create policy "board_posts_select_eligible"
  on public.board_posts for select
  to authenticated
  using (
    -- Eigene Beitraege sind immer sichtbar, auch wenn die eigene Zielgruppe
    -- ausgeschlossen ist (sonst sieht der Autor sein eigenes Gesuch nicht).
    author_id = auth.uid()
    or (
      -- Zielgruppen-Filter (serverseitig, nicht nur in der Oberflaeche)
      (
        target_genders is null
        or public.current_user_gender() = any (target_genders)
      )
      -- Shadow-Ban: selbst gemeldete Beitraege sofort unsichtbar
      and not exists (
        select 1 from public.reports r
        where r.reporter_id = auth.uid()
          and r.reported_post_id = board_posts.id
      )
      -- Shadow-Ban: Beitraege von selbst gemeldeten Profilen ebenfalls ausblenden
      and not exists (
        select 1 from public.reports r
        where r.reporter_id = auth.uid()
          and r.reported_profile_id = board_posts.author_id
      )
    )
  );

create policy "board_posts_insert_own"
  on public.board_posts for insert
  to authenticated
  with check (author_id = auth.uid());

create policy "board_posts_update_own"
  on public.board_posts for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "board_posts_delete_own"
  on public.board_posts for delete
  to authenticated
  using (author_id = auth.uid());

-- --- reports ---
create policy "reports_insert_own"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

create policy "reports_select_own"
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid());

-- Kein Update/Delete: Meldungen sind unveraenderlich.

-- ===== 9. Schema-Cache neu laden (sonst findet die REST-API die Tabellen nicht) =====
notify pgrst, 'reload schema';
