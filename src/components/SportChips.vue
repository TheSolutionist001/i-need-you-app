<template>
  <!-- Waagerecht wischbare Sportart-Filter. v-model: Sport-Key oder null (= Alle) -->
  <div class="nx-chips">
    <button type="button" class="nx-chip" :class="{ 'nx-chip--on': modelValue === null }" @click="emit('update:modelValue', null)">
      Alle
    </button>
    <button
      v-for="s in list"
      :key="s.key"
      type="button"
      class="nx-chip"
      :class="{ 'nx-chip--on': modelValue === s.key }"
      @click="emit('update:modelValue', modelValue === s.key ? null : s.key)"
    >
      <span>{{ s.emoji }}</span>{{ s.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { sports } from '@/data/sports';

const props = defineProps<{
  modelValue: string | null;
  // Optional: nur diese Sportarten anzeigen (z. B. die, fuer die es Eintraege gibt)
  only?: string[];
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>();

const list = computed(() => (props.only ? sports.filter((s) => props.only?.includes(s.key)) : sports));
</script>
