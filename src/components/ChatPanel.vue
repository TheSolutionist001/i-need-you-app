<template>
  <!-- Nachrichtenverlauf + Eingabe. Fuer Direkt-Chats (threadId) und
       Gruppen-Chats (groupId). Wer was lesen/schreiben darf, entscheidet die
       Datenbank (RLS) - hier wird nur angezeigt. -->
  <div class="nx-chat" :style="{ height }">
    <div ref="scrollEl" class="nx-chat__list">
      <div v-if="loading" class="text-center q-pa-lg">
        <q-spinner size="28px" color="primary" />
      </div>
      <div v-else-if="loadError" class="text-center text-grey q-pa-lg">
        Nachrichten konnten nicht geladen werden.
        <div><q-btn flat no-caps color="primary" label="Erneut versuchen" @click="load()" /></div>
      </div>
      <div v-else-if="messages.length === 0" class="text-center text-grey q-pa-lg">
        {{ emptyText }}
      </div>
      <template v-else>
        <div
          v-for="m in messages"
          :key="m.id"
          class="nx-msg"
          :class="m.sender_id === myId ? 'nx-msg--mine' : 'nx-msg--theirs'"
        >
          <div v-if="showNames && m.sender_id !== myId" class="nx-msg__name">{{ m.sender_first_name ?? 'Unbekannt' }}</div>
          <div class="nx-msg__bubble">{{ m.body }}</div>
          <div class="nx-msg__time">{{ formatChatTime(m.created_at) }}</div>
        </div>
      </template>
    </div>

    <div v-if="canWrite" class="nx-chat__input">
      <q-input
        v-model="draft"
        dense
        outlined
        autogrow
        maxlength="2000"
        placeholder="Nachricht schreiben …"
        class="col"
        input-style="max-height: 120px"
        @keydown.enter.exact.prevent="send"
      />
      <q-btn
        round
        unelevated
        color="primary"
        text-color="dark"
        icon="send"
        aria-label="Senden"
        :loading="sending"
        :disable="!draft.trim()"
        @click="send"
      />
    </div>
    <div v-else-if="disabledText" class="nx-chat__disabled">{{ disabledText }}</div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { useChatStore } from '@/stores/chat-store';
import { useRealtime } from '@/composables/useRealtime';
import { formatChatTime } from '@/utils/format';
import { notifyError } from '@/utils/notify';
import type { ChatMessageView } from '@/types/chat';

const props = withDefaults(
  defineProps<{
    threadId?: string;
    groupId?: string;
    myId: string | null;
    canWrite?: boolean;
    showNames?: boolean;
    height?: string;
    emptyText?: string;
    disabledText?: string;
  }>(),
  { canWrite: true, showNames: false, height: '420px', emptyText: 'Noch keine Nachrichten. Sag Hallo!', disabledText: '' },
);

const chatStore = useChatStore();
const target = props.threadId ? { threadId: props.threadId } : { groupId: props.groupId ?? '' };

const messages = ref<ChatMessageView[]>([]);
const loading = ref(true);
const loadError = ref(false);
const draft = ref('');
const sending = ref(false);
const scrollEl = ref<HTMLDivElement | null>(null);

async function scrollToBottom() {
  await nextTick();
  if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight;
}

async function load(silent = false) {
  if (!silent) loading.value = true;
  try {
    messages.value = await chatStore.fetchMessages(target);
    loadError.value = false;
    void chatStore.markRead(target);
    await scrollToBottom();
  } catch {
    if (!silent) loadError.value = true;
  } finally {
    if (!silent) loading.value = false;
  }
}

async function send() {
  const text = draft.value.trim();
  if (!text || sending.value) return;
  sending.value = true;
  try {
    await chatStore.sendMessage(target, text);
    draft.value = '';
    await load(true);
  } catch {
    notifyError('Die Nachricht konnte nicht gesendet werden.');
  } finally {
    sending.value = false;
  }
}

// Neue Nachrichten live (RLS: es kommen nur Nachrichten an, die ich lesen darf)
useRealtime(
  'chat_messages',
  props.threadId ? `thread_id=eq.${props.threadId}` : `group_id=eq.${props.groupId}`,
  () => void load(true),
);

onMounted(() => load());

defineExpose({ reload: () => load(true) });
</script>

<style scoped>
.nx-chat {
  display: flex;
  flex-direction: column;
  min-height: 260px;
  border-radius: 20px;
  background: var(--nx-surface);
  border: 1px solid rgba(243, 239, 232, 0.08);
  overflow: hidden;
}
.nx-chat__list {
  flex: 1;
  overflow-y: auto;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.nx-msg {
  display: flex;
  flex-direction: column;
  max-width: 80%;
}
.nx-msg--mine {
  align-self: flex-end;
  align-items: flex-end;
}
.nx-msg--theirs {
  align-self: flex-start;
  align-items: flex-start;
}
.nx-msg__name {
  font-size: 11px;
  color: var(--nx-muted);
  margin: 0 10px 2px;
}
.nx-msg__bubble {
  padding: 8px 12px;
  border-radius: 18px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.35;
}
.nx-msg--mine .nx-msg__bubble {
  background: var(--nx-accent);
  color: var(--nx-ink);
  border-bottom-right-radius: 6px;
}
.nx-msg--theirs .nx-msg__bubble {
  background: var(--nx-surface-2);
  color: var(--nx-cream);
  border-bottom-left-radius: 6px;
}
.nx-msg__time {
  font-size: 10px;
  color: var(--nx-muted);
  margin: 2px 8px 0;
}
.nx-chat__input {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px;
  border-top: 1px solid rgba(243, 239, 232, 0.08);
}
.nx-chat__disabled {
  padding: 12px;
  text-align: center;
  font-size: 13px;
  color: var(--nx-muted);
  border-top: 1px solid rgba(243, 239, 232, 0.08);
}
</style>
