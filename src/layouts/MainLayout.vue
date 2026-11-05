<template>
  <q-layout view="hHh Lpr fFf">
    <q-header class="nx-header">
      <q-toolbar style="max-width: 960px; margin: 0 auto; min-height: 56px">
        <router-link to="/" class="row items-center no-wrap" style="text-decoration: none" aria-label="Startseite">
          <NexxupLogo :size="40" background="#12110d" />
          <span class="nx-display q-ml-sm text-weight-bold" style="font-size: 17px; letter-spacing: 0.04em; color: var(--nx-cream)">
            NEXXUP
          </span>
        </router-link>

        <q-space />

        <!-- Ab Tablet-Breite: Navigation oben. Auf dem Handy uebernimmt die Tab-Leiste unten. -->
        <template v-if="authStore.isAuthenticated">
          <div class="gt-sm row items-center q-gutter-xs">
            <q-btn
              v-for="item in navItems"
              :key="item.to"
              flat
              no-caps
              :label="item.label"
              :to="item.to"
              :class="isActive(item.to) ? 'text-primary' : 'text-grey'"
            />
            <q-btn flat round icon="logout" class="text-grey" aria-label="Abmelden" @click="onLogout" />
          </div>
        </template>
        <template v-else>
          <q-btn flat no-caps label="Einloggen" to="/login" />
          <q-btn color="primary" unelevated no-caps label="Registrieren" to="/register" class="q-ml-sm" />
        </template>
      </q-toolbar>
    </q-header>

    <q-footer v-if="authStore.isAuthenticated" class="nx-tabbar lt-md">
      <q-tabs :model-value="activeTab" dense no-caps indicator-color="transparent" class="full-width">
        <q-route-tab
          v-for="item in navItems"
          :key="item.to"
          :name="item.to"
          :to="item.to"
          :icon="item.icon"
          :label="item.label"
        />
      </q-tabs>
    </q-footer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NexxupLogo from '@/components/NexxupLogo.vue';
import { useAuthStore } from '@/stores/auth-store';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const navItems = computed(() => {
  const items = [
    { to: '/board', label: 'Brett', icon: 'dashboard' },
    { to: '/groups', label: 'Gruppen', icon: 'groups' },
    { to: '/profile', label: 'Profil', icon: 'person' },
  ];
  if (authStore.profile?.is_admin) {
    items.push({ to: '/admin', label: 'Moderation', icon: 'shield' });
  }
  return items;
});

function isActive(to: string): boolean {
  return route.path === to || route.path.startsWith(`${to}/`);
}

const activeTab = computed(() => navItems.value.find((i) => isActive(i.to))?.to ?? '');

async function onLogout() {
  await authStore.signOut();
  await router.push('/login');
}
</script>
