<template>
  <q-page class="q-px-md q-pb-xl">
    <div style="max-width: 720px; margin: 0 auto">
      <div class="row items-center justify-between q-pt-lg">
        <div class="nx-display" style="font-size: 24px">Brett</div>
        <q-btn-dropdown
          unelevated
          no-caps
          rounded
          color="dark"
          icon="place"
          :label="`${radius} km`"
          dropdown-icon="expand_more"
          content-class="nx-radius-menu"
        >
          <q-list style="min-width: 140px">
            <q-item
              v-for="r in radiusOptions"
              :key="r"
              v-close-popup
              clickable
              :active="r === radius"
              active-class="text-primary"
              @click="setRadius(r)"
            >
              <q-item-section>Umkreis {{ r }} km</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>

      <SportChips v-model="sportFilter" class="q-mt-md" />

      <div v-if="loading" class="text-center q-pa-lg">
        <q-spinner size="32px" color="primary" />
      </div>

      <div v-else-if="noLocation" class="nx-note nx-note--warning q-mt-md">
        Bitte hinterlege zuerst deine Stadt im
        <router-link to="/profile">Profil</router-link>,
        damit wir Gesuche in deiner Nähe zeigen können.
      </div>

      <EmptyState
        v-else-if="loadError"
        icon="cloud_off"
        title="Gesuche konnten nicht geladen werden"
        text="Prüfe deine Internetverbindung und versuche es erneut."
      >
        <q-btn outline color="primary" icon="refresh" label="Erneut versuchen" @click="load()" />
      </EmptyState>

      <EmptyState
        v-else-if="filtered.length === 0"
        icon="search"
        :title="sportFilter ? 'Keine Gesuche zu dieser Sportart' : `Noch nichts im Umkreis von ${radius} km`"
        :text="sportFilter ? 'Wähle eine andere Sportart oder starte selbst ein Gesuch.' : 'Vergrößere den Umkreis oder starte selbst das erste Gesuch.'"
      >
        <q-btn color="primary" unelevated icon="add" label="Gesuch aufgeben" to="/board/new" />
      </EmptyState>

      <div v-else class="column q-gutter-sm q-mt-md">
        <PostCard v-for="(post, i) in filtered" :key="post.id" :post="post" :featured="i === 0">
          <template #actions>
            <q-btn
              v-if="post.author_id === authStore.user?.id"
              flat dense round icon="delete" color="grey" size="sm" aria-label="Löschen"
              @click="onDelete(post.id)"
            />
            <q-btn v-else flat dense round icon="more_horiz" color="grey" size="sm" aria-label="Optionen">
              <q-menu>
                <q-list style="min-width: 160px">
                  <q-item v-close-popup clickable @click="openReport('post', post)">
                    <q-item-section>Gesuch melden</q-item-section>
                  </q-item>
                  <q-item v-close-popup clickable @click="openReport('profile', post)">
                    <q-item-section>Nutzer melden</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </template>
        </PostCard>
      </div>
    </div>

    <ReportDialog
      v-model="reportOpen"
      :title="reportKind === 'post' ? 'Gesuch melden' : 'Nutzer melden'"
      @submit="onReport"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import ReportDialog from '@/components/ReportDialog.vue';
import EmptyState from '@/components/EmptyState.vue';
import PostCard from '@/components/PostCard.vue';
import SportChips from '@/components/SportChips.vue';
import { useBoardStore } from '@/stores/board-store';
import { useAuthStore } from '@/stores/auth-store';
import { useModerationStore } from '@/stores/moderation-store';
import { useRealtime } from '@/composables/useRealtime';
import { notifyError } from '@/utils/notify';
import type { BoardFeedItem } from '@/types/board';
import type { ReportReason } from '@/types/report';

const $q = useQuasar();
const boardStore = useBoardStore();
const authStore = useAuthStore();
const moderationStore = useModerationStore();

const radius = ref(20);
const feed = ref<BoardFeedItem[]>([]);
const loading = ref(true);
const noLocation = ref(false);
const loadError = ref(false);

const reportOpen = ref(false);
const reportKind = ref<'post' | 'profile'>('post');
const reportTarget = ref<BoardFeedItem | null>(null);

function openReport(kind: 'post' | 'profile', post: BoardFeedItem) {
  reportKind.value = kind;
  reportTarget.value = post;
  reportOpen.value = true;
}

async function onReport(reason: ReportReason) {
  if (!reportTarget.value) return;
  try {
    if (reportKind.value === 'post') {
      await moderationStore.reportPost(reportTarget.value.id, reason);
    } else {
      await moderationStore.reportProfile(reportTarget.value.author_id, reason);
    }
    $q.notify({ message: 'Danke, die Meldung ist eingegangen.', color: 'positive', timeout: 2000 });
    await load();
  } catch {
    $q.notify({ message: 'Melden fehlgeschlagen. Evtl. schon gemeldet?', color: 'negative', timeout: 2500 });
  } finally {
    reportOpen.value = false;
  }
}

const radiusOptions = [5, 10, 20, 50];
const sportFilter = ref<string | null>(null);
const filtered = computed(() =>
  sportFilter.value ? feed.value.filter((p) => p.sport === sportFilter.value) : feed.value,
);

function setRadius(r: number) {
  radius.value = r;
  void load();
}

// silent = true bei Live-Aktualisierungen: kein Ladebalken, kein Flackern.
async function load(silent = false) {
  if (!silent) loading.value = true;
  noLocation.value = false;
  try {
    if (!authStore.profile?.city) {
      noLocation.value = true;
      feed.value = [];
      return;
    }
    feed.value = await boardStore.fetchFeed(radius.value);
    loadError.value = false;
  } catch {
    // Bei stillen Live-Aktualisierungen den bisherigen Feed stehen lassen.
    if (!silent) loadError.value = true;
  } finally {
    if (!silent) loading.value = false;
  }
}

// Live-Updates: neue/geloeschte Gesuche. Wir laden den Feed komplett neu, damit
// Umkreis, Zielgruppen-Filter und Shadow-Ban weiterhin serverseitig greifen.
useRealtime('board_posts', null, () => {
  void load(true);
});

function onDelete(id: string) {
  $q.dialog({
    title: 'Gesuch löschen',
    message: 'Möchtest du dein Gesuch wirklich löschen?',
    cancel: true,
  }).onOk(async () => {
    try {
      await boardStore.deletePost(id);
      feed.value = feed.value.filter((p) => p.id !== id);
    } catch {
      notifyError('Das Gesuch konnte nicht gelöscht werden.');
    }
  });
}

onMounted(() => load());
</script>
