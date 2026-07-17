<template>
  <q-page class="flex flex-center">
    <q-card class="q-pa-lg" style="width: 100%; max-width: 420px">
      <div v-if="loading" class="text-center q-pa-md">
        <q-spinner size="32px" color="primary" />
      </div>

      <div v-else-if="!preview" class="text-center text-grey q-pa-md">
        Diese Einladung ist ungültig oder die Gruppe existiert nicht mehr.
      </div>

      <template v-else>
        <q-card-section>
          <div class="text-caption text-grey">Einladung zu</div>
          <div class="text-h6">{{ preview.name }}</div>
          <div v-if="preview.description" class="text-body2 text-grey q-mt-sm">
            {{ preview.description }}
          </div>
          <div class="text-caption text-grey q-mt-sm">
            {{ preview.active_count }} von {{ preview.max_members }} aktiven Mitgliedern
          </div>
        </q-card-section>

        <q-card-section>
          <q-banner v-if="preview.already_member" class="bg-blue-1 text-primary rounded-borders">
            Du bist bereits in dieser Gruppe.
          </q-banner>
          <q-banner v-else-if="preview.is_full" class="bg-orange-1 text-orange-9 rounded-borders">
            Die Gruppe ist voll — du kommst auf die Warteliste.
          </q-banner>

          <div v-if="errorMessage" class="text-negative text-caption q-mt-sm">{{ errorMessage }}</div>

          <q-btn
            v-if="preview.already_member"
            color="primary"
            label="Zur Gruppe"
            class="full-width q-mt-md"
            unelevated
            no-caps
            :to="`/groups/${groupId}`"
          />
          <q-btn
            v-else
            color="primary"
            :label="preview.is_full ? 'Auf Warteliste setzen' : 'Beitreten'"
            class="full-width q-mt-md"
            unelevated
            no-caps
            :loading="joining"
            @click="onJoin"
          />
        </q-card-section>
      </template>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useGroupsStore } from '@/stores/groups-store';
import type { GroupPreview } from '@/types/group';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const groupsStore = useGroupsStore();

const groupId = route.params.id as string;
const preview = ref<GroupPreview | null>(null);
const loading = ref(true);
const joining = ref(false);
const errorMessage = ref('');

onMounted(async () => {
  try {
    preview.value = await groupsStore.getGroupPreview(groupId);
  } catch {
    preview.value = null;
  } finally {
    loading.value = false;
  }
});

async function onJoin() {
  joining.value = true;
  errorMessage.value = '';
  try {
    const status = await groupsStore.joinGroup(groupId);
    $q.notify({
      message: status === 'active' ? 'Du bist der Gruppe beigetreten.' : 'Du stehst auf der Warteliste.',
      color: 'positive',
      timeout: 2000,
    });
    await router.push(`/groups/${groupId}`);
  } catch {
    errorMessage.value = 'Beitritt fehlgeschlagen. Bitte versuche es erneut.';
  } finally {
    joining.value = false;
  }
}
</script>
