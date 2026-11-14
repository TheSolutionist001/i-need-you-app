-- ==========================================================================
-- Zusagen pro Termin, wiederkehrende Termine und Push-Erinnerungen
--
-- Laienfassung:
--  * groups.meetup_repeat_weeks: 1 = jede Woche, 2 = alle 2 Wochen ...
--    (leer = einmaliger Termin). Ist ein Termin vorbei (+3 Std.), rueckt das
--    Datum automatisch weiter.
--  * meetup_rsvps: "Bin dabei" / "Diesmal nicht" - gilt immer fuer genau
--    einen Termin (Datum). Aendert sich das Datum, beginnt die Abfrage neu.
--    Sehen duerfen das nur Gruppenmitglieder; zusagen nur aktive Mitglieder.
--  * process_meetups(): laeuft alle 15 Minuten automatisch (pg_cron),
--    schiebt wiederkehrende Termine weiter und verschickt Erinnerungen
--    ca. 24 Std. und ca. 2 Std. vorher (nicht an Leute mit "Diesmal nicht").
-- ==========================================================================

create extension if not exists pg_cron;

-- ===== 1. Wiederholung =====
alter table public.groups
  add column if not exists meetup_repeat_weeks smallint
  constraint groups_meetup_repeat_weeks_range check (meetup_repeat_weeks between 1 and 4);

-- ===== 2. Zusagen =====
create table public.meetup_rsvps (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  meetup_at timestamptz not null,
  status text not null constraint meetup_rsvps_status check (status in ('yes', 'no')),
  updated_at timestamptz not null default now(),
  primary key (group_id, user_id, meetup_at)
);

alter table public.meetup_rsvps enable row level security;

create policy "meetup_rsvps_select_members" on public.meetup_rsvps
  for select to authenticated
  using (public.has_group_membership(group_id) or public.is_group_creator(group_id));
-- Schreiben nur ueber set_rsvp() (prueft aktive Mitgliedschaft + aktuellen Termin).

revoke all on public.meetup_rsvps from anon;
grant select on public.meetup_rsvps to authenticated;

-- Zusage setzen ('yes' / 'no') oder zuruecknehmen (null) - fuer den aktuellen Termin.
create or replace function public.set_rsvp(p_group_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $BODY$
declare
  v_at timestamptz;
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'Nur aktive Mitglieder koennen zusagen';
  end if;
  if p_status is not null and p_status not in ('yes', 'no') then
    raise exception 'Ungueltiger Status';
  end if;

  select next_meetup_at into v_at from public.groups where id = p_group_id;
  if v_at is null or v_at < now() - interval '3 hours' then
    raise exception 'Kein anstehender Termin';
  end if;

  if p_status is null then
    delete from public.meetup_rsvps
    where group_id = p_group_id and user_id = auth.uid() and meetup_at = v_at;
  else
    insert into public.meetup_rsvps (group_id, user_id, meetup_at, status)
    values (p_group_id, auth.uid(), v_at, p_status)
    on conflict (group_id, user_id, meetup_at)
    do update set status = excluded.status, updated_at = now();
  end if;
end;
$BODY$;

revoke all on function public.set_rsvp(uuid, text) from public, anon;
grant execute on function public.set_rsvp(uuid, text) to authenticated;

-- ===== 3. Erinnerungen (Protokoll, damit jede Erinnerung nur einmal rausgeht) =====
create table public.meetup_reminders_sent (
  group_id uuid not null references public.groups(id) on delete cascade,
  meetup_at timestamptz not null,
  kind text not null,
  sent_at timestamptz not null default now(),
  primary key (group_id, meetup_at, kind)
);

alter table public.meetup_reminders_sent enable row level security;
-- Keine Policies: nur intern (process_meetups) nutzbar.
revoke all on public.meetup_reminders_sent from anon, authenticated;

-- ===== 4. Automatischer Lauf =====
create or replace function public.process_meetups()
returns void
language plpgsql
security definer
set search_path = public
as $BODY$
declare
  g record;
  m record;
  v_when text;
begin
  -- a) Wiederkehrende Termine weiterschieben (3 Std. nach Beginn)
  update public.groups
  set next_meetup_at = next_meetup_at
    + make_interval(weeks => meetup_repeat_weeks * (
        floor(extract(epoch from (now() - interval '3 hours' - next_meetup_at))
              / (meetup_repeat_weeks * 7 * 86400))::int + 1))
  where meetup_repeat_weeks is not null
    and next_meetup_at is not null
    and next_meetup_at < now() - interval '3 hours';

  -- b) Erinnerungen: ca. 24 Std. vorher und ca. 2 Std. vorher
  for g in
    select gr.id, gr.name, gr.next_meetup_at, k.kind
    from public.groups gr
    cross join (values ('24h', interval '24 hours'), ('2h', interval '2 hours')) as k(kind, lead_time)
    where gr.next_meetup_at is not null
      and gr.next_meetup_at > now()
      and gr.next_meetup_at - k.lead_time <= now()
      -- 24-Std.-Erinnerung nur, wenn der Termin noch mehr als 3 Std. entfernt ist
      and (k.kind = '2h' or gr.next_meetup_at > now() + interval '3 hours')
      and not exists (
        select 1 from public.meetup_reminders_sent s
        where s.group_id = gr.id and s.meetup_at = gr.next_meetup_at and s.kind = k.kind
      )
  loop
    insert into public.meetup_reminders_sent (group_id, meetup_at, kind)
    values (g.id, g.next_meetup_at, g.kind)
    on conflict do nothing;

    v_when := to_char(g.next_meetup_at at time zone 'Europe/Berlin', 'DD.MM. "um" HH24:MI "Uhr"');

    for m in
      select gm.user_id
      from public.group_members gm
      where gm.group_id = g.id and gm.status = 'active'
        and not exists (
          select 1 from public.meetup_rsvps r
          where r.group_id = g.id and r.user_id = gm.user_id
            and r.meetup_at = g.next_meetup_at and r.status = 'no'
        )
    loop
      perform public.send_push_to_user(
        m.user_id,
        case when g.kind = '24h' then 'Bald geht''s los: ' else 'Gleich geht''s los: ' end || g.name,
        'Termin am ' || v_when || '. Bist du dabei? Sag in der App kurz Bescheid.'
      );
    end loop;
  end loop;
end;
$BODY$;

revoke all on function public.process_meetups() from public, anon, authenticated;

-- Alle 15 Minuten ausfuehren (vorhandenen Job gleichen Namens ersetzen)
select cron.unschedule(jobid) from cron.job where jobname = 'nexxup-process-meetups';
select cron.schedule('nexxup-process-meetups', '*/15 * * * *', 'select public.process_meetups()');

-- ===== 5. Live-Updates =====
alter publication supabase_realtime add table public.meetup_rsvps;

notify pgrst, 'reload schema';
