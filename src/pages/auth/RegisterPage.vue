<template>
  <div class="flex flex-center" style="min-height: 100vh">
    <q-card v-if="!registered" class="q-pa-lg" style="width: 100%; max-width: 360px">
      <q-card-section>
        <div class="text-h6">Konto erstellen</div>
        <div class="text-caption text-grey">Andere sehen nur deinen Vornamen und deine Stadt.</div>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md" @submit="onSubmit">
          <q-input
            v-model="firstName"
            label="Vorname"
            :rules="[(val: string) => !!val || 'Bitte Vorname eingeben']"
          />
          <q-input
            v-model="email"
            type="email"
            label="E-Mail"
            :rules="[(val: string) => !!val || 'Bitte E-Mail eingeben']"
          />
          <q-input
            v-model="password"
            type="password"
            label="Passwort"
            :rules="[(val: string) => (!!val && val.length >= 6) || 'Mindestens 6 Zeichen']"
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

          <div v-if="errorMessage" class="text-negative text-caption">{{ errorMessage }}</div>

          <q-btn
            type="submit"
            label="Registrieren"
            color="primary"
            class="full-width"
            unelevated
            :loading="loading"
          />
        </q-form>
      </q-card-section>

      <q-card-section class="text-center text-caption">
        Schon ein Konto?
        <router-link to="/login" class="text-primary">Einloggen</router-link>
      </q-card-section>
    </q-card>

    <q-card v-else class="q-pa-lg text-center" style="width: 100%; max-width: 360px">
      <q-card-section>
        <div class="text-h6">Fast geschafft</div>
        <p class="text-body2 q-mt-md">
          Wir haben eine E-Mail an <strong>{{ email }}</strong> geschickt. Bitte bestätige
          dein Konto über den Link darin, bevor du dich einloggst.
        </p>
      </q-card-section>
      <q-card-section>
        <router-link to="/login" class="text-primary">Zum Login</router-link>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import CitySelect from '@/components/CitySelect.vue';
import { useAuthStore } from '@/stores/auth-store';
import { genderOptions, type Gender } from '@/types/profile';
import type { City } from '@/data/german-cities';
import { getAuthErrorMessage } from '@/utils/auth-errors';

const router = useRouter();
const authStore = useAuthStore();

const firstName = ref('');
const email = ref('');
const password = ref('');
const gender = ref<Gender>('keine_angabe');
const city = ref<string | null>(null);
const selectedCity = ref<City | null>(null);
const loading = ref(false);
const errorMessage = ref('');
const cityError = ref('');
const registered = ref(false);

function onCity(c: City | null) {
  selectedCity.value = c;
  cityError.value = '';
}

async function onSubmit() {
  cityError.value = '';
  if (!selectedCity.value) {
    cityError.value = 'Bitte eine Stadt auswählen.';
    return;
  }
  loading.value = true;
  errorMessage.value = '';
  try {
    const { needsEmailConfirmation } = await authStore.signUp({
      email: email.value,
      password: password.value,
      firstName: firstName.value,
      gender: gender.value,
      city: selectedCity.value.name,
    });
    if (needsEmailConfirmation) {
      // E-Mail-Bestaetigung ist aktiv: Hinweis anzeigen, kein Auto-Login.
      registered.value = true;
    } else {
      // Bestaetigung aus: Nutzer ist sofort eingeloggt -> Standort setzen, weiter.
      await authStore.setLocation(selectedCity.value.lat, selectedCity.value.lng);
      await router.push('/');
    }
  } catch (error) {
    errorMessage.value = getAuthErrorMessage(error);
  } finally {
    loading.value = false;
  }
}
</script>
