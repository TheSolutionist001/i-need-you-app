import { defineStore } from 'pinia';
import { supabase } from '@/boot/supabase';
import type { Gender } from '@/types/profile';
import type { BoardFeedItem } from '@/types/board';

export const useBoardStore = defineStore('board', () => {
  async function fetchFeed(radiusKm: number): Promise<BoardFeedItem[]> {
    const { data, error } = await supabase.rpc('board_feed', { p_radius_km: radiusKm });
    if (error) throw error;
    return (data ?? []) as BoardFeedItem[];
  }

  async function createPost(
    body: string,
    targetGenders: Gender[] | null,
    lat: number,
    lng: number,
  ): Promise<string> {
    const { data, error } = await supabase.rpc('create_board_post', {
      p_body: body,
      p_target_genders: targetGenders && targetGenders.length > 0 ? targetGenders : null,
      p_lat: lat,
      p_lng: lng,
    });
    if (error) throw error;
    return data as string;
  }

  async function deletePost(id: string): Promise<void> {
    const { error } = await supabase.from('board_posts').delete().eq('id', id);
    if (error) throw error;
  }

  return { fetchFeed, createPost, deletePost };
});
