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
          <q-input
            v-model="city"
            label="Stadt"
            :rules="[(val: string) => !!val || 'Bitte Stadt eingeben']"
          />

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

      <q-card-section class="text-center">
        <q-btn flat color="negative" label="Abmelden" @click="onLogout" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth-store';
import { genderOptions, type Gender } from '@/types/profile';

const router = useRouter();
const authStore = useAuthStore();

const firstName = ref('');
const gender = ref<Gender>('keine_angabe');
const city = ref('');
const loading = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

watchEffect(() => {
  if (authStore.profile) {
    firstName.value = authStore.profile.first_name;
    gender.value = authStore.profile.gender ?? 'keine_angabe';
    city.value = authStore.profile.city ?? '';
  }
});

const initials = computed(() => (authStore.profile?.first_name?.[0] ?? '?').toUpperCase());

async function onSave() {
  loading.value = true;
  successMessage.value = '';
  errorMessage.value = '';
  try {
    await authStore.updateOwnProfile({
      first_name: firstName.value,
      gender: gender.value,
      city: city.value,
    });
    successMessage.value = 'Gespeichert.';
  } catch {
    errorMessage.value = 'Speichern fehlgeschlagen. Bitte versuche es erneut.';
  } finally {
    loading.value = false;
  }
}

async function onLogout() {
  await authStore.signOut();
  await router.push('/login');
}
</script>
