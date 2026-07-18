<template>
  <q-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
    <q-card style="min-width: 300px">
      <q-card-section>
        <div class="text-h6">{{ title }}</div>
        <div class="text-caption text-grey">Bitte wähle einen Grund.</div>
      </q-card-section>

      <q-card-section>
        <q-option-group v-model="reason" :options="reportReasonOptions" color="primary" />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Abbrechen" no-caps @click="emit('update:modelValue', false)" />
        <q-btn
          unelevated
          color="negative"
          label="Melden"
          no-caps
          :loading="loading"
          @click="onSubmit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { reportReasonOptions, type ReportReason } from '@/types/report';

defineProps<{
  modelValue: boolean;
  title: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [reason: ReportReason];
}>();

const reason = ref<ReportReason>('spam');
const loading = ref(false);

async function onSubmit() {
  loading.value = true;
  try {
    emit('submit', reason.value);
  } finally {
    loading.value = false;
  }
}
</script>
