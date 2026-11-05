<template>
  <div class="column items-center text-center q-pa-xl">
    <div class="nx-empty__icon flex flex-center q-mb-md">
      <q-icon :name="icon" size="32px" />
    </div>
    <div class="text-subtitle1 text-weight-bold" style="line-height: 1.35">{{ title }}</div>
    <div v-if="text" class="text-body2 text-grey q-mt-xs" style="max-width: 320px">{{ text }}</div>
    <div v-if="$slots.default" class="q-mt-lg">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon: string;
  title: string;
  text?: string;
}>();
</script>

<style scoped>
.nx-empty__icon {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: var(--nx-surface-2);
  color: var(--nx-accent);
}
</style>
