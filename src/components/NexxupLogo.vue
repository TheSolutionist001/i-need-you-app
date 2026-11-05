<template>
  <div class="nx-logo column items-center" :class="{ 'nx-logo--row': row }">
    <!-- Bildmarke "Schulter an Schulter" (Claude Design, Runde 6, Variante 6a) -->
    <svg
      :width="size"
      :height="Math.round(size * 0.65)"
      viewBox="0 0 200 130"
      role="img"
      aria-label="Nexxup"
    >
      <path d="M16 130 L4 74 Q4 54 24 54 L68 54 Q88 54 88 74 L76 130 Z" :fill="figure" />
      <circle cx="46" cy="34" r="15" :fill="figure" />
      <path d="M124 130 L112 74 Q112 54 132 54 L176 54 Q196 54 196 74 L184 130 Z" :fill="figure" />
      <circle cx="154" cy="34" r="15" :fill="figure" />
      <!-- Freistellung der mittleren Figur in Hintergrundfarbe -->
      <path
        d="M70 130 L58 63 Q58 43 78 43 L122 43 Q142 43 142 63 L130 130 Z"
        :fill="cutout"
        :stroke="cutout"
        stroke-width="12"
        stroke-linejoin="round"
      />
      <circle cx="100" cy="22" r="22" :fill="cutout" />
      <path d="M70 130 L58 63 Q58 43 78 43 L122 43 Q142 43 142 63 L130 130 Z" :fill="accent" />
      <circle cx="100" cy="22" r="16" :fill="accent" />
      <path d="M66 62 Q44 58 18 70" fill="none" :stroke="cutout" stroke-width="26" stroke-linecap="round" />
      <path d="M66 62 Q44 58 18 70" fill="none" :stroke="accent" stroke-width="15" stroke-linecap="round" />
      <path d="M134 62 Q156 58 182 70" fill="none" :stroke="cutout" stroke-width="26" stroke-linecap="round" />
      <path d="M134 62 Q156 58 182 70" fill="none" :stroke="accent" stroke-width="15" stroke-linecap="round" />
    </svg>

    <div v-if="wordmark" class="column items-center">
      <div class="nx-logo__word" :style="{ fontSize: `${Math.round(size * 0.23)}px`, color: figure }">
        NEXXUP
      </div>
      <div v-if="tagline" class="nx-logo__tagline" :style="{ fontSize: `${Math.max(10, Math.round(size * 0.065))}px` }">
        SPORTS COMMUNITY APP
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    size?: number;
    wordmark?: boolean;
    tagline?: boolean;
    row?: boolean;
    // Farbe des Untergrunds, auf dem das Logo steht (fuer die Freistellung).
    background?: string;
  }>(),
  { size: 120, wordmark: false, tagline: false, row: false, background: '#16140f' },
);

const accent = '#ff5a1f';
// Auf dunklem Grund werden die aeusseren Figuren creme (wie die App-Icon-Variante).
const figure = '#f3efe8';
const cutout = computed(() => props.background);
</script>

<style scoped>
.nx-logo {
  gap: 10px;
}
.nx-logo--row {
  flex-direction: row;
  gap: 8px;
}
.nx-logo__word {
  font-family: 'Unbounded Variable', sans-serif;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
}
.nx-logo__tagline {
  margin-top: 8px;
  font-weight: 600;
  letter-spacing: 0.3em;
  color: var(--nx-muted);
}
</style>
