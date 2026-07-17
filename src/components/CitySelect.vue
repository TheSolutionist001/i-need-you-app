<template>
  <q-select
    :model-value="modelValue"
    :options="options"
    :label="label"
    use-input
    input-debounce="0"
    clearable
    emit-value
    map-options
    option-value="name"
    option-label="name"
    @filter="onFilter"
    @update:model-value="onUpdate"
  >
    <template #no-option>
      <q-item>
        <q-item-section class="text-grey"> Keine passende Stadt gefunden </q-item-section>
      </q-item>
    </template>
  </q-select>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { germanCities, findCity, type City } from '@/data/german-cities';

// v-model ist der Stadtname (string). Beim Auswaehlen wird zusaetzlich das
// City-Objekt (mit Koordinaten) per "select" nach oben gereicht.
const props = defineProps<{
  modelValue: string | null;
  label?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  select: [city: City | null];
}>();

const label = props.label ?? 'Stadt';
const options = ref<City[]>(germanCities);

function onFilter(val: string, update: (fn: () => void) => void) {
  update(() => {
    const needle = val.toLowerCase();
    options.value = needle
      ? germanCities.filter((c) => c.name.toLowerCase().includes(needle))
      : germanCities;
  });
}

function onUpdate(value: string | null) {
  emit('update:modelValue', value);
  emit('select', findCity(value) ?? null);
}
</script>
