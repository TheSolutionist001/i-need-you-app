<template>
  <q-page class="q-px-md q-pb-xl">
    <div style="max-width: 640px; margin: 0 auto">
      <div class="nx-display q-pt-lg q-mb-md" style="font-size: 24px">Nachrichten</div>

      <div v-if="loading" class="text-center q-pa-lg">
        <q-spinner size="32px" color="primary" />
      </div>

      <EmptyState
        v-else-if="loadError"
        icon="cloud_off"
        title="Nachrichten konnten nicht geladen werden"
        text="Prüfe deine Internetverbindung und versuche es erneut."
      >
        <q-btn outline color="primary" icon="refresh" label="Erneut versuchen" @click="load()" />
      </EmptyState>

      <template v-else>
        <!-- Gruppen-Chats -->
        <template v-if="groupChats.length > 0">
          <div class="text-subtitle2 text-grey q-mb-xs">Gruppen</div>
          <q-list class="nx-list q-mb-md">
            <q-item v-for="g in groupChats" :key="g.id" clickable :to="`/groups/${g.id}?chat=1`">
              <q-item-section avatar>
                <div class="nx-chat-avatar" :style="{ background: sportGradient(g.sport) }">{{ getSport(g.sport).emoji }}</div>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold">{{ g.name }}</q-item-label>
                <q-item-label caption>Gruppen-Chat</q-item-label>
              </q-item-section>
              <q-item-section side><q-icon name="chevron_right" /></q-item-section>
            </q-item>
          </q-list>
        </template>

        <!-- Direkt-Chats -->
        <div class="text-subtitle2 text-grey q-mb-xs">Direkt</div>
        <EmptyState
          v-if="threads.length === 0"
          icon="forum"
          title="Noch keine Unterhaltungen"
          text="Antworte am Brett auf ein Gesuch, um mit jemandem zu schreiben."
        >
          <q-btn color="primary" unelevated text-color="dark" icon="push_pin" label="Zum Brett" to="/board" />
        </EmptyState>
        <q-list v-else class="nx-list">
          <q-item v-for="t in threads" :key="t.id" clickable :to="`/messages/${t.id}`">
            <q-item-section avatar>
              <q-avatar color="primary" text-color="dark" class="text-weight-bold">
                {{ (t.other_first_name?.[0] ?? '?').toUpperCase() }}
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label :class="{ 'text-weight-bold': t.unread }">
                {{ t.other_first_name ?? 'Unbekannt' }}
                <q-icon v-if="t.blocked" name="block" size="14px" class="text-grey q-ml-xs" />
              </q-item-label>
              <q-item-label caption lines="1">
                <template v-if="t.last_body">{{ t.last_from_me ? 'Du: ' : '' }}{{ t.last_body }}</template>
                <template v-else-if="t.post_body">Zu: {{ t.post_body }}</template>
                <template v-else>Noch keine Nachricht</template>
              </q-item-label>
            </q-item-section>
            <q-item-section side top>
              <q-item-label v-if="t.last_message_at" caption>{{ formatChatTime(t.last_message_at) }}</q-item-label>
              <q-badge v-if="t.unread" rounded color="primary" class="q-mt-xs" />
            </q-item-section>
          </q-item>
        </q-list>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import EmptyState from '@/components/EmptyState.vue';
import { useChatStore } from '@/stores/chat-store';
import { useGroupsStore } from '@/stores/groups-store';
import { useRealtime } from '@/composables/useRealtime';
import { formatChatTime } from '@/utils/format';
import { getSport, sportGradient } from '@/data/sports';
import type { ChatThreadSummary } from '@/types/chat';
import type { DiscoverGroup } from '@/types/group';

const chatStore = useChatStore();
const groupsStore = useGroupsStore();

const threads = ref<ChatThreadSummary[]>([]);
const groupChats = ref<DiscoverGroup[]>([]);
const loading = ref(true);
const loadError = ref(false);

async function load(silent = false) {
  if (!silent) loading.value = true;
  try {
    const [t, g] = await Promise.all([chatStore.fetchThreads(), groupsStore.discoverGroups(null)]);
    threads.value = t;
    // Gruppen-Chat nur fuer aktive Mitglieder
    groupChats.value = g.filter((x) => x.my_status === 'active');
    loadError.value = false;
  } catch {
    if (!silent) loadError.value = true;
  } finally {
    if (!silent) loading.value = false;
  }
}

useRealtime('chat_messages', null, () => void load(true));

onMounted(() => load());
</script>

<style scoped>
.nx-list {
  border-radius: 20px;
  background: var(--nx-surface);
  overflow: hidden;
}
.nx-chat-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
</style>
