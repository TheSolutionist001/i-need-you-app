<template>
  <!-- Auswahl genau einer Sportart (fuer Formulare). v-model: Sport-Key -->
  <div class="row q-gutter-xs">
    <button
      v-for="s in sports"
      :key="s.key"
      type="button"
      class="nx-chip"
      :class="{ 'nx-chip--on': modelValue === s.key }"
      @click="emit('update:modelValue', s.key)"
    >
      <span>{{ s.emoji }}</span>{{ s.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { sports } from '@/data/sports';

defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
</script>
