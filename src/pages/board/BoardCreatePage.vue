<template>
  <q-page class="flex flex-center">
    <q-card class="q-pa-lg" style="width: 100%; max-width: 460px">
      <q-card-section>
        <div class="text-h6">Neues Gesuch</div>
        <div class="text-caption text-grey">Wer soll es sehen — und in welcher Stadt?</div>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md" @submit="onSubmit">
          <div>
            <div class="text-caption text-grey q-mb-xs">Sportart</div>
            <SportPicker v-model="sport" />
          </div>
          <q-input
            v-model="body"
            label="Dein Gesuch"
            type="textarea"
            autogrow
            :rules="[(val: string) => !!val.trim() || 'Bitte etwas schreiben']"
          />

          <q-select
            v-model="targetGenders"
            :options="genderOptions"
            label="Sichtbar für (leer = alle)"
            multiple
            emit-value
            map-options
            hint="Leer lassen, damit alle es sehen"
          />

          <CitySelect v-model="city" label="Stadt des Gesuchs" @select="onCity" />
          <div v-if="cityError" class="text-negative text-caption">{{ cityError }}</div>

          <q-select
            v-model="validDays"
            :options="validOptions"
            emit-value
            map-options
            label="Sichtbar für"
            hint="Danach verschwindet das Gesuch automatisch vom Brett"
          />

          <div v-if="errorMessage" class="text-negative text-caption">{{ errorMessage }}</div>

          <div class="row q-gutter-sm">
            <q-btn label="Abbrechen" flat to="/board" no-caps />
            <q-space />
            <q-btn type="submit" label="Veröffentlichen" color="primary" unelevated :loading="loading" no-caps />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import CitySelect from '@/components/CitySelect.vue';
import SportPicker from '@/components/SportPicker.vue';
import { useBoardStore } from '@/stores/board-store';
import { useAuthStore } from '@/stores/auth-store';
import { genderOptions, type Gender } from '@/types/profile';
import type { City } from '@/utils/geocode';

const router = useRouter();
const boardStore = useBoardStore();
const authStore = useAuthStore();

const body = ref('');
const sport = ref('sonstiges');
const targetGenders = ref<Gender[]>([]);
const city = ref<string | null>(null);
const selectedCity = ref<City | null>(null);
const loading = ref(false);
const errorMessage = ref('');
const cityError = ref('');
const validDays = ref(14);
const validOptions = [
  { label: '3 Tage', value: 3 },
  { label: '1 Woche', value: 7 },
  { label: '2 Wochen', value: 14 },
  { label: '30 Tage', value: 30 },
];

// Wohnort aus dem Profil vorbelegen (kann geaendert werden).
onMounted(async () => {
  try {
    const loc = await authStore.fetchMyLocation();
    const name = authStore.profile?.city;
    if (loc && name && !selectedCity.value) {
      city.value = name;
      selectedCity.value = { name, ...loc };
    }
  } catch {
    // Ohne Vorbelegung weiter.
  }
});

function onCity(c: City | null) {
  selectedCity.value = c;
  cityError.value = '';
}

async function onSubmit() {
  cityError.value = '';
  errorMessage.value = '';
  if (!selectedCity.value) {
    cityError.value = 'Bitte eine Stadt auswählen.';
    return;
  }
  loading.value = true;
  try {
    await boardStore.createPost(
      body.value.trim(),
      targetGenders.value,
      selectedCity.value.lat,
      selectedCity.value.lng,
      sport.value,
      validDays.value,
    );
    await router.push('/board');
  } catch {
    errorMessage.value = 'Das Gesuch konnte nicht veröffentlicht werden. Bitte erneut versuchen.';
  } finally {
    loading.value = false;
  }
}
</script>
