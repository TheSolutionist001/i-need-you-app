<template>
  <!-- Treffpunkt mit "Route"-Knopf (oeffnet Google Maps Navigation) -->
  <q-card flat bordered class="q-pa-md">
    <div class="row items-start no-wrap" style="gap: 12px">
      <div class="nx-place-icon"><q-icon name="place" size="24px" /></div>
      <div class="col" style="min-width: 0">
        <div class="text-caption text-grey">Treffpunkt</div>
        <div class="text-weight-bold">{{ place.name }}</div>
        <div v-if="place.address" class="text-caption text-grey">{{ place.address }}</div>
      </div>
    </div>
    <div class="row q-gutter-sm q-mt-sm">
      <q-btn
        color="primary"
        unelevated
        no-caps
        icon="directions"
        label="Route in Google Maps"
        :href="googleMapsDirectionsUrl(place.lat, place.lng)"
        target="_blank"
        rel="noopener noreferrer"
      />
      <slot />
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { googleMapsDirectionsUrl, type Place } from '@/utils/geocode';

defineProps<{ place: Place }>();
</script>

<style scoped>
.nx-place-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(255, 90, 31, 0.14);
  color: var(--nx-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
