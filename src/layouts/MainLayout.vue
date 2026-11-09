<template>
  <q-layout view="hHh Lpr fFf">
    <q-header class="nx-header">
      <q-toolbar style="max-width: 960px; margin: 0 auto; min-height: 56px">
        <router-link to="/" class="row items-center no-wrap" style="text-decoration: none" aria-label="Startseite">
          <NexxupLogo :size="40" background="#12110d" />
          <span class="nx-display q-ml-sm text-weight-bold" style="font-size: 17px; letter-spacing: 0.04em; color: var(--nx-cream)">
            NEXX<span style="color: var(--nx-accent)">UP</span>
          </span>
        </router-link>

        <q-space />

        <!-- Ab Tablet-Breite: Navigation oben. Auf dem Handy uebernimmt die Tab-Leiste unten. -->
        <template v-if="authStore.isAuthenticated">
          <div class="gt-sm row items-center q-gutter-xs">
            <q-btn
              v-for="item in desktopItems"
              :key="item.to"
              flat
              no-caps
              :icon="item.icon"
              :label="item.label"
              :to="item.to"
              :class="isActive(item.to) ? 'text-primary' : 'text-grey'"
            />
            <q-btn color="primary" unelevated icon="add" label="Erstellen" class="q-ml-sm" @click="createOpen = true" />
            <q-btn flat round icon="logout" class="text-grey" aria-label="Abmelden" @click="onLogout" />
          </div>
        </template>
        <template v-else>
          <q-btn flat no-caps label="Einloggen" to="/login" />
          <q-btn color="primary" unelevated no-caps label="Registrieren" to="/register" class="q-ml-sm" />
        </template>
      </q-toolbar>
    </q-header>

    <!-- Handy: Tab-Leiste unten mit grossem "+" in der Mitte -->
    <q-footer v-if="authStore.isAuthenticated" class="nx-tabbar lt-md">
      <nav class="nx-tabbar__inner">
        <router-link
          v-for="item in tabItems.slice(0, 2)"
          :key="item.to"
          :to="item.to"
          class="nx-tabbar__item"
          :class="{ 'nx-tabbar__item--active': isActive(item.to) }"
        >
          <q-icon :name="item.icon" size="24px" />{{ item.label }}
        </router-link>
        <div class="nx-tabbar__item">
          <q-btn class="nx-plus" color="primary" unelevated icon="add" size="lg" aria-label="Erstellen" @click="createOpen = true" />
        </div>
        <router-link
          v-for="item in tabItems.slice(2)"
          :key="item.to"
          :to="item.to"
          class="nx-tabbar__item"
          :class="{ 'nx-tabbar__item--active': isActive(item.to) }"
        >
          <q-icon :name="item.icon" size="24px" />{{ item.label }}
        </router-link>
      </nav>
    </q-footer>

    <!-- Auswahl: Was moechtest du erstellen? -->
    <q-dialog v-model="createOpen" position="bottom">
      <q-card style="width: 100%; max-width: 480px; border-radius: 24px 24px 0 0">
        <q-card-section>
          <div class="nx-display" style="font-size: 18px">Was möchtest du starten?</div>
        </q-card-section>
        <q-list class="q-pb-md">
          <q-item v-for="opt in createOptions" :key="opt.to" v-close-popup clickable class="q-py-md" @click="router.push(opt.to)">
            <q-item-section avatar>
              <div class="nx-create-icon"><q-icon :name="opt.icon" size="26px" /></div>
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-bold">{{ opt.title }}</q-item-label>
              <q-item-label caption>{{ opt.text }}</q-item-label>
            </q-item-section>
            <q-item-section side><q-icon name="chevron_right" /></q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </q-dialog>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NexxupLogo from '@/components/NexxupLogo.vue';
import { useAuthStore } from '@/stores/auth-store';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const createOpen = ref(false);

const tabItems = [
  { to: '/', label: 'Entdecken', icon: 'explore' },
  { to: '/board', label: 'Brett', icon: 'push_pin' },
  { to: '/groups', label: 'Gruppen', icon: 'groups' },
  { to: '/profile', label: 'Profil', icon: 'person' },
];

// Moderation steht fuer Admins oben (Desktop) bzw. im Profil (Handy).
const desktopItems = computed(() =>
  authStore.profile?.is_admin
    ? [...tabItems, { to: '/admin', label: 'Moderation', icon: 'shield' }]
    : tabItems,
);

const createOptions = [
  { to: '/board/new', icon: 'push_pin', title: 'Gesuch aufgeben', text: 'Spontan jemanden für eine Aktivität finden' },
  { to: '/groups/new', icon: 'group_add', title: 'Gruppe gründen', text: 'Regelmäßige Treffen mit fester Teilnehmerzahl' },
];

function isActive(to: string): boolean {
  if (to === '/') return route.path === '/';
  return route.path === to || route.path.startsWith(`${to}/`);
}

async function onLogout() {
  await authStore.signOut();
  await router.push('/login');
}
</script>

<style scoped>
.nx-create-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(255, 90, 31, 0.14);
  color: var(--nx-accent);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
