<template>
  <q-page class="flex flex-center column q-gutter-md">
    <div class="text-center">
      <div class="text-h6">Eingeloggt als {{ authStore.profile?.first_name }}</div>
      <div class="text-caption text-grey">{{ authStore.profile?.city }}</div>
    </div>
    <div class="row q-gutter-sm">
      <q-btn color="primary" unelevated icon="dashboard" label="Schwarzes Brett" to="/board" no-caps />
      <q-btn color="primary" outline icon="groups" label="Meine Gruppen" to="/groups" no-caps />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth-store';

const authStore = useAuthStore();
</script>
