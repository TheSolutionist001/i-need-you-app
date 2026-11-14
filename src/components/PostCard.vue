<template>
  <!-- Grosse Variante mit Bildflaeche (neuestes Gesuch) -->
  <q-card v-if="featured" class="nx-post nx-post--featured">
    <div class="nx-post__cover" :style="{ background: sportGradient(post.sport) }">
      <div class="nx-post__emoji">{{ sport.emoji }}</div>
      <div class="nx-post__tags">
        <span class="nx-tag">{{ formatRelativeTime(post.created_at) }}</span>
        <span class="nx-tag">{{ distance }}</span>
      </div>
    </div>
    <div class="row no-wrap q-pa-md" style="gap: 12px">
      <q-avatar :style="avatarStyle" size="40px" class="text-weight-bold">{{ initial }}</q-avatar>
      <div class="col" style="min-width: 0">
        <div class="row no-wrap items-start">
          <div class="col text-weight-bold">{{ post.author_first_name ?? 'Unbekannt' }} · {{ sport.label }}</div>
          <slot name="actions" />
        </div>
        <div class="q-mt-xs nx-post__body">{{ post.body }}</div>
        <div v-if="post.target_genders" class="text-caption text-grey q-mt-xs">
          <q-icon name="lock" size="12px" /> nur für: {{ targetLabel }}
        </div>
        <div v-if="expiry" class="text-caption text-grey q-mt-xs">
          <q-icon name="schedule" size="12px" /> {{ expiry }}
        </div>
        <slot name="footer" />
      </div>
    </div>
  </q-card>

  <!-- Kompakte Variante -->
  <q-card v-else class="nx-post">
    <div class="row no-wrap q-pa-md" style="gap: 12px">
      <div class="nx-post__badge" :style="{ background: sportGradient(post.sport) }">{{ sport.emoji }}</div>
      <div class="col" style="min-width: 0">
        <div class="row no-wrap items-start">
          <div class="col text-weight-bold ellipsis">{{ sport.label }} · {{ post.author_first_name ?? 'Unbekannt' }}</div>
          <slot name="actions" />
        </div>
        <div class="q-mt-xs nx-post__body" :class="{ 'ellipsis-2-lines': clamp }">{{ post.body }}</div>
        <div class="text-caption text-grey q-mt-xs">
          {{ formatRelativeTime(post.created_at) }} · {{ distance }}
          <template v-if="post.target_genders"> · <q-icon name="lock" size="12px" /> {{ targetLabel }}</template>
          <template v-if="expiry"> · {{ expiry }}</template>
        </div>
        <slot name="footer" />
      </div>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getSport, sportGradient } from '@/data/sports';
import { formatDistanceShort, formatExpiry, formatRelativeTime } from '@/utils/format';
import { genderOptions } from '@/types/profile';
import type { BoardFeedItem } from '@/types/board';

const props = defineProps<{ post: BoardFeedItem; featured?: boolean; clamp?: boolean }>();

const sport = computed(() => getSport(props.post.sport));
const distance = computed(() => formatDistanceShort(props.post.distance_m) ?? '');
const expiry = computed(() => formatExpiry(props.post.expires_at));
const initial = computed(() => (props.post.author_first_name?.[0] ?? '?').toUpperCase());
const avatarStyle = computed(() => ({ background: sport.value.from, color: 'var(--nx-ink)' }));
const targetLabel = computed(() =>
  (props.post.target_genders ?? [])
    .map((v) => genderOptions.find((o) => o.value === v)?.label ?? v)
    .join(', '),
);
</script>

<style scoped>
.nx-post {
  border-radius: 20px;
  overflow: hidden;
}
.nx-post__cover {
  position: relative;
  height: 110px;
  overflow: hidden;
}
.nx-post__emoji {
  position: absolute;
  right: 16px;
  bottom: -10px;
  font-size: 84px;
  line-height: 1;
}
.nx-post__tags {
  position: absolute;
  left: 12px;
  top: 12px;
  display: flex;
  gap: 6px;
}
.nx-post__badge {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.nx-post__body {
  white-space: pre-line;
  word-break: break-word;
}
</style>
