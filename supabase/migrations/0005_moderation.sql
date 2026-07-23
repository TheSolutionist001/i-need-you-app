-- ===== 0. Aufraeumen (nur Entwicklung) =====
drop trigger if exists reject_banned_board_post on public.board_posts;
drop trigger if exists reject_banned_group_member on public.group_members;
drop function if exists public.reject_if_banned();
drop function if exists public.is_admin();
drop function if exists public.admin_list_reports();
drop function if exists public.admin_delete_post(uuid);
drop function if exists public.ban_user(uuid);

-- ==========================================================================
-- Phase 5: Sicherheit & Moderation.
-- Admin-Rolle (is_admin) wird manuell per SQL gesetzt. Sperren (is_banned)
-- wird per Trigger durchgesetzt. Admin-Lesezugriff laeuft ueber eine
-- security-definer-Funktion, die zuerst is_admin() prueft - die reports-Tabelle
-- bleibt fuer normale Nutzer weiterhin "nur eigene".
-- ==========================================================================

-- ===== 1. Spalten =====
alter table public.profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists is_banned boolean not null default false;

-- ===== 2. Melde-Grund einschraenken (null bleibt erlaubt) =====
alter table public.reports drop constraint if exists reports_reason_check;
alter table public.reports add constraint reports_reason_check
  check (reason is null or reason in ('spam', 'belaestigung', 'unangemessen', 'sonstiges'));

-- ===== 3. is_admin() =====
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $BODY$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$BODY$;

-- ===== 4. Ban-Durchsetzung per Trigger =====
--    Verhindert, dass ein gesperrtes Konto neue Gesuche/Beitritte anlegt -
--    greift auch in den security-definer-RPCs aus Phase 3/4.
create or replace function public.reject_if_banned()
returns trigger
language plpgsql
security definer
set search_path = public
as $BODY$
begin
  if coalesce((select is_banned from public.profiles where id = auth.uid()), false) then
    raise exception 'Konto gesperrt';
  end if;
  return new;
end;
$BODY$;

create trigger reject_banned_board_post
  before insert on public.board_posts
  for each row execute function public.reject_if_banned();

create trigger reject_banned_group_member
  before insert on public.group_members
  for each row execute function public.reject_if_banned();

-- ===== 5. admin_list_reports() =====
create or replace function public.admin_list_reports()
returns table (
  report_id uuid,
  kind text,
  reported_post_id uuid,
  reported_post_body text,
  reported_profile_id uuid,
  reported_profile_name text,
  reporter_id uuid,
  reporter_name text,
  reason text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $BODY$
begin
  if not public.is_admin() then
    raise exception 'Nur fuer Admins';
  end if;

  return query
    select
      r.id,
      case when r.reported_post_id is not null then 'post' else 'profile' end,
      r.reported_post_id,
      bp.body,
      r.reported_profile_id,
      rp.first_name,
      r.reporter_id,
      wer.first_name,
      r.reason,
      r.created_at
    from public.reports r
    left join public.board_posts bp on bp.id = r.reported_post_id
    left join public.profiles rp on rp.id = r.reported_profile_id
    left join public.profiles wer on wer.id = r.reporter_id
    order by r.created_at desc;
end;
$BODY$;

-- ===== 6. admin_delete_post() =====
create or replace function public.admin_delete_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $BODY$
begin
  if not public.is_admin() then
    raise exception 'Nur fuer Admins';
  end if;
  delete from public.board_posts where id = p_post_id;
  -- zugehoerige reports verschwinden per ON DELETE CASCADE
end;
$BODY$;

-- ===== 7. ban_user() =====
create or replace function public.ban_user(p_target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $BODY$
begin
  if not public.is_admin() then
    raise exception 'Nur fuer Admins';
  end if;
  if p_target_id = auth.uid() then
    raise exception 'Man kann sich nicht selbst sperren';
  end if;
  if coalesce((select is_admin from public.profiles where id = p_target_id), false) then
    raise exception 'Ein Admin kann nicht gesperrt werden';
  end if;

  update public.profiles set is_banned = true where id = p_target_id;
  delete from public.board_posts where author_id = p_target_id;
  delete from public.group_members where user_id = p_target_id;
end;
$BODY$;

-- ===== 8. Rechte (anon explizit ausschliessen) =====
revoke all on function public.is_admin() from public, anon;
revoke all on function public.admin_list_reports() from public, anon;
revoke all on function public.admin_delete_post(uuid) from public, anon;
revoke all on function public.ban_user(uuid) from public, anon;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_list_reports() to authenticated;
grant execute on function public.admin_delete_post(uuid) to authenticated;
grant execute on function public.ban_user(uuid) to authenticated;

-- ===== 9. Schema-Cache neu laden =====
notify pgrst, 'reload schema';
