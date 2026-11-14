<template>
  <q-page class="q-px-md q-pb-xl">
    <div style="max-width: 720px; margin: 0 auto">
      <!-- Begruessung -->
      <div class="row items-start no-wrap q-pt-lg">
        <div class="col">
          <div class="text-caption text-grey">
            <q-icon name="place" size="14px" />
            <template v-if="authStore.profile?.city"> {{ authStore.profile.city }} · {{ RADIUS_KM }} km</template>
            <template v-else> Kein Ort hinterlegt</template>
          </div>
          <div class="nx-display q-mt-xs" style="font-size: 24px; line-height: 1.15">
            Hey {{ authStore.profile?.first_name ?? '' }},<br />
            <span class="text-primary">Lust auf Sport?</span>
          </div>
        </div>
        <q-avatar color="primary" size="44px" class="cursor-pointer" @click="router.push('/profile')">
          {{ (authStore.profile?.first_name?.[0] ?? '?').toUpperCase() }}
        </q-avatar>
      </div>

      <div v-if="!authStore.profile?.city" class="nx-note nx-note--warning q-mt-md">
        Hinterlege deine Stadt im <router-link to="/profile">Profil</router-link>, damit du
        Gruppen und Gesuche in deiner Nähe siehst.
      </div>

      <!-- Suche + Sportart-Filter -->
      <q-input
        v-model="search"
        class="nx-search q-mt-md"
        outlined
        dense
        clearable
        placeholder="Sportart, Gruppe, Gesuch …"
      >
        <template #prepend><q-icon name="search" /></template>
      </q-input>
      <SportChips v-model="sportFilter" class="q-mt-sm" />

      <q-btn-toggle
        v-model="view"
        class="nx-viewtoggle q-mt-md"
        spread
        no-caps
        unelevated
        toggle-color="primary"
        toggle-text-color="dark"
        :options="[
          { label: 'Liste', value: 'list', icon: 'view_agenda' },
          { label: 'Karte', value: 'map', icon: 'map' },
        ]"
      />

      <div v-if="loading" class="text-center q-pa-xl">
        <q-spinner size="32px" color="primary" />
      </div>

      <EmptyState
        v-else-if="loadError"
        icon="cloud_off"
        title="Inhalte konnten nicht geladen werden"
        text="Prüfe deine Internetverbindung und versuche es erneut."
      >
        <q-btn outline color="primary" icon="refresh" label="Erneut versuchen" @click="load()" />
      </EmptyState>

      <!-- Kartenansicht -->
      <template v-else-if="view === 'map'">
        <DiscoverMap
          class="q-mt-md"
          :items="mapItems"
          :center="myLocation"
          :radius-km="RADIUS_KM"
          :selected-id="selectedId"
          @select="(id) => (selectedId = id)"
        />
        <div class="text-caption text-grey q-mt-xs">
          {{ mapItems.length }} {{ mapItems.length === 1 ? 'Angebot' : 'Angebote' }} im Umkreis von
          {{ RADIUS_KM }} km · Orte sind ungefähr (Stadtgebiet)
        </div>

        <div class="q-mt-md">
          <GroupCard v-if="selectedGroup" :group="selectedGroup" />
          <template v-else-if="selectedPost">
            <PostCard :post="selectedPost" featured>
              <template v-if="selectedPost.author_id !== authStore.user?.id" #footer>
                <q-btn
                  unelevated
                  rounded
                  no-caps
                  color="primary"
                  text-color="dark"
                  icon="chat_bubble"
                  label="Antworten"
                  size="sm"
                  class="q-mt-sm"
                  :loading="starting === selectedPost.id"
                  @click="replyTo(selectedPost.author_id, selectedPost.id)"
                />
              </template>
            </PostCard>
            <q-btn
              flat
              no-caps
              color="primary"
              icon-right="chevron_right"
              label="Am Brett ansehen"
              class="q-mt-xs"
              to="/board"
            />
          </template>
          <q-card v-else class="q-pa-md text-center">
            <div class="text-body2 text-grey">
              {{
                mapItems.length > 0
                  ? 'Tippe auf ein Symbol, um Details zu sehen.'
                  : filtering
                    ? 'Keine passenden Angebote auf der Karte.'
                    : 'Gerade nichts in deiner Nähe – starte doch selbst etwas!'
              }}
            </div>
          </q-card>
        </div>
      </template>

      <template v-else>
        <!-- Gruppen in der Naehe -->
        <div class="nx-section">
          <div class="nx-section__title">In deiner Nähe</div>
          <router-link to="/groups">Meine Gruppen</router-link>
        </div>
        <div v-if="nearbyGroups.length > 0" class="nx-scroller">
          <GroupCard v-for="g in nearbyGroups" :key="g.id" :group="g" />
        </div>
        <q-card v-else class="q-pa-md text-center">
          <div class="text-body2 text-grey">
            {{ filtering ? 'Keine passenden Gruppen gefunden.' : 'Noch keine öffentlichen Gruppen in deiner Nähe.' }}
          </div>
          <q-btn v-if="!filtering" flat color="primary" icon="group_add" label="Erste Gruppe gründen" to="/groups/new" class="q-mt-xs" />
        </q-card>

        <!-- Eigene Termine -->
        <template v-if="upcoming.length > 0">
          <div class="nx-section"><div class="nx-section__title">Deine nächsten Termine</div></div>
          <div class="column q-gutter-sm">
            <q-card
              v-for="g in upcoming"
              :key="g.id"
              v-ripple
              class="cursor-pointer"
              @click="router.push(`/groups/${g.id}`)"
            >
              <div class="row items-center no-wrap q-pa-sm" style="gap: 12px">
                <div class="nx-day">
                  <div class="nx-day__wd">{{ meetupDayParts(g.next_meetup_at!).weekday }}</div>
                  <div class="nx-day__d">{{ meetupDayParts(g.next_meetup_at!).day }}</div>
                </div>
                <div class="col" style="min-width: 0">
                  <div class="text-weight-bold ellipsis">{{ getSport(g.sport).emoji }} {{ g.name }}</div>
                  <div class="text-caption text-grey">
                    {{ formatMeetup(g.next_meetup_at!) }} ·
                    {{ g.my_status === 'active' ? 'du bist dabei ✓' : 'Warteliste' }}
                  </div>
                </div>
                <q-icon name="chevron_right" size="22px" class="text-grey" />
              </div>
            </q-card>
          </div>
        </template>

        <!-- Neu am Brett -->
        <div class="nx-section">
          <div class="nx-section__title">Neu am Brett</div>
          <router-link to="/board">Alle</router-link>
        </div>
        <div v-if="latestPosts.length > 0" class="column q-gutter-sm">
          <PostCard v-for="p in latestPosts" :key="p.id" :post="p" clamp class="cursor-pointer" @click="router.push('/board')" />
        </div>
        <q-card v-else class="q-pa-md text-center">
          <div class="text-body2 text-grey">
            {{ filtering ? 'Keine passenden Gesuche gefunden.' : 'Gerade keine Gesuche in deiner Nähe.' }}
          </div>
          <q-btn v-if="!filtering" flat color="primary" icon="add" label="Gesuch aufgeben" to="/board/new" class="q-mt-xs" />
        </q-card>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import DiscoverMap from '@/components/DiscoverMap.vue';
import type { MapItem } from '@/utils/map';
import EmptyState from '@/components/EmptyState.vue';
import GroupCard from '@/components/GroupCard.vue';
import PostCard from '@/components/PostCard.vue';
import { useStartChat } from '@/composables/useStartChat';
import SportChips from '@/components/SportChips.vue';
import { useAuthStore } from '@/stores/auth-store';
import { useGroupsStore } from '@/stores/groups-store';
import { useBoardStore } from '@/stores/board-store';
import { useRealtime } from '@/composables/useRealtime';
import { getSport } from '@/data/sports';
import { formatMeetup, isUpcoming, meetupDayParts } from '@/utils/format';
import { matchesSearch } from '@/utils/search';
import type { DiscoverGroup } from '@/types/group';
import type { BoardFeedItem } from '@/types/board';

const RADIUS_KM = 20;

const router = useRouter();
const { replyTo, starting } = useStartChat();
const authStore = useAuthStore();
const groupsStore = useGroupsStore();
const boardStore = useBoardStore();

const groups = ref<DiscoverGroup[]>([]);
const posts = ref<BoardFeedItem[]>([]);
const loading = ref(true);
const loadError = ref(false);
const search = ref<string | null>('');
const sportFilter = ref<string | null>(null);

const myLocation = ref<{ lat: number; lng: number } | null>(null);

// Ansicht: Liste oder Karte (pro Geraet gemerkt)
const VIEW_KEY = 'nx-discover-view';
function readView(): 'list' | 'map' {
  try {
    return localStorage.getItem(VIEW_KEY) === 'map' ? 'map' : 'list';
  } catch {
    return 'list';
  }
}
const view = ref<'list' | 'map'>(readView());
watch(view, (v) => {
  try {
    localStorage.setItem(VIEW_KEY, v);
  } catch {
    // z. B. privates Fenster - dann eben nicht merken
  }
});

const filtering = computed(() => !!search.value || !!sportFilter.value);

function visible(sport: string, ...texts: (string | null)[]): boolean {
  if (sportFilter.value && sport !== sportFilter.value) return false;
  return matchesSearch(search.value, [getSport(sport).label, ...texts]);
}

// Fremde, oeffentliche Gruppen: kommende Termine zuerst.
const nearbyGroups = computed(() =>
  groups.value
    .filter((g) => !g.my_status && visible(g.sport, g.name, g.description, g.city))
    .sort((a, b) => Number(isUpcoming(b.next_meetup_at)) - Number(isUpcoming(a.next_meetup_at))),
);

const upcoming = computed(() =>
  groups.value
    .filter((g) => g.my_status && isUpcoming(g.next_meetup_at) && visible(g.sport, g.name, g.description))
    .sort((a, b) => (a.next_meetup_at ?? '').localeCompare(b.next_meetup_at ?? ''))
    .slice(0, 3),
);

const latestPosts = computed(() =>
  posts.value.filter((p) => visible(p.sport, p.body, p.author_first_name)).slice(0, 3),
);

// Karte: alle sichtbaren Gruppen und Gesuche mit (ungefaehrer) Position
const mapGroups = computed(() =>
  groups.value.filter((g) => g.lat != null && g.lng != null && visible(g.sport, g.name, g.description, g.city)),
);
const mapPosts = computed(() =>
  posts.value.filter((p) => p.lat != null && p.lng != null && visible(p.sport, p.body, p.author_first_name)),
);
const mapItems = computed<MapItem[]>(() => [
  ...mapGroups.value.map((g) => ({
    id: g.id,
    kind: 'group' as const,
    lat: g.lat!,
    lng: g.lng!,
    emoji: getSport(g.sport).emoji,
    color: getSport(g.sport).from,
  })),
  ...mapPosts.value.map((p) => ({
    id: p.id,
    kind: 'post' as const,
    lat: p.lat!,
    lng: p.lng!,
    emoji: getSport(p.sport).emoji,
    color: getSport(p.sport).from,
  })),
]);

const selectedId = ref<string | null>(null);
const selectedGroup = computed(() => mapGroups.value.find((g) => g.id === selectedId.value) ?? null);
const selectedPost = computed(() => mapPosts.value.find((p) => p.id === selectedId.value) ?? null);

// silent = true bei Live-Aktualisierungen (kein Ladekreis, alte Daten bleiben bei Fehler)
async function load(silent = false) {
  if (!silent) loading.value = true;
  try {
    const hasCity = !!authStore.profile?.city;
    const [g, p] = await Promise.all([
      groupsStore.discoverGroups(RADIUS_KM),
      hasCity ? boardStore.fetchFeed(RADIUS_KM) : Promise.resolve([]),
    ]);
    groups.value = g;
    posts.value = p;
    if (!myLocation.value && hasCity) {
      myLocation.value = await authStore.fetchMyLocation().catch(() => null);
    }
    loadError.value = false;
  } catch {
    if (!silent) loadError.value = true;
  } finally {
    if (!silent) loading.value = false;
  }
}

onMounted(() => load());

useRealtime('board_posts', null, () => void load(true));
useRealtime('groups', null, () => void load(true));
</script>

<style scoped>
.nx-viewtoggle {
  border-radius: 14px;
  overflow: hidden;
  background: var(--nx-surface);
}
.nx-day {
  width: 52px;
  height: 56px;
  border-radius: 14px;
  background: rgba(255, 90, 31, 0.14);
  text-align: center;
  padding-top: 7px;
  flex-shrink: 0;
}
.nx-day__wd {
  color: var(--nx-accent);
  font-size: 11px;
  font-weight: 700;
}
.nx-day__d {
  font-family: 'Unbounded Variable', sans-serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.1;
}
</style>
