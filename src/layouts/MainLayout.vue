<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>I need you</q-toolbar-title>

        <template v-if="authStore.isAuthenticated">
          <q-btn flat label="Brett" to="/board" no-caps />
          <q-btn flat label="Gruppen" to="/groups" no-caps />
          <q-btn v-if="authStore.profile?.is_admin" flat label="Moderation" to="/admin" no-caps />
          <q-btn flat round icon="account_circle" aria-label="Konto">
            <q-menu>
              <q-list style="min-width: 160px">
                <q-item v-close-popup clickable to="/profile">
                  <q-item-section>Profil</q-item-section>
                </q-item>
                <q-item v-close-popup clickable @click="onLogout">
                  <q-item-section>Abmelden</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </template>
        <template v-else>
          <q-btn flat label="Einloggen" to="/login" />
          <q-btn flat label="Registrieren" to="/register" />
        </template>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth-store';

const router = useRouter();
const authStore = useAuthStore();

async function onLogout() {
  await authStore.signOut();
  await router.push('/login');
}
</script>
