import { ref } from 'vue';
import { defineStore } from 'pinia';
import { supabase } from '@/boot/supabase';
import type {
  Group,
  GroupMemberStatus,
  GroupMemberWithName,
  GroupPreview,
} from '@/types/group';

export const useGroupsStore = defineStore('groups', () => {
  const myGroups = ref<Group[]>([]);

  async function createGroup(name: string, description: string, maxMembers: number): Promise<string> {
    const { data, error } = await supabase.rpc('create_group', {
      p_name: name,
      p_description: description || null,
      p_max_members: maxMembers,
    });
    if (error) throw error;
    return data as string;
  }

  async function fetchMyGroups() {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    myGroups.value = (data ?? []) as Group[];
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
    fetchMyGroups,
    fetchGroup,
    fetchMembers,
    joinGroup,
    leaveGroup,
    deleteGroup,
    getGroupPreview,
    togglePublic,
  };
});
