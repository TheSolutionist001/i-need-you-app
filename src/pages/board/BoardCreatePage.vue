<template>
  <q-page class="flex flex-center">
    <q-card class="q-pa-lg" style="width: 100%; max-width: 460px">
      <q-card-section>
        <div class="text-h6">Neues Gesuch</div>
        <div class="text-caption text-grey">Wer soll es sehen — und in welcher Stadt?</div>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md" @submit="onSubmit">
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
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import CitySelect from '@/components/CitySelect.vue';
import { useBoardStore } from '@/stores/board-store';
import { genderOptions, type Gender } from '@/types/profile';
import type { City } from '@/data/german-cities';

const router = useRouter();
const boardStore = useBoardStore();

const body = ref('');
const targetGenders = ref<Gender[]>([]);
const city = ref<string | null>(null);
const selectedCity = ref<City | null>(null);
const loading = ref(false);
const errorMessage = ref('');
const cityError = ref('');

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
    );
    await router.push('/board');
  } catch {
    errorMessage.value = 'Das Gesuch konnte nicht veröffentlicht werden. Bitte erneut versuchen.';
  } finally {
    loading.value = false;
  }
}
</script>
