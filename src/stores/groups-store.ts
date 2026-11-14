import { ref } from 'vue';
import { defineStore } from 'pinia';
import { supabase } from '@/boot/supabase';
import type {
  DiscoverGroup,
  Group,
  GroupMemberStatus,
  GroupMemberWithName,
  GroupPreview,
  NewGroupInput,
} from '@/types/group';
import type { MeetupRsvp, PollView, RsvpStatus } from '@/types/group';
import type { Place } from '@/utils/geocode';
import { buildPollViews, type PollOptionRow, type PollRow, type PollVoteRow } from '@/utils/polls';
import { fetchFirstNames } from '@/stores/chat-store';

export const useGroupsStore = defineStore('groups', () => {
  const myGroups = ref<DiscoverGroup[]>([]);

  async function createGroup(input: NewGroupInput): Promise<string> {
    const { data, error } = await supabase.rpc('create_group', {
      p_name: input.name,
      p_description: input.description || null,
      p_max_members: input.maxMembers,
      p_sport: input.sport,
      p_next_meetup_at: input.nextMeetupAt,
      p_city: input.city,
      p_lat: input.lat,
      p_lng: input.lng,
    });
    if (error) throw error;
    const id = data as string;
    // Wiederholung separat setzen (Ersteller darf seine Gruppe aendern - RLS)
    if (input.repeatWeeks && input.nextMeetupAt) {
      const { error: repeatError } = await supabase
        .from('groups')
        .update({ meetup_repeat_weeks: input.repeatWeeks })
        .eq('id', id);
      if (repeatError) throw repeatError;
    }
    return id;
  }

  // radiusKm = null: nur eigene Gruppen (Mitglied oder Warteliste).
  // Sonst zusaetzlich oeffentliche Gruppen im Umkreis (serverseitig per RLS gefiltert).
  async function discoverGroups(radiusKm: number | null): Promise<DiscoverGroup[]> {
    const { data, error } = await supabase.rpc('discover_groups', { p_radius_km: radiusKm });
    if (error) throw error;
    return (data ?? []) as DiscoverGroup[];
  }

  async function fetchMyGroups() {
    myGroups.value = await discoverGroups(null);
  }

  async function fetchActiveCount(groupId: string): Promise<number> {
    const { data, error } = await supabase.rpc('group_active_count', { p_group_id: groupId });
    if (error) throw error;
    return (data as number) ?? 0;
  }

  // Termin + Wiederholung (null = einmalig). Ohne Termin keine Wiederholung.
  async function updateMeetup(groupId: string, nextMeetupAt: string | null, repeatWeeks: number | null = null): Promise<void> {
    const { error } = await supabase
      .from('groups')
      .update({ next_meetup_at: nextMeetupAt, meetup_repeat_weeks: nextMeetupAt ? repeatWeeks : null })
      .eq('id', groupId);
    if (error) throw error;
  }

  // --- Zusagen fuer den aktuellen Termin ---
  async function fetchRsvps(groupId: string, meetupAt: string): Promise<MeetupRsvp[]> {
    const { data, error } = await supabase
      .from('meetup_rsvps')
      .select('user_id, status')
      .eq('group_id', groupId)
      .eq('meetup_at', meetupAt);
    if (error) throw error;
    const rows = (data ?? []) as { user_id: string; status: RsvpStatus }[];
    const names = await fetchFirstNames(rows.map((r) => r.user_id));
    return rows.map((r) => ({ ...r, first_name: names.get(r.user_id) ?? null }));
  }

  async function setRsvp(groupId: string, status: RsvpStatus | null): Promise<void> {
    const { error } = await supabase.rpc('set_rsvp', { p_group_id: groupId, p_status: status });
    if (error) throw error;
  }

  // --- Umfragen ---
  async function fetchPolls(groupId: string, myId: string | null): Promise<PollView[]> {
    const { data: polls, error } = await supabase
      .from('group_polls')
      .select('id, question, created_by, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const pollRows = (polls ?? []) as PollRow[];
    if (pollRows.length === 0) return [];
    const ids = pollRows.map((p) => p.id);
    const [{ data: options, error: oErr }, { data: votes, error: vErr }] = await Promise.all([
      supabase.from('group_poll_options').select('id, poll_id, label, position').in('poll_id', ids),
      supabase.from('group_poll_votes').select('option_id, poll_id, user_id').in('poll_id', ids),
    ]);
    if (oErr) throw oErr;
    if (vErr) throw vErr;
    const voteRows = (votes ?? []) as PollVoteRow[];
    const names = await fetchFirstNames(voteRows.map((v) => v.user_id));
    return buildPollViews(pollRows, (options ?? []) as PollOptionRow[], voteRows, myId, names);
  }

  async function createPoll(groupId: string, question: string, options: string[]): Promise<void> {
    const { error } = await supabase.rpc('create_poll', {
      p_group_id: groupId,
      p_question: question.trim(),
      p_options: options.map((o) => o.trim()).filter(Boolean),
    });
    if (error) throw error;
  }

  async function setVote(pollId: string, optionId: string, on: boolean): Promise<void> {
    const { error } = on
      ? await supabase.from('group_poll_votes').insert({ poll_id: pollId, option_id: optionId })
      : // RLS erlaubt nur das Loeschen eigener Stimmen
        await supabase.from('group_poll_votes').delete().eq('option_id', optionId);
    if (error && error.code !== '23505') throw error;
  }

  async function deletePoll(pollId: string): Promise<void> {
    const { error } = await supabase.from('group_polls').delete().eq('id', pollId);
    if (error) throw error;
  }

  // Treffpunkt: nur fuer Mitglieder/Ersteller lesbar (RLS) - sonst null.
  async function fetchMeetupPlace(groupId: string): Promise<Place | null> {
    const { data, error } = await supabase
      .from('group_meetup_places')
      .select('name, address, lat, lng')
      .eq('group_id', groupId)
      .maybeSingle();
    if (error) throw error;
    return data as Place | null;
  }

  // Treffpunkt setzen/aendern (place) oder entfernen (null). Nur Ersteller (RLS).
  async function saveMeetupPlace(groupId: string, place: Place | null): Promise<void> {
    if (!place) {
      const { error } = await supabase.from('group_meetup_places').delete().eq('group_id', groupId);
      if (error) throw error;
      return;
    }
    const { error } = await supabase.from('group_meetup_places').upsert({
      group_id: groupId,
      name: place.name.slice(0, 200),
      address: place.address?.slice(0, 300) ?? null,
      lat: place.lat,
      lng: place.lng,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  async function fetchGroup(id: string): Promise<Group | null> {
    const { data, error } = await supabase.from('groups').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data as Group | null;
  }

  async function fetchMembers(groupId: string): Promise<GroupMemberWithName[]> {
    const { data: members, error } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });
    if (error) throw error;
    const rows = (members ?? []) as GroupMemberWithName[];

    if (rows.length === 0) return rows;

    // Namen separat laden (public_profiles ist eine View, kein einbettbarer FK).
    const ids = rows.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from('public_profiles')
      .select('id, first_name, city')
      .in('id', ids);

    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    return rows.map((m) => ({
      ...m,
      first_name: byId.get(m.user_id)?.first_name ?? null,
      city: byId.get(m.user_id)?.city ?? null,
    }));
  }

  async function joinGroup(groupId: string): Promise<GroupMemberStatus> {
    const { data, error } = await supabase.rpc('join_group', { p_group_id: groupId });
    if (error) throw error;
    return data as GroupMemberStatus;
  }

  async function leaveGroup(groupId: string): Promise<void> {
    const { error } = await supabase.rpc('leave_group', { p_group_id: groupId });
    if (error) throw error;
  }

  async function deleteGroup(groupId: string): Promise<void> {
    const { error } = await supabase.from('groups').delete().eq('id', groupId);
    if (error) throw error;
  }

  async function getGroupPreview(groupId: string): Promise<GroupPreview | null> {
    const { data, error } = await supabase
      .rpc('get_group_preview', { p_group_id: groupId })
      .maybeSingle();
    if (error) throw error;
    return data as GroupPreview | null;
  }

  async function togglePublic(groupId: string, value: boolean): Promise<void> {
    const { error } = await supabase
      .from('groups')
      .update({ is_public_event: value })
      .eq('id', groupId);
    if (error) throw error;
  }

  return {
    myGroups,
    createGroup,
    discoverGroups,
    fetchMyGroups,
    updateMeetup,
    fetchRsvps,
    setRsvp,
    fetchPolls,
    createPoll,
    setVote,
    deletePoll,
    fetchMeetupPlace,
    saveMeetupPlace,
    fetchActiveCount,
    fetchGroup,
    fetchMembers,
    joinGroup,
    leaveGroup,
    deleteGroup,
    getGroupPreview,
    togglePublic,
  };
});
