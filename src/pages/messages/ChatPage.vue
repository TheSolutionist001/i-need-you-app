<template>
  <q-page class="q-px-md q-pb-md">
    <div style="max-width: 640px; margin: 0 auto">
      <div class="row items-center no-wrap q-pt-md q-mb-sm">
        <q-btn flat round dense icon="arrow_back" to="/messages" aria-label="Zurück" />
        <div class="col q-ml-sm ellipsis">
          <div class="text-weight-bold ellipsis">{{ thread?.other_first_name ?? 'Unterhaltung' }}</div>
          <div v-if="thread?.post_body" class="text-caption text-grey ellipsis">Zu: {{ thread.post_body }}</div>
        </div>
        <q-btn v-if="thread" flat round dense icon="more_vert" aria-label="Optionen">
          <q-menu>
            <q-list style="min-width: 190px">
              <q-item v-if="!blockedByMe" v-close-popup clickable @click="onBlock">
                <q-item-section avatar><q-icon name="block" /></q-item-section>
                <q-item-section>Blockieren</q-item-section>
              </q-item>
              <q-item v-else v-close-popup clickable @click="onUnblock">
                <q-item-section avatar><q-icon name="lock_open" /></q-item-section>
                <q-item-section>Blockierung aufheben</q-item-section>
              </q-item>
              <q-item v-close-popup clickable @click="reportOpen = true">
                <q-item-section avatar><q-icon name="flag" /></q-item-section>
                <q-item-section>Nutzer melden</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>

      <div v-if="loading" class="text-center q-pa-lg"><q-spinner size="32px" color="primary" /></div>

      <EmptyState
        v-else-if="!thread"
        icon="lock"
        title="Unterhaltung nicht gefunden"
        text="Diese Unterhaltung gibt es nicht oder du hast keinen Zugriff."
      />

      <template v-else>
        <SafetyTips v-if="showTips" class="q-mb-sm" @close="hideTips" />
        <ChatPanel
          :key="thread.id + String(thread.blocked)"
          :thread-id="thread.id"
          :my-id="authStore.user?.id ?? null"
          :can-write="!thread.blocked"
          disabled-text="Ihr könnt euch nicht mehr schreiben (Blockierung)."
          :height="showTips ? 'calc(100dvh - 500px)' : 'calc(100dvh - 240px)'"
        />
      </template>
    </div>

    <ReportDialog v-model="reportOpen" title="Nutzer melden" @submit="onReport" />
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import ChatPanel from '@/components/ChatPanel.vue';
import EmptyState from '@/components/EmptyState.vue';
import ReportDialog from '@/components/ReportDialog.vue';
import SafetyTips from '@/components/SafetyTips.vue';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { useModerationStore } from '@/stores/moderation-store';
import { notifyError, notifySuccess } from '@/utils/notify';
import type { ChatThreadSummary } from '@/types/chat';
import type { ReportReason } from '@/types/report';

const route = useRoute();
const $q = useQuasar();
const authStore = useAuthStore();
const chatStore = useChatStore();
const moderationStore = useModerationStore();

const threadId = route.params.id as string;
const thread = ref<ChatThreadSummary | null>(null);
const loading = ref(true);
const blockedByMe = ref(false);
const reportOpen = ref(false);

// Sicherheitstipps einmal pro Geraet zeigen, bis man sie wegklickt
const TIPS_KEY = 'nx-safety-tips-hidden';
const showTips = ref(true);
try {
  showTips.value = localStorage.getItem(TIPS_KEY) !== '1';
} catch {
  showTips.value = true;
}
function hideTips() {
  showTips.value = false;
  try {
    localStorage.setItem(TIPS_KEY, '1');
  } catch {
    // ohne Speicher erscheinen die Tipps beim naechsten Mal wieder
  }
}

async function load() {
  try {
    thread.value = await chatStore.fetchThread(threadId);
    if (thread.value) {
      const blocked = await chatStore.fetchBlocked();
      blockedByMe.value = blocked.some((b) => b.blocked_id === thread.value?.other_id);
    }
  } catch {
    thread.value = null;
  } finally {
    loading.value = false;
  }
}

function onBlock() {
  if (!thread.value) return;
  const other = thread.value;
  $q.dialog({
    title: `${other.other_first_name ?? 'Person'} blockieren?`,
    message: 'Ihr könnt euch dann nicht mehr schreiben und seht eure Gesuche am Brett gegenseitig nicht mehr. Die Person wird nicht benachrichtigt.',
    cancel: true,
    ok: { label: 'Blockieren', color: 'negative', flat: true },
  }).onOk(async () => {
    try {
      await chatStore.blockUser(other.other_id);
      notifySuccess('Blockiert');
      await load();
    } catch {
      notifyError('Blockieren hat nicht geklappt.');
    }
  });
}

async function onUnblock() {
  if (!thread.value) return;
  try {
    await chatStore.unblockUser(thread.value.other_id);
    notifySuccess('Blockierung aufgehoben');
    await load();
  } catch {
    notifyError('Das hat nicht geklappt.');
  }
}

async function onReport(reason: ReportReason) {
  if (!thread.value) return;
  try {
    await moderationStore.reportProfile(thread.value.other_id, reason);
    notifySuccess('Danke, die Meldung ist eingegangen.');
  } catch {
    notifyError('Melden fehlgeschlagen. Evtl. schon gemeldet?');
  } finally {
    reportOpen.value = false;
  }
}

onMounted(load);
</script>
