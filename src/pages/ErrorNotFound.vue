<template>
  <div class="fullscreen flex flex-center q-pa-md" style="background: var(--nx-bg)">
    <div class="column items-center text-center">
      <NexxupLogo :size="96" background="#12110d" />
      <div class="nx-display q-mt-lg" style="font-size: 56px; line-height: 1">404</div>
      <div class="text-grey q-mt-sm">Diese Seite gibt es nicht.</div>
      <q-btn class="q-mt-xl" color="primary" unelevated to="/" label="Zur Startseite" />
    </div>
  </div>
</template>

<script setup lang="ts">
import NexxupLogo from '@/components/NexxupLogo.vue';
</script>
