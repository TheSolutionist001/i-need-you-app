<template>
  <q-page class="q-pa-md">
    <div style="max-width: 600px; margin: 0 auto">
      <q-btn flat dense icon="arrow_back" label="Meine Gruppen" to="/groups" no-caps class="q-mb-sm" />

      <div v-if="loading" class="text-center q-pa-lg">
        <q-spinner size="32px" color="primary" />
      </div>

      <EmptyState
        v-else-if="loadError"
        icon="cloud_off"
        title="Gruppe konnte nicht geladen werden"
        text="Prüfe deine Internetverbindung und versuche es erneut."
      >
        <q-btn outline color="primary" icon="refresh" label="Erneut versuchen" @click="load()" />
      </EmptyState>

      <EmptyState
        v-else-if="!group"
        icon="lock"
        title="Gruppe nicht gefunden"
        text="Diese Gruppe existiert nicht (mehr) oder du hast keinen Zugriff darauf."
      />

      <template v-else>
        <q-card class="nx-detail">
          <div class="nx-detail__cover" :style="{ background: sportGradient(group.sport) }">
            <div class="nx-detail__emoji">{{ sport.emoji }}</div>
            <div class="nx-detail__tags">
              <span class="nx-tag">{{ sport.label }}</span>
              <span v-if="group.is_public_event" class="nx-tag">Öffentlich</span>
            </div>
          </div>
          <div class="q-pa-md">
            <div class="text-h6">{{ group.name }}</div>
            <div v-if="group.description" class="text-body2 text-grey q-mt-xs" style="white-space: pre-line">
              {{ group.description }}
            </div>

            <div class="column q-gutter-xs q-mt-md">
              <div class="row items-center no-wrap">
                <q-icon name="event" size="18px" class="text-primary q-mr-sm" />
                <span v-if="group.next_meetup_at">{{ formatMeetup(group.next_meetup_at) }}</span>
                <span v-else class="text-grey">Kein Termin eingetragen</span>
                <q-btn
                  v-if="isCreator"
                  flat dense no-caps color="primary" size="sm" class="q-ml-sm"
                  :label="group.next_meetup_at ? 'Ändern' : 'Termin festlegen'"
                  @click="openMeetupDialog"
                />
              </div>
              <div v-if="group.city" class="row items-center no-wrap">
                <q-icon name="place" size="18px" class="text-primary q-mr-sm" />{{ group.city }}
              </div>
              <div class="row items-center no-wrap">
                <q-icon name="groups" size="18px" class="text-primary q-mr-sm" />
                {{ activeCount }} von {{ group.max_members }} dabei
              </div>
            </div>
            <div class="nx-bar q-mt-sm">
              <span :style="{ width: `${Math.min(100, (activeCount / group.max_members) * 100)}%` }" />
            </div>
          </div>
        </q-card>

        <!-- Einladelink + Mitglieder nur fuer Mitglieder (RLS zeigt Fremden ohnehin keine Namen) -->
        <template v-if="isMember || isCreator">
        <q-card flat bordered class="q-pa-md q-mt-md">
          <div class="text-subtitle2 q-mb-xs">Einladelink</div>
          <div class="row items-center no-wrap">
            <div class="col ellipsis text-caption text-grey">{{ inviteLink }}</div>
            <q-btn flat dense icon="content_copy" @click="copyInvite" aria-label="Link kopieren" />
          </div>
        </q-card>

        <!-- Mitglieder -->
        <div class="text-subtitle2 q-mt-md q-mb-xs">Aktive Mitglieder</div>
        <q-list bordered separator class="rounded-borders">
          <q-item v-for="m in activeMembers" :key="m.id">
            <q-item-section avatar>
              <q-avatar color="primary" size="32px">
                {{ (m.first_name?.[0] ?? '?').toUpperCase() }}
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ m.first_name ?? 'Unbekannt' }}</q-item-label>
              <q-item-label caption>{{ m.city }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-badge v-if="m.user_id === group.created_by" color="primary" label="Ersteller" />
            </q-item-section>
          </q-item>
        </q-list>

        <template v-if="waitlistMembers.length > 0">
          <div class="text-subtitle2 q-mt-md q-mb-xs">Warteliste</div>
          <q-list bordered separator class="rounded-borders">
            <q-item v-for="m in waitlistMembers" :key="m.id">
              <q-item-section avatar>
                <q-avatar color="grey-7" text-color="white" size="32px">
                  {{ (m.first_name?.[0] ?? '?').toUpperCase() }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ m.first_name ?? 'Unbekannt' }}</q-item-label>
                <q-item-label caption>{{ m.city }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </template>
        </template>

        <!-- Aktionen -->
        <div class="q-mt-lg">
          <template v-if="isCreator">
            <q-toggle
              :model-value="group.is_public_event"
              label="Als öffentliches Event sichtbar machen"
              @update:model-value="onTogglePublic"
            />
            <q-btn
              flat
              color="negative"
              label="Gruppe löschen"
              class="full-width q-mt-sm"
              no-caps
              @click="onDelete"
            />
          </template>
          <q-btn
            v-else-if="!isMember"
            color="primary"
            unelevated
            label="Mitmachen"
            class="full-width"
            no-caps
            :to="`/groups/join/${groupId}`"
          />
          <q-btn
            v-else
            outline
            color="negative"
            label="Gruppe verlassen"
            class="full-width"
            no-caps
            @click="onLeave"
          />
        </div>
      </template>
    </div>

    <q-dialog v-model="meetupOpen">
      <q-card style="width: 100%; max-width: 380px">
        <q-card-section>
          <div class="text-h6">Nächster Termin</div>
        </q-card-section>
        <q-card-section>
          <q-input v-model="meetupInput" type="datetime-local" label="Datum und Uhrzeit" stack-label />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-if="group?.next_meetup_at" flat no-caps color="negative" label="Entfernen" @click="saveMeetup(null)" />
          <q-space />
          <q-btn v-close-popup flat no-caps label="Abbrechen" />
          <q-btn unelevated no-caps color="primary" label="Speichern" :disable="!meetupInput" @click="saveMeetup(meetupInput)" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useGroupsStore } from '@/stores/groups-store';
import { useAuthStore } from '@/stores/auth-store';
import { useRealtime } from '@/composables/useRealtime';
import EmptyState from '@/components/EmptyState.vue';
import { notifyError, notifySuccess } from '@/utils/notify';
import { getSport, sportGradient } from '@/data/sports';
import { formatMeetup } from '@/utils/format';
import type { Group, GroupMemberWithName } from '@/types/group';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const groupsStore = useGroupsStore();
const authStore = useAuthStore();

const groupId = route.params.id as string;
const group = ref<Group | null>(null);
const members = ref<GroupMemberWithName[]>([]);
const loading = ref(true);
const loadError = ref(false);

const activeMembers = computed(() => members.value.filter((m) => m.status === 'active'));
const waitlistMembers = computed(() => members.value.filter((m) => m.status === 'waitlist'));
const isCreator = computed(() => group.value?.created_by === authStore.user?.id);
const isMember = computed(() => members.value.some((m) => m.user_id === authStore.user?.id));
const sport = computed(() => getSport(group.value?.sport));
// Nicht-Mitglieder (oeffentliche Gruppe) sehen keine Namen, nur die Anzahl.
const publicCount = ref(0);
const activeCount = computed(() => (isMember.value ? activeMembers.value.length : publicCount.value));

// Termin bearbeiten (nur Ersteller; RLS erlaubt Updates nur dem Ersteller)
const meetupOpen = ref(false);
const meetupInput = ref('');

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function openMeetupDialog() {
  meetupInput.value = group.value?.next_meetup_at ? toLocalInput(group.value.next_meetup_at) : '';
  meetupOpen.value = true;
}

async function saveMeetup(value: string | null) {
  const iso = value ? new Date(value).toISOString() : null;
  try {
    await groupsStore.updateMeetup(groupId, iso);
    if (group.value) group.value.next_meetup_at = iso;
    meetupOpen.value = false;
    notifySuccess(iso ? 'Termin gespeichert' : 'Termin entfernt');
  } catch {
    notifyError('Der Termin konnte nicht gespeichert werden.');
  }
}
const inviteLink = computed(() => `${window.location.origin}${window.location.pathname}#/groups/join/${groupId}`);

// Eigener Status vor dem letzten Laden - dient dem Vergleich beim Nachruecken.
const myStatus = ref<string | null>(null);

// silent = true bei Live-Aktualisierungen: kein Ladebalken, damit die Seite
// beim automatischen Nachladen nicht flackert.
async function load(silent = false) {
  if (!silent) loading.value = true;
  try {
    group.value = await groupsStore.fetchGroup(groupId);
    if (group.value) {
      members.value = await groupsStore.fetchMembers(groupId);
      if (!members.value.some((m) => m.user_id === authStore.user?.id)) {
        publicCount.value = await groupsStore.fetchActiveCount(groupId);
      }
    }

    // Statuswechsel erkennen: waitlist -> active bedeutet, ich bin nachgerueckt.
    // Bewusst ueber den Vorher/Nachher-Vergleich der geladenen Daten, denn im
    // Live-Ereignis liefert Postgres standardmaessig nur den Primaerschluessel
    // des alten Datensatzes - der alte Status waere dort nicht enthalten.
    const previous = myStatus.value;
    const current = members.value.find((m) => m.user_id === authStore.user?.id)?.status ?? null;
    myStatus.value = current;

    if (silent && previous === 'waitlist' && current === 'active') {
      $q.notify({
        message: 'Du bist nachgerückt und jetzt aktives Mitglied!',
        color: 'positive',
        icon: 'celebration',
        timeout: 8000,
      });
    }
    loadError.value = false;
  } catch {
    // Bei stillen Live-Aktualisierungen die bisherigen Daten stehen lassen.
    if (!silent) loadError.value = true;
  } finally {
    if (!silent) loading.value = false;
  }
}

// Live-Updates: Mitglieder dieser Gruppe beobachten (Beitritt, Austritt, Nachruecken).
useRealtime('group_members', `group_id=eq.${groupId}`, () => {
  void load(true);
});

async function copyInvite() {
  try {
    await navigator.clipboard.writeText(inviteLink.value);
    notifySuccess('Einladelink kopiert');
  } catch {
    notifyError('Kopieren nicht möglich. Bitte den Link von Hand markieren und kopieren.');
  }
}

async function onTogglePublic(value: boolean) {
  try {
    await groupsStore.togglePublic(groupId, value);
    if (group.value) group.value.is_public_event = value;
  } catch {
    notifyError('Die Einstellung konnte nicht gespeichert werden.');
  }
}

function onLeave() {
  $q.dialog({
    title: 'Gruppe verlassen',
    message: 'Möchtest du diese Gruppe wirklich verlassen?',
    cancel: true,
  }).onOk(async () => {
    try {
      await groupsStore.leaveGroup(groupId);
      await router.push('/groups');
    } catch {
      notifyError('Austritt fehlgeschlagen. Bitte versuche es erneut.');
    }
  });
}

function onDelete() {
  $q.dialog({
    title: 'Gruppe löschen',
    message: 'Die Gruppe wird endgültig gelöscht. Fortfahren?',
    cancel: true,
  }).onOk(async () => {
    try {
      await groupsStore.deleteGroup(groupId);
      await router.push('/groups');
    } catch {
      notifyError('Die Gruppe konnte nicht gelöscht werden.');
    }
  });
}

onMounted(() => load());
</script>

<style scoped>
.nx-detail {
  overflow: hidden;
  border-radius: 22px;
}
.nx-detail__cover {
  position: relative;
  height: 150px;
  overflow: hidden;
}
.nx-detail__emoji {
  position: absolute;
  right: 18px;
  bottom: -16px;
  font-size: 110px;
  line-height: 1;
  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.35));
}
.nx-detail__tags {
  position: absolute;
  left: 14px;
  top: 14px;
  display: flex;
  gap: 6px;
}
</style>
