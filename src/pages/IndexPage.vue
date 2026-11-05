<template>
  <q-page class="q-pa-md">
    <div style="max-width: 600px; margin: 0 auto">
      <div class="q-mt-md q-mb-lg">
        <div class="text-h5">Hallo {{ authStore.profile?.first_name ?? '' }}</div>
        <div class="text-grey q-mt-xs">
          <template v-if="authStore.profile?.city">
            <q-icon name="place" size="16px" /> {{ authStore.profile.city }}
          </template>
          <template v-else>Lust auf Sport mit anderen?</template>
        </div>
      </div>

      <div v-if="!authStore.profile?.city" class="nx-note nx-note--warning q-mb-md">
        Hinterlege deine Stadt im <router-link to="/profile">Profil</router-link>, damit du
        Gesuche in deiner Nähe siehst.
      </div>

      <div class="column q-gutter-md">
        <q-card v-for="tile in tiles" :key="tile.to" v-ripple class="cursor-pointer nx-tile" @click="router.push(tile.to)">
          <q-card-section class="row items-center no-wrap q-gutter-md">
            <div class="nx-tile__icon flex flex-center">
              <q-icon :name="tile.icon" size="26px" />
            </div>
            <div class="col">
              <div class="text-subtitle1 text-weight-bold">{{ tile.title }}</div>
              <div class="text-body2 text-grey">{{ tile.text }}</div>
            </div>
            <q-icon name="chevron_right" size="24px" class="text-grey" />
          </q-card-section>
        </q-card>
      </div>

      <div class="text-overline text-grey q-mt-xl q-mb-sm">Schnell starten</div>
      <div class="row q-col-gutter-sm">
        <div class="col-6">
          <q-btn color="primary" unelevated icon="add" label="Gesuch" to="/board/new" class="full-width" />
        </div>
        <div class="col-6">
          <q-btn outline color="primary" icon="group_add" label="Gruppe" to="/groups/new" class="full-width" />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth-store';

const router = useRouter();
const authStore = useAuthStore();

const tiles = [
  { to: '/board', icon: 'dashboard', title: 'Schwarzes Brett', text: 'Spontane Gesuche in deiner Nähe' },
  { to: '/groups', icon: 'groups', title: 'Meine Gruppen', text: 'Deine Gruppen und Wartelisten' },
];
</script>

<style scoped>
.nx-tile {
  transition: border-color 0.15s;
}
.nx-tile:hover {
  border-color: rgba(255, 90, 31, 0.4);
}
.nx-tile__icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(255, 90, 31, 0.12);
  color: var(--nx-accent);
}
</style>
