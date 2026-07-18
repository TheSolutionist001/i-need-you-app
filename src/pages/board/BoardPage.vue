<template>
  <q-page class="q-pa-md">
    <div style="max-width: 600px; margin: 0 auto">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h6">Schwarzes Brett</div>
        <q-btn color="primary" unelevated icon="add" label="Gesuch" to="/board/new" no-caps />
      </div>

      <!-- Umkreis-Regler -->
      <q-card flat bordered class="q-pa-md q-mb-md">
        <div class="row items-center no-wrap q-gutter-md">
          <div class="text-caption text-grey" style="white-space: nowrap">Umkreis</div>
          <q-slider v-model="radius" :min="5" :max="50" :step="5" label label-always :label-value="`${radius} km`" color="primary" @change="load" />
        </div>
      </q-card>

      <div v-if="loading" class="text-center q-pa-lg">
        <q-spinner size="32px" color="primary" />
      </div>

      <q-banner v-else-if="noLocation" class="bg-orange-1 text-orange-9 rounded-borders">
        Bitte hinterlege zuerst deine Stadt im
        <router-link to="/profile" class="text-orange-9" style="text-decoration: underline">Profil</router-link>,
        damit wir Gesuche in deiner Nähe zeigen können.
      </q-banner>

      <div v-else-if="feed.length === 0" class="text-center text-grey q-pa-lg">
        Keine Gesuche im Umkreis von {{ radius }} km. Zieh den Regler weiter oder erstelle
        das erste Gesuch.
      </div>

      <q-list v-else bordered separator class="rounded-borders">
        <q-item v-for="post in feed" :key="post.id">
          <q-item-section avatar top>
            <q-avatar color="primary" text-color="white" size="36px">
              {{ (post.author_first_name?.[0] ?? '?').toUpperCase() }}
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label caption>
              {{ post.author_first_name ?? 'Unbekannt' }} · {{ formatDistance(post.distance_m) }}
            </q-item-label>
            <q-item-label class="q-mt-xs">{{ post.body }}</q-item-label>
            <q-item-label v-if="post.target_genders" caption class="q-mt-xs">
              <q-icon name="lock" size="12px" /> nur für: {{ genderLabels(post.target_genders) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side top>
            <q-btn
              v-if="post.author_id === authStore.user?.id"
              flat dense round icon="delete" color="grey" size="sm" aria-label="Löschen"
              @click="onDelete(post.id)"
            />
            <q-btn v-else flat dense round icon="more_vert" color="grey" size="sm" aria-label="Optionen">
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
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <ReportDialog
      v-model="reportOpen"
      :title="reportKind === 'post' ? 'Gesuch melden' : 'Nutzer melden'"
      @submit="onReport"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import ReportDialog from '@/components/ReportDialog.vue';
import { useBoardStore } from '@/stores/board-store';
import { useAuthStore } from '@/stores/auth-store';
import { useModerationStore } from '@/stores/moderation-store';
import { genderOptions, type Gender } from '@/types/profile';
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

function formatDistance(m: number): string {
  const km = m / 1000;
  return km < 1 ? 'unter 1 km entfernt' : `ca. ${Math.round(km)} km entfernt`;
}

function genderLabels(values: Gender[]): string {
  return values.map((v) => genderOptions.find((o) => o.value === v)?.label ?? v).join(', ');
}

async function load() {
  loading.value = true;
  noLocation.value = false;
  try {
    if (!authStore.profile?.city) {
      noLocation.value = true;
      feed.value = [];
      return;
    }
    feed.value = await boardStore.fetchFeed(radius.value);
  } finally {
    loading.value = false;
  }
}

async function onDelete(id: string) {
  await boardStore.deletePost(id);
  feed.value = feed.value.filter((p) => p.id !== id);
}

onMounted(load);
</script>
