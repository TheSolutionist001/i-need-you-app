<template>
  <q-page class="q-pa-md">
    <div style="max-width: 700px; margin: 0 auto">
      <div class="text-h6 q-mb-md">Moderation</div>

      <div v-if="loading" class="text-center q-pa-lg">
        <q-spinner size="32px" color="primary" />
      </div>

      <div v-else-if="reports.length === 0" class="text-center text-grey q-pa-lg">
        Keine offenen Meldungen.
      </div>

      <q-list v-else bordered separator class="rounded-borders">
        <q-item v-for="r in reports" :key="r.report_id">
          <q-item-section>
            <q-item-label caption>
              {{ formatDate(r.created_at) }} · gemeldet von {{ r.reporter_name ?? 'Unbekannt' }}
              · Grund: {{ reasonLabel(r.reason) }}
            </q-item-label>

            <q-item-label v-if="r.kind === 'post'" class="q-mt-xs">
              <q-badge color="orange" label="Gesuch" class="q-mr-sm" />
              <span v-if="r.reported_post_body">„{{ r.reported_post_body }}"</span>
              <span v-else class="text-grey">(bereits gelöscht)</span>
            </q-item-label>
            <q-item-label v-else class="q-mt-xs">
              <q-badge color="purple" label="Nutzer" class="q-mr-sm" />
              {{ r.reported_profile_name ?? 'Unbekannt' }}
            </q-item-label>
          </q-item-section>

          <q-item-section side top>
            <div class="column q-gutter-xs">
              <q-btn
                v-if="r.kind === 'post' && r.reported_post_id"
                dense flat color="negative" label="Löschen" no-caps
                @click="onDeletePost(r.reported_post_id)"
              />
              <q-btn
                v-if="banTargetId(r)"
                dense flat color="negative" label="Sperren" no-caps
                @click="onBan(banTargetId(r)!, banTargetName(r))"
              />
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useModerationStore } from '@/stores/moderation-store';
import { reportReasonOptions, type AdminReport, type ReportReason } from '@/types/report';

const $q = useQuasar();
const moderationStore = useModerationStore();

const reports = ref<AdminReport[]>([]);
const loading = ref(true);

function reasonLabel(reason: ReportReason | null): string {
  if (!reason) return '—';
  return reportReasonOptions.find((o) => o.value === reason)?.label ?? reason;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

// Zu sperrende Person: bei Nutzer-Meldung das gemeldete Profil, bei Post-Meldung
// gibt es kein Autor-Feld in der Meldung -> nur Nutzer-Meldungen erlauben Sperren.
function banTargetId(r: AdminReport): string | null {
  return r.kind === 'profile' ? r.reported_profile_id : null;
}
function banTargetName(r: AdminReport): string {
  return r.reported_profile_name ?? 'diesen Nutzer';
}

async function load() {
  loading.value = true;
  try {
    reports.value = await moderationStore.listReports();
  } finally {
    loading.value = false;
  }
}

function onDeletePost(postId: string) {
  $q.dialog({
    title: 'Gesuch löschen',
    message: 'Das Gesuch wird für alle endgültig gelöscht. Fortfahren?',
    cancel: true,
  }).onOk(async () => {
    await moderationStore.deletePost(postId);
    $q.notify({ message: 'Gesuch gelöscht.', color: 'positive', timeout: 2000 });
    await load();
  });
}

function onBan(userId: string, name: string) {
  $q.dialog({
    title: 'Nutzer sperren',
    message: `${name} wird gesperrt. Inhalte werden entfernt, der Zugang gesperrt. Fortfahren?`,
    cancel: true,
  }).onOk(async () => {
    try {
      await moderationStore.banUser(userId);
      $q.notify({ message: 'Nutzer gesperrt.', color: 'positive', timeout: 2000 });
      await load();
    } catch {
      $q.notify({ message: 'Sperren nicht möglich (Admin/eigenes Konto?).', color: 'negative', timeout: 2500 });
    }
  });
}

onMounted(load);
</script>
