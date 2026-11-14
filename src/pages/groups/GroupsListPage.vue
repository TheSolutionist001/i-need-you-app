<template>
  <q-page class="q-px-md q-pb-xl">
    <div class="row items-center justify-between q-pt-lg" style="max-width: 720px; margin: 0 auto 16px">
      <div class="nx-display" style="font-size: 24px">Meine Gruppen</div>
      <q-btn color="primary" unelevated icon="add" label="Gründen" to="/groups/new" no-caps />
    </div>

    <div style="max-width: 720px; margin: 0 auto">
      <div v-if="loading" class="text-center q-pa-lg">
        <q-spinner size="32px" color="primary" />
      </div>

      <EmptyState
        v-else-if="loadError"
        icon="cloud_off"
        title="Gruppen konnten nicht geladen werden"
        text="Prüfe deine Internetverbindung und versuche es erneut."
      >
        <q-btn outline color="primary" icon="refresh" label="Erneut versuchen" @click="load" />
      </EmptyState>

      <EmptyState
        v-else-if="groupsStore.myGroups.length === 0"
        icon="groups"
        title="Noch keine Gruppen"
        text="Erstelle deine erste Gruppe oder tritt über einen Einladelink bei, den dir jemand schickt."
      >
        <q-btn color="primary" unelevated icon="add" label="Gruppe erstellen" to="/groups/new" />
      </EmptyState>

      <div v-else class="row q-col-gutter-md">
        <div v-for="group in groupsStore.myGroups" :key="group.id" class="col-12 col-sm-6">
          <GroupCard :group="group" />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import EmptyState from '@/components/EmptyState.vue';
import GroupCard from '@/components/GroupCard.vue';
import { useGroupsStore } from '@/stores/groups-store';
import { useAuthStore } from '@/stores/auth-store';
import { useRealtime } from '@/composables/useRealtime';

const groupsStore = useGroupsStore();
const authStore = useAuthStore();
const loading = ref(true);
const loadError = ref(false);

async function load() {
  loading.value = true;
  try {
    await groupsStore.fetchMyGroups();
    loadError.value = false;
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

// Live-Updates: eigene Mitgliedschaften (neu beigetreten, ausgetreten, entfernt).
useRealtime('group_members', `user_id=eq.${authStore.user?.id ?? ''}`, () => {
  groupsStore.fetchMyGroups().catch(() => {
    // Stille Aktualisierung: bei Fehler bleibt die bisherige Liste stehen.
  });
});
</script>
