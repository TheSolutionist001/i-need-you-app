<template>
  <q-card v-ripple class="nx-gcard cursor-pointer" @click="router.push(target)">
    <div class="nx-gcard__cover" :style="{ background: sportGradient(group.sport) }">
      <div class="nx-gcard__emoji">{{ sport.emoji }}</div>
      <div class="nx-gcard__tags">
        <span v-if="group.next_meetup_at" class="nx-tag">{{ formatMeetup(group.next_meetup_at) }}</span>
        <span v-if="distance" class="nx-tag">{{ distance }}</span>
      </div>
      <div class="nx-gcard__free" :class="{ 'nx-gcard__free--full': freeSpots === 0 }">
        {{ freeLabel }}
      </div>
    </div>
    <div class="q-pa-md">
      <div class="nx-display ellipsis" style="font-size: 15px">{{ group.name }}</div>
      <div class="text-caption text-grey ellipsis">
        {{ sport.label }}<template v-if="group.city"> · {{ group.city }}</template>
      </div>
      <div class="row items-center no-wrap q-mt-sm">
        <div class="col">
          <div class="text-caption text-weight-bold">{{ group.active_count }}/{{ group.max_members }} dabei</div>
          <div class="nx-bar q-mt-xs"><span :style="{ width: `${fill}%` }" /></div>
        </div>
        <q-btn
          v-if="!group.my_status"
          class="q-ml-md"
          color="primary"
          unelevated
          dense
          padding="6px 14px"
          :label="freeSpots === 0 ? 'Warteliste' : 'Mitmachen'"
          @click.stop="router.push(target)"
        />
        <q-badge
          v-else
          class="q-ml-md"
          :color="group.my_status === 'active' ? 'positive' : 'warning'"
          :label="group.my_status === 'active' ? 'Dabei ✓' : 'Warteliste'"
        />
      </div>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { getSport, sportGradient } from '@/data/sports';
import { formatDistanceShort, formatMeetup } from '@/utils/format';
import type { DiscoverGroup } from '@/types/group';

const props = defineProps<{ group: DiscoverGroup }>();
const router = useRouter();

const sport = computed(() => getSport(props.group.sport));
const distance = computed(() => formatDistanceShort(props.group.distance_m));
const freeSpots = computed(() => Math.max(0, props.group.max_members - props.group.active_count));
const fill = computed(() => Math.min(100, (props.group.active_count / props.group.max_members) * 100));
const freeLabel = computed(() => {
  if (freeSpots.value === 0) return 'Voll · Warteliste';
  return freeSpots.value === 1 ? 'Noch 1 Platz' : `Noch ${freeSpots.value} Plätze`;
});
// Mitglieder landen direkt in der Gruppe, alle anderen auf der Beitrittsseite.
const target = computed(() =>
  props.group.my_status ? `/groups/${props.group.id}` : `/groups/join/${props.group.id}`,
);
</script>

<style scoped>
.nx-gcard {
  overflow: hidden;
  border-radius: 22px;
  transition: border-color 0.15s, transform 0.15s;
}
.nx-gcard:hover {
  border-color: rgba(255, 90, 31, 0.45);
}
.nx-gcard__cover {
  position: relative;
  height: 140px;
  overflow: hidden;
}
.nx-gcard__emoji {
  position: absolute;
  right: 12px;
  bottom: -14px;
  font-size: 96px;
  line-height: 1;
  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.35));
}
.nx-gcard__tags {
  position: absolute;
  left: 12px;
  top: 12px;
  display: flex;
  gap: 6px;
}
.nx-gcard__free {
  position: absolute;
  left: 12px;
  bottom: 12px;
  background: var(--nx-cream);
  color: var(--nx-ink);
  font-weight: 800;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
}
.nx-gcard__free--full {
  background: var(--nx-ink);
  color: var(--nx-cream);
}
</style>
