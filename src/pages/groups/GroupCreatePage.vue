<template>
  <q-page class="flex flex-center">
    <q-card class="q-pa-lg" style="width: 100%; max-width: 420px">
      <q-card-section>
        <div class="text-h6">Gruppe erstellen</div>
        <div class="text-caption text-grey">Du wirst automatisch erstes Mitglied.</div>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md" @submit="onSubmit">
          <q-input
            v-model="name"
            label="Name"
            :rules="[(val: string) => !!val || 'Bitte einen Namen eingeben']"
          />
          <q-input v-model="description" label="Beschreibung (optional)" type="textarea" autogrow />
          <q-input
            v-model.number="maxMembers"
            label="Maximale Mitgliederzahl"
            type="number"
            :rules="[(val: number) => (val && val >= 1) || 'Mindestens 1']"
          />

          <div v-if="errorMessage" class="text-negative text-caption">{{ errorMessage }}</div>

          <div class="row q-gutter-sm">
            <q-btn label="Abbrechen" flat to="/groups" no-caps />
            <q-space />
            <q-btn
              type="submit"
              label="Erstellen"
              color="primary"
              unelevated
              :loading="loading"
              no-caps
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGroupsStore } from '@/stores/groups-store';

const router = useRouter();
const groupsStore = useGroupsStore();

const name = ref('');
const description = ref('');
const maxMembers = ref(5);
const loading = ref(false);
const errorMessage = ref('');

async function onSubmit() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const id = await groupsStore.createGroup(name.value, description.value, maxMembers.value);
    await router.push(`/groups/${id}`);
  } catch {
    errorMessage.value = 'Die Gruppe konnte nicht erstellt werden. Bitte versuche es erneut.';
  } finally {
    loading.value = false;
  }
}
</script>
