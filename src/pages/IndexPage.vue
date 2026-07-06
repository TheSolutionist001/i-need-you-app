<template>
  <q-page class="flex flex-center column">
    <div class="text-h6">Eingeloggt als {{ authStore.profile?.first_name }}</div>
    <div class="text-caption text-grey">{{ authStore.profile?.city }}</div>
  </q-page>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth-store';

const authStore = useAuthStore();
</script>
