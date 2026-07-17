<template>
  <q-page class="q-pa-md">
    <div style="max-width: 600px; margin: 0 auto">
      <q-btn flat dense icon="arrow_back" label="Meine Gruppen" to="/groups" no-caps class="q-mb-sm" />

      <div v-if="loading" class="text-center q-pa-lg">
        <q-spinner size="32px" color="primary" />
      </div>

      <div v-else-if="!group" class="text-center text-grey q-pa-lg">
        Diese Gruppe existiert nicht oder du hast keinen Zugriff darauf.
      </div>

      <template v-else>
        <q-card flat bordered class="q-pa-md">
          <div class="row items-center">
            <div class="text-h6">{{ group.name }}</div>
            <q-space />
            <q-badge v-if="group.is_public_event" color="green" label="Öffentlich" />
          </div>
          <div v-if="group.description" class="text-body2 text-grey q-mt-sm">
            {{ group.description }}
          </div>
          <div class="text-caption text-grey q-mt-sm">
            {{ activeMembers.length }} von {{ group.max_members }} aktiven Mitgliedern
          </div>
        </q-card>

        <!-- Einladelink -->
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
              <q-avatar color="primary" text-color="white" size="32px">
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
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useGroupsStore } from '@/stores/groups-store';
import { useAuthStore } from '@/stores/auth-store';
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

const activeMembers = computed(() => members.value.filter((m) => m.status === 'active'));
const waitlistMembers = computed(() => members.value.filter((m) => m.status === 'waitlist'));
const isCreator = computed(() => group.value?.created_by === authStore.user?.id);
const inviteLink = computed(() => `${window.location.origin}${window.location.pathname}#/groups/join/${groupId}`);

async function load() {
  loading.value = true;
  try {
    group.value = await groupsStore.fetchGroup(groupId);
    if (group.value) {
      members.value = await groupsStore.fetchMembers(groupId);
    }
  } finally {
    loading.value = false;
  }
}

async function copyInvite() {
  await navigator.clipboard.writeText(inviteLink.value);
  $q.notify({ message: 'Einladelink kopiert', color: 'positive', timeout: 1500 });
}

async function onTogglePublic(value: boolean) {
  await groupsStore.togglePublic(groupId, value);
  if (group.value) group.value.is_public_event = value;
}

function onLeave() {
  $q.dialog({
    title: 'Gruppe verlassen',
    message: 'Möchtest du diese Gruppe wirklich verlassen?',
    cancel: true,
  }).onOk(async () => {
    await groupsStore.leaveGroup(groupId);
    await router.push('/groups');
  });
}

function onDelete() {
  $q.dialog({
    title: 'Gruppe löschen',
    message: 'Die Gruppe wird endgültig gelöscht. Fortfahren?',
    cancel: true,
  }).onOk(async () => {
    await groupsStore.deleteGroup(groupId);
    await router.push('/groups');
  });
}

onMounted(load);
</script>
