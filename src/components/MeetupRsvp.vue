<template>
  <!-- Zusagen fuer den naechsten Termin (gilt nur fuer dieses Datum) -->
  <div class="nx-rsvp">
    <div v-if="canRsvp" class="row q-gutter-sm">
      <q-btn
        no-caps
        unelevated
        rounded
        icon="check"
        label="Bin dabei"
        :color="myStatus === 'yes' ? 'primary' : 'dark'"
        :text-color="myStatus === 'yes' ? 'dark' : 'white'"
        :loading="saving === 'yes'"
        @click="toggle('yes')"
      />
      <q-btn
        no-caps
        unelevated
        rounded
        icon="close"
        label="Diesmal nicht"
        :color="myStatus === 'no' ? 'grey-8' : 'dark'"
        :loading="saving === 'no'"
        @click="toggle('no')"
      />
    </div>
    <div class="text-caption text-grey q-mt-sm">
      <template v-if="yes.length > 0">
        <q-icon name="check_circle" size="14px" class="text-primary" />
        {{ yes.length }} dabei: {{ yes.map((r) => r.first_name ?? 'Unbekannt').join(', ') }}
      </template>
      <template v-else>Noch keine Zusagen.</template>
      <template v-if="no.length > 0"> · {{ no.length }} abgesagt</template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useGroupsStore } from '@/stores/groups-store';
import { useRealtime } from '@/composables/useRealtime';
import { notifyError } from '@/utils/notify';
import type { MeetupRsvp, RsvpStatus } from '@/types/group';

const props = defineProps<{ groupId: string; meetupAt: string; myId: string | null; canRsvp: boolean }>();

const groupsStore = useGroupsStore();
const rsvps = ref<MeetupRsvp[]>([]);
const saving = ref<RsvpStatus | null>(null);

const yes = computed(() => rsvps.value.filter((r) => r.status === 'yes'));
const no = computed(() => rsvps.value.filter((r) => r.status === 'no'));
const myStatus = computed(() => rsvps.value.find((r) => r.user_id === props.myId)?.status ?? null);

async function load() {
  try {
    rsvps.value = await groupsStore.fetchRsvps(props.groupId, props.meetupAt);
  } catch {
    // Anzeige bleibt leer; Zusagen sind nicht kritisch
  }
}

async function toggle(status: RsvpStatus) {
  saving.value = status;
  try {
    // Nochmal tippen nimmt die Antwort zurueck
    await groupsStore.setRsvp(props.groupId, myStatus.value === status ? null : status);
    await load();
  } catch {
    notifyError('Deine Antwort konnte nicht gespeichert werden.');
  } finally {
    saving.value = null;
  }
}

useRealtime('meetup_rsvps', `group_id=eq.${props.groupId}`, () => void load());
watch(() => props.meetupAt, load);
onMounted(load);
</script>
