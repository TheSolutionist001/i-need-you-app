import { ref } from 'vue';
import { defineStore } from 'pinia';
import { supabase } from '@/boot/supabase';
import type { BlockedUser, ChatMessage, ChatMessageView, ChatThreadSummary } from '@/types/chat';

// Vornamen aus public_profiles nachladen (View -> kein einbettbarer Fremdschluessel)
export async function fetchFirstNames(ids: string[]): Promise<Map<string, string | null>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.from('public_profiles').select('id, first_name').in('id', unique);
  if (error) throw error;
  return new Map((data ?? []).map((p) => [p.id as string, (p.first_name as string | null) ?? null]));
}

export const useChatStore = defineStore('chat', () => {
  // Anzahl ungelesener Unterhaltungen (Abzeichen am Nachrichten-Symbol)
  const unreadCount = ref(0);

  async function refreshUnread(): Promise<void> {
    const { data, error } = await supabase.rpc('my_unread_count');
    if (!error) unreadCount.value = (data as number) ?? 0;
  }

  async function fetchThreads(): Promise<ChatThreadSummary[]> {
    const { data, error } = await supabase.rpc('my_chat_threads');
    if (error) throw error;
    return (data ?? []) as ChatThreadSummary[];
  }

  async function fetchThread(threadId: string): Promise<ChatThreadSummary | null> {
    const threads = await fetchThreads();
    return threads.find((t) => t.id === threadId) ?? null;
  }

  // Liefert die Chat-ID (bestehender oder neuer Chat). Wirft 'blocked', wenn blockiert.
  async function startChat(otherId: string, postId: string | null = null): Promise<string> {
    const { data, error } = await supabase.rpc('start_chat', { p_other: otherId, p_post_id: postId });
    if (error) throw error;
    return data as string;
  }

  async function fetchMessages(target: { threadId?: string; groupId?: string }, limit = 200): Promise<ChatMessageView[]> {
    let query = supabase.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(limit);
    query = target.threadId ? query.eq('thread_id', target.threadId) : query.eq('group_id', target.groupId ?? '');
    const { data, error } = await query;
    if (error) throw error;
    const rows = ((data ?? []) as ChatMessage[]).reverse();
    const names = await fetchFirstNames(rows.map((m) => m.sender_id));
    return rows.map((m) => ({ ...m, sender_first_name: names.get(m.sender_id) ?? null }));
  }

  async function sendMessage(target: { threadId?: string; groupId?: string }, body: string): Promise<void> {
    const text = body.trim().slice(0, 2000);
    if (!text) return;
    const { error } = await supabase.from('chat_messages').insert({
      thread_id: target.threadId ?? null,
      group_id: target.groupId ?? null,
      body: text,
    });
    if (error) throw error;
  }

  async function markRead(target: { threadId?: string; groupId?: string }): Promise<void> {
    if (target.threadId) await supabase.rpc('mark_chat_read', { p_thread_id: target.threadId });
    else if (target.groupId) await supabase.rpc('mark_group_chat_read', { p_group_id: target.groupId });
    await refreshUnread();
  }

  // --- Blockieren ---
  async function blockUser(userId: string): Promise<void> {
    const { error } = await supabase.from('user_blocks').insert({ blocked_id: userId });
    // 23505 = bereits blockiert -> kein Fehler fuer den Nutzer
    if (error && error.code !== '23505') throw error;
  }

  async function unblockUser(userId: string): Promise<void> {
    const { error } = await supabase.from('user_blocks').delete().eq('blocked_id', userId);
    if (error) throw error;
  }

  async function fetchBlocked(): Promise<BlockedUser[]> {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocked_id, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as { blocked_id: string; created_at: string }[];
    const names = await fetchFirstNames(rows.map((r) => r.blocked_id));
    return rows.map((r) => ({ ...r, first_name: names.get(r.blocked_id) ?? null }));
  }

  return {
    unreadCount,
    refreshUnread,
    fetchThreads,
    fetchThread,
    startChat,
    fetchMessages,
    sendMessage,
    markRead,
    blockUser,
    unblockUser,
    fetchBlocked,
  };
});
