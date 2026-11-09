<template>
  <q-page class="flex flex-center q-pa-md">
    <q-card class="q-pa-md" style="width: 100%; max-width: 480px">
      <q-card-section>
        <div class="text-h6">Gruppe gründen</div>
        <div class="text-caption text-grey">Du wirst automatisch erstes Mitglied.</div>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md" @submit="onSubmit">
          <div>
            <div class="text-caption text-grey q-mb-xs">Sportart</div>
            <SportPicker v-model="sport" />
          </div>

          <q-input
            v-model="name"
            label="Name"
            placeholder="z. B. Feierabend-Kick"
            :rules="[(val: string) => !!val.trim() || 'Bitte einen Namen eingeben']"
          />
          <q-input v-model="description" label="Beschreibung (optional)" type="textarea" autogrow />
          <q-input
            v-model.number="maxMembers"
            label="Maximale Teilnehmerzahl"
            type="number"
            :rules="[(val: number) => (val && val >= 1) || 'Mindestens 1']"
          />
          <q-input
            v-model="meetupAt"
            label="Nächster Termin (optional)"
            type="datetime-local"
            stack-label
            hint="Erscheint auf der Startseite unter „Deine nächsten Termine“"
          />

          <CitySelect v-model="city" label="Stadt (optional)" @select="onCity" />

          <q-toggle v-model="isPublic" label="Öffentlich – in „Entdecken“ für Leute in der Nähe zeigen" />
          <div v-if="isPublic && !selectedCity" class="nx-note nx-note--info">
            Wähle eine Stadt, damit die Gruppe bei Leuten in der Nähe auftaucht.
          </div>

          <div v-if="errorMessage" class="text-negative text-caption">{{ errorMessage }}</div>

          <div class="row q-gutter-sm">
            <q-btn label="Abbrechen" flat to="/groups" no-caps />
            <q-space />
            <q-btn type="submit" label="Gründen" color="primary" unelevated :loading="loading" no-caps />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import CitySelect from '@/components/CitySelect.vue';
import SportPicker from '@/components/SportPicker.vue';
import { useGroupsStore } from '@/stores/groups-store';
import { useAuthStore } from '@/stores/auth-store';
import { findCity, type City } from '@/data/german-cities';

const router = useRouter();
const groupsStore = useGroupsStore();
const authStore = useAuthStore();

// Stadt aus dem Profil vorbelegen (nur wenn sie in der Liste steht).
const profileCity = findCity(authStore.profile?.city ?? null) ?? null;

const sport = ref('sonstiges');
const name = ref('');
const description = ref('');
const maxMembers = ref(10);
const meetupAt = ref('');
const city = ref<string | null>(profileCity?.name ?? null);
const selectedCity = ref<City | null>(profileCity);
const isPublic = ref(false);
const loading = ref(false);
const errorMessage = ref('');

function onCity(c: City | null) {
  selectedCity.value = c;
}

async function onSubmit() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const id = await groupsStore.createGroup({
      name: name.value.trim(),
      description: description.value.trim(),
      maxMembers: maxMembers.value,
      sport: sport.value,
      // datetime-local liefert Ortszeit ohne Zone -> als lokale Zeit interpretieren
      nextMeetupAt: meetupAt.value ? new Date(meetupAt.value).toISOString() : null,
      city: selectedCity.value?.name ?? null,
      lat: selectedCity.value?.lat ?? null,
      lng: selectedCity.value?.lng ?? null,
    });
    if (isPublic.value) await groupsStore.togglePublic(id, true);
    await router.push(`/groups/${id}`);
  } catch {
    errorMessage.value = 'Die Gruppe konnte nicht erstellt werden. Bitte versuche es erneut.';
  } finally {
    loading.value = false;
  }
}
</script>
