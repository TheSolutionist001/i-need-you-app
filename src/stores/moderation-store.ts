import { defineStore } from 'pinia';
import { supabase } from '@/boot/supabase';
import { useAuthStore } from '@/stores/auth-store';
import type { AdminReport, ReportReason } from '@/types/report';

export const useModerationStore = defineStore('moderation', () => {
  async function reportPost(postId: string, reason: ReportReason): Promise<void> {
    const authStore = useAuthStore();
    if (!authStore.user) throw new Error('Nicht eingeloggt');
    const { error } = await supabase.from('reports').insert({
      reporter_id: authStore.user.id,
      reported_post_id: postId,
      reason,
    });
    if (error) throw error;
  }

  async function reportProfile(profileId: string, reason: ReportReason): Promise<void> {
    const authStore = useAuthStore();
    if (!authStore.user) throw new Error('Nicht eingeloggt');
    const { error } = await supabase.from('reports').insert({
      reporter_id: authStore.user.id,
      reported_profile_id: profileId,
      reason,
    });
    if (error) throw error;
  }

  async function listReports(): Promise<AdminReport[]> {
    const { data, error } = await supabase.rpc('admin_list_reports');
    if (error) throw error;
    return (data ?? []) as AdminReport[];
  }

  async function deletePost(postId: string): Promise<void> {
    const { error } = await supabase.rpc('admin_delete_post', { p_post_id: postId });
    if (error) throw error;
  }

  async function banUser(userId: string): Promise<void> {
    const { error } = await supabase.rpc('ban_user', { p_target_id: userId });
    if (error) throw error;
  }

  return { reportPost, reportProfile, listReports, deletePost, banUser };
});
