<template>
  <div class="flex flex-center column q-pa-md" style="min-height: 100vh">
    <NexxupLogo :size="132" wordmark tagline background="#12110d" class="q-mb-xl" />
    <q-card class="q-pa-lg" style="width: 100%; max-width: 360px">
      <q-card-section>
        <div class="text-h6">Willkommen zurück</div>
        <div class="text-caption text-grey">Melde dich mit deiner E-Mail an.</div>
      </q-card-section>

      <q-card-section v-if="authStore.bannedNotice">
        <div class="nx-note nx-note--negative">Dein Konto wurde gesperrt.</div>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md" @submit="onSubmit">
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
            :rules="[(val: string) => !!val || 'Bitte Passwort eingeben']"
          />

          <div v-if="errorMessage" class="text-negative text-caption">{{ errorMessage }}</div>

          <q-btn
            type="submit"
            label="Einloggen"
            color="primary"
            class="full-width"
            unelevated
            :loading="loading"
          />
        </q-form>
      </q-card-section>

      <q-card-section class="text-center text-caption">
        Noch kein Konto?
        <router-link to="/register" class="text-primary">Registrieren</router-link>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import NexxupLogo from '@/components/NexxupLogo.vue';
import { useAuthStore } from '@/stores/auth-store';
import { getAuthErrorMessage } from '@/utils/auth-errors';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref('');

async function onSubmit() {
  loading.value = true;
  errorMessage.value = '';
  try {
    await authStore.signIn(email.value, password.value);
    await router.push('/');
  } catch (error) {
    errorMessage.value = getAuthErrorMessage(error);
  } finally {
    loading.value = false;
  }
}
</script>
