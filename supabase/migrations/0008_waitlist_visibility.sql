-- ==========================================================================
-- Fix: Wartelisten-Mitglieder konnten "ihre" Gruppe nicht sehen.
--
-- Die Sichtbarkeitsregel aus Phase 2 nutzte is_group_member(), das bewusst nur
-- AKTIVE Mitglieder zaehlt (richtig fuer Kapazitaets-Logik, falsch fuer
-- Sichtbarkeit). Wer ueber einen Einladelink beitrat und auf der Warteliste
-- landete, bekam danach "Gruppe existiert nicht oder kein Zugriff" zu sehen.
--
-- Loesung: zusaetzlicher Helfer, der JEDE Mitgliedschaft zaehlt (aktiv ODER
-- Warteliste). is_group_member() bleibt unveraendert, damit die
-- Kapazitaets-Pruefung beim Beitritt korrekt bleibt.
-- ==========================================================================

create or replace function public.has_group_membership(p_group_id uuid)
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
  );
$BODY$;

revoke all on function public.has_group_membership(uuid) from public, anon;
grant execute on function public.has_group_membership(uuid) to authenticated;

-- ===== Gruppen: auch fuer Wartende sichtbar =====
drop policy if exists "groups_select_visible" on public.groups;

create policy "groups_select_visible"
  on public.groups for select
  to authenticated
  using (
    is_public_event
    or created_by = auth.uid()
    or public.has_group_membership(id)
  );

-- ===== Mitgliederliste: Wartende sehen die Gruppe ebenfalls =====
drop policy if exists "group_members_select_same_group" on public.group_members;

create policy "group_members_select_same_group"
  on public.group_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.has_group_membership(group_id)
    or public.is_group_creator(group_id)
  );

notify pgrst, 'reload schema';
