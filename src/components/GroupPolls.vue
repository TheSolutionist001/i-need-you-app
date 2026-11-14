<template>
  <div>
    <div class="row items-center q-mb-xs">
      <div class="text-subtitle2 col">Umfragen</div>
      <q-btn flat dense no-caps color="primary" icon="add" label="Neue Umfrage" @click="openCreate" />
    </div>

    <div v-if="polls.length === 0" class="text-caption text-grey q-mb-sm">
      Noch keine Umfrage. Frag z. B. „Wann passt es euch?“ – Mehrfachauswahl ist möglich.
    </div>

    <q-card v-for="poll in polls" :key="poll.id" flat bordered class="q-pa-md q-mb-sm nx-poll">
      <div class="row items-start no-wrap">
        <div class="col text-weight-bold">{{ poll.question }}</div>
        <q-btn
          v-if="poll.created_by === myId || isGroupCreator"
          flat dense round size="sm" icon="delete" color="grey" aria-label="Umfrage löschen"
          @click="onDelete(poll.id)"
        />
      </div>
      <div class="text-caption text-grey q-mb-sm">
        {{ poll.voterCount === 1 ? '1 Person hat' : `${poll.voterCount} Personen haben` }} abgestimmt
      </div>
      <div
        v-for="opt in poll.options"
        :key="opt.id"
        class="nx-poll__opt"
        :class="{ 'nx-poll__opt--mine': opt.mine }"
        role="button"
        tabindex="0"
        @click="vote(poll.id, opt.id, !opt.mine)"
        @keydown.enter="vote(poll.id, opt.id, !opt.mine)"
      >
        <div class="nx-poll__fill" :style="{ width: `${share(opt.votes, poll.voterCount)}%` }" />
        <q-icon :name="opt.mine ? 'check_box' : 'check_box_outline_blank'" size="18px" class="q-mr-sm" />
        <span class="col ellipsis">{{ opt.label }}</span>
        <span class="text-weight-bold">{{ opt.votes }}</span>
        <q-tooltip v-if="opt.voters.length > 0">{{ opt.voters.join(', ') }}</q-tooltip>
      </div>
    </q-card>

    <q-dialog v-model="createOpen">
      <q-card style="width: 100%; max-width: 420px">
        <q-card-section>
          <div class="text-h6">Neue Umfrage</div>
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-input v-model="question" label="Frage" maxlength="200" placeholder="z. B. Wann passt es euch?" />
          <q-input
            v-for="(_, i) in options"
            :key="i"
            v-model="options[i]"
            dense
            :label="`Antwort ${i + 1}`"
            maxlength="100"
          >
            <template v-if="options.length > 2" #append>
              <q-btn flat dense round size="sm" icon="close" aria-label="Antwort entfernen" @click="options.splice(i, 1)" />
            </template>
          </q-input>
          <q-btn
            v-if="options.length < 10"
            flat dense no-caps color="primary" icon="add" label="Antwort hinzufügen"
            @click="options.push('')"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat no-caps label="Abbrechen" />
          <q-btn unelevated no-caps color="primary" text-color="dark" label="Starten" :disable="!canCreate" :loading="creating" @click="onCreate" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useGroupsStore } from '@/stores/groups-store';
import { useRealtime } from '@/composables/useRealtime';
import { notifyError } from '@/utils/notify';
import type { PollView } from '@/types/group';

const props = defineProps<{ groupId: string; myId: string | null; isGroupCreator: boolean }>();

const $q = useQuasar();
const groupsStore = useGroupsStore();
const polls = ref<PollView[]>([]);

const createOpen = ref(false);
const question = ref('');
const options = ref<string[]>(['', '']);
const creating = ref(false);
const canCreate = computed(
  () => question.value.trim().length > 0 && options.value.filter((o) => o.trim()).length >= 2,
);

function share(votes: number, total: number): number {
  return total > 0 ? Math.round((votes / total) * 100) : 0;
}

async function load() {
  try {
    polls.value = await groupsStore.fetchPolls(props.groupId, props.myId);
  } catch {
    // still: Umfragen sind optional
  }
}

function openCreate() {
  question.value = '';
  options.value = ['', ''];
  createOpen.value = true;
}

async function onCreate() {
  creating.value = true;
  try {
    await groupsStore.createPoll(props.groupId, question.value, options.value);
    createOpen.value = false;
    await load();
  } catch {
    notifyError('Die Umfrage konnte nicht gestartet werden.');
  } finally {
    creating.value = false;
  }
}

async function vote(pollId: string, optionId: string, on: boolean) {
  try {
    await groupsStore.setVote(pollId, optionId, on);
    await load();
  } catch {
    notifyError('Deine Stimme konnte nicht gespeichert werden.');
  }
}

function onDelete(pollId: string) {
  $q.dialog({ title: 'Umfrage löschen', message: 'Die Umfrage und alle Stimmen werden gelöscht.', cancel: true }).onOk(
    async () => {
      try {
        await groupsStore.deletePoll(pollId);
        await load();
      } catch {
        notifyError('Die Umfrage konnte nicht gelöscht werden.');
      }
    },
  );
}

useRealtime('group_polls', `group_id=eq.${props.groupId}`, () => void load());
// Stimmen haben keine group_id-Spalte -> ungefiltert; RLS liefert nur erlaubte Zeilen
useRealtime('group_poll_votes', null, () => void load());
onMounted(load);
</script>

<style scoped>
.nx-poll {
  border-radius: 18px;
}
.nx-poll__opt {
  position: relative;
  display: flex;
  align-items: center;
  padding: 9px 12px;
  margin-top: 6px;
  border-radius: 12px;
  background: var(--nx-surface-2);
  cursor: pointer;
  overflow: hidden;
}
.nx-poll__opt > *:not(.nx-poll__fill) {
  position: relative;
}
.nx-poll__fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: rgba(255, 90, 31, 0.18);
  transition: width 0.25s ease;
}
.nx-poll__opt--mine {
  outline: 1px solid var(--nx-accent);
}
</style>
