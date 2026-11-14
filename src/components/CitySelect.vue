<template>
  <!-- Weltweite Ortssuche (OpenStreetMap). v-model = Ortsname, "select" liefert Koordinaten. -->
  <q-select
    :model-value="current"
    :options="options"
    :label="label ?? 'Stadt'"
    option-label="name"
    use-input
    fill-input
    hide-selected
    clearable
    :input-debounce="350"
    :loading="searching"
    hint="Ort eintippen und aus der Liste wählen"
    @filter="onFilter"
    @update:model-value="onUpdate"
  >
    <template #prepend><q-icon name="place" /></template>
    <template #option="scope">
      <q-item v-bind="scope.itemProps">
        <q-item-section>
          <q-item-label>{{ scope.opt.name }}</q-item-label>
          <q-item-label v-if="scope.opt.region" caption>{{ scope.opt.region }}</q-item-label>
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
import { computed, ref } from 'vue';
import { searchCities, type City } from '@/utils/geocode';

const props = defineProps<{
  modelValue: string | null;
  label?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  select: [city: City | null];
}>();

const options = ref<City[]>([]);
const searching = ref(false);
const emptyText = ref('Mindestens 2 Buchstaben eingeben');
let controller: AbortController | null = null;

// Bereits gespeicherter Ort (nur Name) als Anzeige-Wert
const current = computed<City | null>(() =>
  props.modelValue ? { name: props.modelValue, lat: 0, lng: 0 } : null,
);

function onFilter(val: string, update: (fn: () => void) => void) {
  const query = val.trim();
  if (query.length < 2) {
    update(() => {
      options.value = [];
      emptyText.value = 'Mindestens 2 Buchstaben eingeben';
    });
    return;
  }
  controller?.abort();
  controller = new AbortController();
  const own = controller;
  searching.value = true;
  searchCities(query, own.signal)
    .then((result) => {
      update(() => {
        options.value = result;
        emptyText.value = 'Kein passender Ort gefunden';
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

function onUpdate(city: City | null) {
  emit('update:modelValue', city?.name ?? null);
  emit('select', city);
}
</script>
