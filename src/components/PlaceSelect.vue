<template>
  <!-- Suche nach einem konkreten Treffpunkt (Halle, Platz, Adresse) ueber OpenStreetMap. -->
  <q-select
    :model-value="modelValue"
    :options="options"
    :label="label ?? 'Treffpunkt'"
    option-label="name"
    use-input
    fill-input
    hide-selected
    clearable
    :input-debounce="350"
    :loading="searching"
    hint="z. B. „Soccerhalle Köln“, „Sportpark Müngersdorf“ oder eine Adresse"
    @filter="onFilter"
    @update:model-value="(p: Place | null) => emit('update:modelValue', p)"
  >
    <template #prepend><q-icon name="sports_soccer" /></template>
    <template #option="scope">
      <q-item v-bind="scope.itemProps">
        <q-item-section avatar><q-icon name="place" color="primary" /></q-item-section>
        <q-item-section>
          <q-item-label>{{ scope.opt.name }}</q-item-label>
          <q-item-label v-if="scope.opt.address" caption>{{ scope.opt.address }}</q-item-label>
        </q-item-section>
      </q-item>
    </template>
    <template #after-options>
      <div class="text-caption text-grey q-px-md q-py-xs">Daten © OpenStreetMap-Mitwirkende</div>
    </template>
    <template #no-option>
      <q-item>
        <q-item-section class="text-grey">{{ emptyText }}</q-item-section>
      </q-item>
    </template>
  </q-select>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { searchPlaces, type Place } from '@/utils/geocode';

const props = defineProps<{
  modelValue: Place | null;
  label?: string;
  // Suche auf diese Gegend gewichten (z. B. Wohnort)
  near?: { lat: number; lng: number } | null;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: Place | null] }>();

const options = ref<Place[]>([]);
const searching = ref(false);
const emptyText = ref('Mindestens 3 Zeichen eingeben');
let controller: AbortController | null = null;

function onFilter(val: string, update: (fn: () => void) => void) {
  const query = val.trim();
  if (query.length < 3) {
    update(() => {
      options.value = [];
      emptyText.value = 'Mindestens 3 Zeichen eingeben';
    });
    return;
  }
  controller?.abort();
  controller = new AbortController();
  const own = controller;
  searching.value = true;
  searchPlaces(query, props.near, own.signal)
    .then((result) => {
      update(() => {
        options.value = result;
        emptyText.value = 'Nichts gefunden – versuch es mit Straße und Ort';
      });
    })
    .catch(() => {
      if (own.signal.aborted) return;
      update(() => {
        options.value = [];
        emptyText.value = 'Ortssuche gerade nicht erreichbar – bitte später erneut versuchen';
      });
    })
    .finally(() => {
      if (controller === own) searching.value = false;
    });
}
</script>
