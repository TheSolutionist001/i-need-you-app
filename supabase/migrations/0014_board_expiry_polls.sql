-- ==========================================================================
-- Brett-Pflege (Gesuche laufen ab) und Umfragen in Gruppen
--
-- Laienfassung:
--  * board_posts.expires_at: Gesuche verschwinden nach der gewaehlten Dauer
--    (Standard 14 Tage) automatisch vom Brett. Bestehende Gesuche bekommen
--    ab heute 14 Tage.
--  * group_polls / _options / _votes: Umfragen wie "Wann passt es euch?".
--    Sehen, anlegen und abstimmen duerfen nur aktive Gruppenmitglieder.
--    Mehrfachauswahl ist erlaubt. Loeschen: wer sie angelegt hat oder der
--    Gruppen-Ersteller.
-- ==========================================================================

-- ===== 1. Ablaufdatum fuer Gesuche =====
alter table public.board_posts add column if not exists expires_at timestamptz;
update public.board_posts set expires_at = now() + interval '14 days' where expires_at is null;
alter table public.board_posts alter column expires_at set default now() + interval '14 days';

drop function if exists public.create_board_post(text, text[], float8, float8, text);

create or replace function public.create_board_post(
  p_body text,
  p_target_genders text[],
  p_lat float8,
  p_lng float8,
  p_sport text default 'sonstiges',
  p_valid_days integer default 14
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $BODY$
declare
  v_id uuid;
begin
  if p_valid_days is null or p_valid_days not between 1 and 60 then
    raise exception 'Ungueltige Laufzeit';
  end if;

  insert into public.board_posts (author_id, body, target_genders, location, sport, expires_at)
  values (
    auth.uid(),
    p_body,
    p_target_genders,
    extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography,
    coalesce(p_sport, 'sonstiges'),
    now() + make_interval(days => p_valid_days)
  )
  returning id into v_id;

  return v_id;
end;
$BODY$;

revoke all on function public.create_board_post(text, text[], float8, float8, text, integer) from public, anon;
grant execute on function public.create_board_post(text, text[], float8, float8, text, integer) to authenticated;

-- Feed: abgelaufene Gesuche ausblenden, Ablaufdatum mitliefern (neue Spalte am Ende)
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
  lng double precision,
  expires_at timestamptz
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
    round(extensions.ST_X(bp.location::extensions.geometry)::numeric, 2)::double precision as lng,
    bp.expires_at
  from public.board_posts bp
  cross join (select location from public.profiles where id = auth.uid()) me
  left join public.public_profiles pp on pp.id = bp.author_id
  where bp.location is not null
    and me.location is not null
    and extensions.ST_DWithin(bp.location, me.location, p_radius_km * 1000)
    and not public.is_blocked_between(bp.author_id)
    and (bp.expires_at is null or bp.expires_at > now())
  order by bp.created_at desc;
$BODY$;

revoke all on function public.board_feed(integer) from public, anon;
grant execute on function public.board_feed(integer) to authenticated;

-- ===== 2. Umfragen =====
create table public.group_polls (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  question text not null constraint group_polls_question_len check (char_length(btrim(question)) between 1 and 200),
  created_at timestamptz not null default now()
);

create table public.group_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.group_polls(id) on delete cascade,
  label text not null constraint group_poll_options_label_len check (char_length(btrim(label)) between 1 and 100),
  position smallint not null default 0
);

create table public.group_poll_votes (
  option_id uuid not null references public.group_poll_options(id) on delete cascade,
  poll_id uuid not null references public.group_polls(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (option_id, user_id)
);

create index group_polls_group_idx on public.group_polls (group_id, created_at desc);
create index group_poll_options_poll_idx on public.group_poll_options (poll_id);
create index group_poll_votes_poll_idx on public.group_poll_votes (poll_id);

alter table public.group_polls enable row level security;
alter table public.group_poll_options enable row level security;
alter table public.group_poll_votes enable row level security;

-- Gehoert die Umfrage zu einer Gruppe, in der ich aktives Mitglied bin?
create or replace function public.can_access_poll(p_poll_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $BODY$
  select exists (
    select 1 from public.group_polls p
    where p.id = p_poll_id and public.is_group_member(p.group_id)
  );
$BODY$;

revoke all on function public.can_access_poll(uuid) from public, anon;
grant execute on function public.can_access_poll(uuid) to authenticated;

create policy "group_polls_select_members" on public.group_polls
  for select to authenticated using (public.is_group_member(group_id));
create policy "group_polls_delete_owner" on public.group_polls
  for delete to authenticated
  using (created_by = auth.uid() or public.is_group_creator(group_id));

create policy "group_poll_options_select_members" on public.group_poll_options
  for select to authenticated using (public.can_access_poll(poll_id));

create policy "group_poll_votes_select_members" on public.group_poll_votes
  for select to authenticated using (public.can_access_poll(poll_id));
create policy "group_poll_votes_insert_own" on public.group_poll_votes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.can_access_poll(poll_id)
    -- die Antwort muss wirklich zu dieser Umfrage gehoeren
    and exists (
      select 1 from public.group_poll_options o
      where o.id = group_poll_votes.option_id and o.poll_id = group_poll_votes.poll_id
    )
  );
create policy "group_poll_votes_delete_own" on public.group_poll_votes
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.group_polls, public.group_poll_options, public.group_poll_votes from anon;
grant select, delete on public.group_polls to authenticated;
grant select on public.group_poll_options to authenticated;
grant select, insert, delete on public.group_poll_votes to authenticated;

create trigger reject_banned_poll_vote
  before insert on public.group_poll_votes
  for each row execute function public.reject_if_banned();

-- Umfrage mit Antworten in einem Schritt anlegen (2 bis 10 Antworten)
create or replace function public.create_poll(p_group_id uuid, p_question text, p_options text[])
returns uuid
language plpgsql
security definer
set search_path = public
as $BODY$
declare
  v_id uuid;
  v_labels text[];
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'Nur aktive Mitglieder koennen Umfragen starten';
  end if;
  if coalesce((select is_banned from public.profiles where id = auth.uid()), false) then
    raise exception 'Konto gesperrt';
  end if;

  select array_agg(btrim(x)) into v_labels
  from unnest(p_options) as x
  where btrim(coalesce(x, '')) <> '';

  if coalesce(array_length(v_labels, 1), 0) not between 2 and 10 then
    raise exception 'Bitte 2 bis 10 Antworten angeben';
  end if;

  insert into public.group_polls (group_id, created_by, question)
  values (p_group_id, auth.uid(), btrim(p_question))
  returning id into v_id;

  insert into public.group_poll_options (poll_id, label, position)
  select v_id, label, (ord - 1)::smallint
  from unnest(v_labels) with ordinality as t(label, ord);

  return v_id;
end;
$BODY$;

revoke all on function public.create_poll(uuid, text, text[]) from public, anon;
grant execute on function public.create_poll(uuid, text, text[]) to authenticated;

-- ===== 3. Live-Updates =====
alter publication supabase_realtime add table public.group_polls;
alter publication supabase_realtime add table public.group_poll_votes;

notify pgrst, 'reload schema';
