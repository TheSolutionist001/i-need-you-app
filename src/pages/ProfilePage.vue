<template>
  <q-page class="flex flex-center">
    <q-card class="q-pa-lg" style="width: 100%; max-width: 360px">
      <q-card-section class="text-center">
        <q-avatar color="primary" text-color="white" size="56px">
          {{ initials }}
        </q-avatar>
        <div class="text-h6 q-mt-sm">{{ authStore.profile?.first_name }}</div>
        <div class="text-caption text-grey">{{ authStore.profile?.city }}</div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <q-form class="q-gutter-md" @submit="onSave">
          <q-input
            v-model="firstName"
            label="Vorname"
            :rules="[(val: string) => !!val || 'Bitte Vorname eingeben']"
          />
          <q-select
            v-model="gender"
            :options="genderOptions"
            label="Geschlecht"
            emit-value
            map-options
          />
          <CitySelect v-model="city" @select="onCity" />
          <div v-if="cityError" class="text-negative text-caption">{{ cityError }}</div>

          <div v-if="successMessage" class="text-positive text-caption">{{ successMessage }}</div>
          <div v-if="errorMessage" class="text-negative text-caption">{{ errorMessage }}</div>

          <q-btn
            type="submit"
            label="Speichern"
            color="primary"
            class="full-width"
            unelevated
            :loading="loading"
          />
        </q-form>
      </q-card-section>

      <q-separator v-if="pushAvailable" />

      <q-card-section v-if="pushAvailable">
        <div class="text-subtitle2 q-mb-xs">Benachrichtigungen</div>
        <div v-if="pushEnabled" class="text-caption text-positive">
          <q-icon name="check_circle" size="16px" /> Aktiv — du wirst benachrichtigt, wenn
          du von einer Warteliste nachrückst.
        </div>
        <template v-else>
          <div class="text-caption text-grey q-mb-sm">
            Lass dich benachrichtigen, wenn du von einer Warteliste nachrückst.
          </div>
          <q-btn
            outline
            color="primary"
            label="Benachrichtigungen aktivieren"
            no-caps
            :loading="pushLoading"
            @click="onEnablePush"
          />
        </template>
      </q-card-section>

      <q-card-section class="text-center">
        <q-btn flat color="negative" label="Abmelden" @click="onLogout" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import CitySelect from '@/components/CitySelect.vue';
import { useAuthStore } from '@/stores/auth-store';
import { genderOptions, type Gender } from '@/types/profile';
import { findCity, type City } from '@/data/german-cities';
import { pushAvailable, isPushEnabled, requestPushPermission } from '@/utils/push';

const router = useRouter();
const authStore = useAuthStore();

const firstName = ref('');
const gender = ref<Gender>('keine_angabe');
const city = ref<string | null>(null);
const selectedCity = ref<City | null>(null);
const loading = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
const cityError = ref('');

watchEffect(() => {
  if (authStore.profile) {
    firstName.value = authStore.profile.first_name;
    gender.value = authStore.profile.gender ?? 'keine_angabe';
    city.value = authStore.profile.city ?? null;
    selectedCity.value = findCity(authStore.profile.city) ?? null;
  }
});

const initials = computed(() => (authStore.profile?.first_name?.[0] ?? '?').toUpperCase());

function onCity(c: City | null) {
  selectedCity.value = c;
  cityError.value = '';
}

async function onSave() {
  cityError.value = '';
  if (!selectedCity.value) {
    cityError.value = 'Bitte eine Stadt auswählen.';
    return;
  }
  loading.value = true;
  successMessage.value = '';
  errorMessage.value = '';
  try {
    await authStore.updateOwnProfile({
      first_name: firstName.value,
      gender: gender.value,
      city: selectedCity.value.name,
    });
    await authStore.setLocation(selectedCity.value.lat, selectedCity.value.lng);
    successMessage.value = 'Gespeichert.';
  } catch {
    errorMessage.value = 'Speichern fehlgeschlagen. Bitte versuche es erneut.';
  } finally {
    loading.value = false;
  }
}

const pushEnabled = ref(false);
const pushLoading = ref(false);

onMounted(async () => {
  if (pushAvailable) {
    pushEnabled.value = await isPushEnabled();
  }
});

async function onEnablePush() {
  pushLoading.value = true;
  try {
    pushEnabled.value = await requestPushPermission();
  } finally {
    pushLoading.value = false;
  }
}

async function onLogout() {
  await authStore.signOut();
  await router.push('/login');
}
</script>
