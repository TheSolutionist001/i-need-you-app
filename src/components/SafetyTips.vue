<template>
  <div class="nx-note nx-note--info nx-tips">
    <div class="row items-start no-wrap">
      <q-icon name="shield" size="20px" class="q-mr-sm q-mt-xs" />
      <div class="col">
        <div class="text-weight-bold q-mb-xs">Sicher treffen</div>
        <ul>
          <li>Triff dich beim ersten Mal an einem öffentlichen Ort.</li>
          <li>Sag jemandem Bescheid, wo und mit wem du unterwegs bist.</li>
          <li>Schreib erst hier in der App, bevor du deine Nummer teilst.</li>
          <li>Komisches Gefühl? Blockieren oder melden geht über das Menü oben rechts.</li>
        </ul>
      </div>
      <q-btn flat round dense size="sm" icon="close" aria-label="Tipps ausblenden" @click="emit('close')" />
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ close: [] }>();
</script>

<style scoped>
.nx-tips ul {
  margin: 0;
  padding-left: 18px;
}
.nx-tips li {
  margin: 2px 0;
}
</style>
