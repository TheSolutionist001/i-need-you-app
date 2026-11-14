-- ==========================================================================
-- Nachrichten (Direkt-Chat + Gruppen-Chat) und Blockieren
--
-- Laienfassung:
--  * user_blocks: "Ich blockiere Person X". Nur ich sehe meine Blockliste.
--    Wirkung (serverseitig erzwungen): X kann mir nicht mehr schreiben, ich
--    ihr auch nicht, und wir sehen gegenseitig unsere Gesuche am Brett nicht.
--  * chat_threads: ein Direkt-Chat zwischen genau zwei Personen (max. einer pro
--    Paar). Anlegen nur ueber start_chat() (prueft Sperren/Blockierungen).
--    Lesen duerfen nur die beiden Beteiligten.
--  * chat_messages: Nachrichten - entweder in einem Direkt-Chat (thread_id)
--    oder im Gruppen-Chat (group_id). Lesen/Schreiben im Gruppen-Chat nur
--    fuer aktive Mitglieder. Gesperrte Konten koennen nichts senden.
--  * Push bei neuer Direktnachricht (OneSignal, wie beim Nachruecken).
-- ==========================================================================

-- ===== 1. Blockieren =====
create table public.user_blocks (
  blocker_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;

create policy "user_blocks_select_own" on public.user_blocks
  for select to authenticated using (blocker_id = auth.uid());
create policy "user_blocks_insert_own" on public.user_blocks
  for insert to authenticated with check (blocker_id = auth.uid());
create policy "user_blocks_delete_own" on public.user_blocks
  for delete to authenticated using (blocker_id = auth.uid());

revoke all on public.user_blocks from anon;
grant select, insert, delete on public.user_blocks to authenticated;

-- Gibt es eine Blockierung zwischen mir und p_other - egal in welche Richtung?
-- security definer, weil ich fremde Blocklisten (wer hat MICH blockiert?)
-- per RLS nicht lesen darf. Liefert nur ja/nein, keine Details.
create or replace function public.is_blocked_between(p_other uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $BODY$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = auth.uid() and blocked_id = p_other)
       or (blocker_id = p_other and blocked_id = auth.uid())
  );
$BODY$;

revoke all on function public.is_blocked_between(uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid) to authenticated;

-- ===== 2. Direkt-Chats =====
create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  -- Gesuch, auf das zuletzt geantwortet wurde (nur als Kontext)
  post_id uuid references public.board_posts(id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  a_read_at timestamptz,
  b_read_at timestamptz,
  constraint chat_threads_ordered check (user_a < user_b),
  constraint chat_threads_pair unique (user_a, user_b)
);

alter table public.chat_threads enable row level security;

create policy "chat_threads_select_participant" on public.chat_threads
  for select to authenticated using (auth.uid() = user_a or auth.uid() = user_b);
-- Kein insert/update/delete per API: nur ueber die Funktionen unten.

revoke all on public.chat_threads from anon;
grant select on public.chat_threads to authenticated;

-- Darf ich in diesem Direkt-Chat schreiben? (beteiligt + keine Blockierung)
create or replace function public.can_write_thread(p_thread_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $BODY$
  select exists (
    select 1 from public.chat_threads t
    where t.id = p_thread_id
      and auth.uid() in (t.user_a, t.user_b)
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = t.user_a and b.blocked_id = t.user_b)
           or (b.blocker_id = t.user_b and b.blocked_id = t.user_a)
      )
  );
$BODY$;

revoke all on function public.can_write_thread(uuid) from public, anon;
grant execute on function public.can_write_thread(uuid) to authenticated;

-- ===== 3. Nachrichten =====
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.chat_threads(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint chat_messages_one_target check ((thread_id is null) <> (group_id is null)),
  constraint chat_messages_body_len check (char_length(btrim(body)) between 1 and 2000)
);

create index chat_messages_thread_idx on public.chat_messages (thread_id, created_at desc);
create index chat_messages_group_idx on public.chat_messages (group_id, created_at desc);

alter table public.chat_messages enable row level security;

create policy "chat_messages_select" on public.chat_messages
  for select to authenticated
  using (
    (thread_id is not null and exists (
      select 1 from public.chat_threads t
      where t.id = chat_messages.thread_id and auth.uid() in (t.user_a, t.user_b)
    ))
    or (group_id is not null and public.is_group_member(group_id))
  );

create policy "chat_messages_insert" on public.chat_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      (thread_id is not null and public.can_write_thread(thread_id))
      or (group_id is not null and public.is_group_member(group_id))
    )
  );

-- Kein update/delete: Nachrichten bleiben, wie sie gesendet wurden.
revoke all on public.chat_messages from anon;
grant select, insert on public.chat_messages to authenticated;

-- Gesperrte Konten koennen nicht schreiben (gleicher Trigger wie bei Gesuchen)
create trigger reject_banned_chat_message
  before insert on public.chat_messages
  for each row execute function public.reject_if_banned();

-- Gelesen-Markierung fuer den Gruppen-Chat
alter table public.group_members add column if not exists chat_read_at timestamptz;

-- ===== 4. Nach dem Senden: Chat aktualisieren + Push =====
create or replace function public.after_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $BODY$
declare
  v_thread public.chat_threads;
  v_recipient uuid;
  v_name text;
begin
  if new.thread_id is not null then
    update public.chat_threads
    set last_message_at = new.created_at,
        a_read_at = case when user_a = new.sender_id then new.created_at else a_read_at end,
        b_read_at = case when user_b = new.sender_id then new.created_at else b_read_at end
    where id = new.thread_id
    returning * into v_thread;

    v_recipient := case when v_thread.user_a = new.sender_id then v_thread.user_b else v_thread.user_a end;
    select first_name into v_name from public.profiles where id = new.sender_id;

    perform public.send_push_to_user(
      v_recipient,
      'Neue Nachricht von ' || coalesce(v_name, 'jemandem'),
      left(new.body, 120)
    );
  else
    update public.group_members
    set chat_read_at = new.created_at
    where group_id = new.group_id and user_id = new.sender_id;
  end if;
  return new;
end;
$BODY$;

create trigger after_chat_message
  after insert on public.chat_messages
  for each row execute function public.after_chat_message();

revoke all on function public.after_chat_message() from public, anon, authenticated;

-- ===== 5. Funktionen fuer die App =====

-- Direkt-Chat mit p_other starten (oder den bestehenden zurueckgeben).
create or replace function public.start_chat(p_other uuid, p_post_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $BODY$
declare
  v_me uuid := auth.uid();
  v_id uuid;
begin
  if v_me is null then
    raise exception 'Nicht angemeldet';
  end if;
  if p_other is null or p_other = v_me then
    raise exception 'Ungueltiger Empfaenger';
  end if;
  if coalesce((select is_banned from public.profiles where id = v_me), false) then
    raise exception 'Konto gesperrt';
  end if;
  if not exists (select 1 from public.profiles where id = p_other and not is_banned) then
    raise exception 'Empfaenger nicht gefunden';
  end if;
  if public.is_blocked_between(p_other) then
    raise exception 'blocked';
  end if;

  insert into public.chat_threads (user_a, user_b, post_id)
  values (least(v_me, p_other), greatest(v_me, p_other), p_post_id)
  on conflict (user_a, user_b)
  do update set post_id = coalesce(excluded.post_id, public.chat_threads.post_id)
  returning id into v_id;

  return v_id;
end;
$BODY$;

revoke all on function public.start_chat(uuid, uuid) from public, anon;
grant execute on function public.start_chat(uuid, uuid) to authenticated;

-- Direkt-Chat als gelesen markieren
create or replace function public.mark_chat_read(p_thread_id uuid)
returns void
language sql
security definer
set search_path = public
as $BODY$
  update public.chat_threads
  set a_read_at = case when user_a = auth.uid() then now() else a_read_at end,
      b_read_at = case when user_b = auth.uid() then now() else b_read_at end
  where id = p_thread_id and auth.uid() in (user_a, user_b);
$BODY$;

revoke all on function public.mark_chat_read(uuid) from public, anon;
grant execute on function public.mark_chat_read(uuid) to authenticated;

-- Gruppen-Chat als gelesen markieren
create or replace function public.mark_group_chat_read(p_group_id uuid)
returns void
language sql
security definer
set search_path = public
as $BODY$
  update public.group_members
  set chat_read_at = now()
  where group_id = p_group_id and user_id = auth.uid();
$BODY$;

revoke all on function public.mark_group_chat_read(uuid) from public, anon;
grant execute on function public.mark_group_chat_read(uuid) to authenticated;

-- Meine Direkt-Chats fuer die Uebersicht. INVOKER: RLS liefert nur eigene Chats.
create or replace function public.my_chat_threads()
returns table (
  id uuid,
  other_id uuid,
  other_first_name text,
  post_id uuid,
  post_body text,
  last_message_at timestamptz,
  last_body text,
  last_from_me boolean,
  unread boolean,
  blocked boolean
)
language sql
stable
set search_path = public
as $BODY$
  select
    t.id,
    o.other_id,
    pp.first_name,
    t.post_id,
    left(bp.body, 80),
    t.last_message_at,
    lm.body,
    lm.sender_id = auth.uid(),
    coalesce(lm.sender_id <> auth.uid()
      and lm.created_at > coalesce(case when t.user_a = auth.uid() then t.a_read_at else t.b_read_at end, '-infinity'), false),
    public.is_blocked_between(o.other_id)
  from public.chat_threads t
  cross join lateral (select case when t.user_a = auth.uid() then t.user_b else t.user_a end as other_id) o
  left join public.public_profiles pp on pp.id = o.other_id
  left join public.board_posts bp on bp.id = t.post_id
  left join lateral (
    select m.body, m.sender_id, m.created_at
    from public.chat_messages m
    where m.thread_id = t.id
    order by m.created_at desc
    limit 1
  ) lm on true
  order by coalesce(t.last_message_at, t.created_at) desc;
$BODY$;

revoke all on function public.my_chat_threads() from public, anon;
grant execute on function public.my_chat_threads() to authenticated;

-- Anzahl ungelesener Unterhaltungen (Direkt-Chats + Gruppen-Chats) fuer das Abzeichen.
create or replace function public.my_unread_count()
returns integer
language sql
stable
set search_path = public
as $BODY$
  select (
    (select count(*) from public.my_chat_threads() c where c.unread)
    +
    (select count(*) from public.group_members gm
     where gm.user_id = auth.uid() and gm.status = 'active'
       and exists (
         select 1 from public.chat_messages m
         where m.group_id = gm.group_id
           and m.sender_id <> auth.uid()
           and m.created_at > coalesce(gm.chat_read_at, gm.joined_at)
       ))
  )::integer;
$BODY$;

revoke all on function public.my_unread_count() from public, anon;
grant execute on function public.my_unread_count() to authenticated;

-- ===== 6. Brett: Gesuche blockierter Personen ausblenden (beide Richtungen) =====
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
    and not public.is_blocked_between(bp.author_id)
  order by bp.created_at desc;
$BODY$;

revoke all on function public.board_feed(integer) from public, anon;
grant execute on function public.board_feed(integer) to authenticated;

-- ===== 7. Live-Updates =====
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.chat_threads;

notify pgrst, 'reload schema';
