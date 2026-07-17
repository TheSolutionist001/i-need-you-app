-- 0. Aufraeumen: entfernt evtl. vorhandene Reste aus frueheren Versuchen, damit
--    diese Datei gefahrlos erneut ausgefuehrt werden kann (nur in der Entwicklung
--    sinnvoll, solange es keine echten Nutzerdaten gibt).
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop view if exists public.public_profiles;
drop table if exists public.profiles cascade;

-- 1. Tabelle: private Profildaten, eine Zeile pro auth-Nutzer
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  gender text check (gender in ('maennlich', 'weiblich', 'divers', 'keine_angabe')),
  city text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Private Profildaten, eine Zeile pro auth.users-Zeile. Volle Spalten sind nur fuer den Besitzer lesbar/schreibbar (RLS). Oeffentlich sichtbare Teilmenge ueber public.public_profiles.';

-- 2. RLS aktivieren, nur Besitzer-Zugriff erlauben
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Kein Insert-Policy fuer normale Nutzer: Zeilen entstehen ausschliesslich ueber den
-- Trigger unten (laeuft mit erhoehten Rechten, umgeht RLS). Verhindert, dass jemand
-- Profile fuer fremde IDs oder doppelte Zeilen anlegt.
-- Kein Delete-Policy: Loeschen passiert implizit ueber "on delete cascade".

revoke all on public.profiles from anon;
grant select, update on public.profiles to authenticated;

-- 3. Trigger: legt bei neuer Registrierung automatisch die Profil-Zeile an,
--    befuellt aus den Metadaten, die signUp() mitschickt.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $BODY$
begin
  insert into public.profiles (id, first_name, gender, city)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    new.raw_user_meta_data ->> 'gender',
    new.raw_user_meta_data ->> 'city'
  );
  return new;
end;
$BODY$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Oeffentliche View: nur die Spalten, die laut Handout oeffentlich sein duerfen.
--    Bewusst NICHT security_invoker -- muss mit den Rechten des View-Besitzers
--    laufen, um trotz der Besitzer-only-RLS auf profiles alle Zeilen lesen zu
--    koennen; die Spaltenliste (nicht RLS) begrenzt hier die Sichtbarkeit.
create view public.public_profiles
  with (security_invoker = false)
as
  select id, first_name, city
  from public.profiles;

comment on view public.public_profiles is
  'Oeffentlich sichtbare Teilmenge von profiles: nur id, first_name, city.';

-- Supabase vergibt neuen Views automatisch Standard-Leserechte an anon; die
-- entziehen wir bewusst, damit auch diese View nur fuer eingeloggte Nutzer
-- lesbar ist (Phase 1 hat keine oeffentliche Seite ohne Login).
revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;
