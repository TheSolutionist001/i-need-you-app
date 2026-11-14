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
import type { Place } from '@/utils/geocode';

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
    return data as string;
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

  async function updateMeetup(groupId: string, nextMeetupAt: string | null): Promise<void> {
    const { error } = await supabase
      .from('groups')
      .update({ next_meetup_at: nextMeetupAt })
      .eq('id', groupId);
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
