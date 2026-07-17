<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md" style="max-width: 600px; margin: 0 auto">
      <div class="text-h6">Meine Gruppen</div>
      <q-btn color="primary" unelevated icon="add" label="Gruppe" to="/groups/new" no-caps />
    </div>

    <div style="max-width: 600px; margin: 0 auto">
      <div v-if="loading" class="text-center q-pa-lg">
        <q-spinner size="32px" color="primary" />
      </div>

      <div v-else-if="groupsStore.myGroups.length === 0" class="text-center text-grey q-pa-lg">
        Du bist noch in keiner Gruppe. Erstelle deine erste Gruppe oder tritt über einen
        Einladelink bei.
      </div>

      <q-list v-else bordered separator class="rounded-borders">
        <q-item
          v-for="group in groupsStore.myGroups"
          :key="group.id"
          clickable
          :to="`/groups/${group.id}`"
        >
          <q-item-section>
            <q-item-label>{{ group.name }}</q-item-label>
            <q-item-label caption>max. {{ group.max_members }} Mitglieder</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge v-if="group.is_public_event" color="green" label="Öffentlich" />
            <q-icon name="chevron_right" />
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useGroupsStore } from '@/stores/groups-store';

const groupsStore = useGroupsStore();
const loading = ref(true);

onMounted(async () => {
  try {
    await groupsStore.fetchMyGroups();
  } finally {
    loading.value = false;
  }
});
</script>
