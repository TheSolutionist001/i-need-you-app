import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useChatStore } from '@/stores/chat-store';
import { notifyError } from '@/utils/notify';

// "Antworten" auf ein Gesuch: Direkt-Chat mit dem Ersteller oeffnen.
export function useStartChat() {
  const router = useRouter();
  const chatStore = useChatStore();
  const starting = ref<string | null>(null);

  async function replyTo(authorId: string, postId: string | null = null) {
    starting.value = postId ?? authorId;
    try {
      const threadId = await chatStore.startChat(authorId, postId);
      await router.push(`/messages/${threadId}`);
    } catch (e) {
      const msg = (e as { message?: string }).message ?? '';
      notifyError(msg.includes('blocked') ? 'Ihr könnt euch nicht schreiben (Blockierung).' : 'Der Chat konnte nicht geöffnet werden.');
    } finally {
      starting.value = null;
    }
  }

  return { replyTo, starting };
}
