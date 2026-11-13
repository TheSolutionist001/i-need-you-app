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

          <PlaceSelect v-model="place" label="Treffpunkt (optional)" :near="myLocation" />
          <div class="text-caption text-grey" style="margin-top: 4px">
            Den genauen Treffpunkt sehen nur Mitglieder – mit Route zu Google Maps.
          </div>

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
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import CitySelect from '@/components/CitySelect.vue';
import PlaceSelect from '@/components/PlaceSelect.vue';
import SportPicker from '@/components/SportPicker.vue';
import { useGroupsStore } from '@/stores/groups-store';
import { useAuthStore } from '@/stores/auth-store';
import { notifyError } from '@/utils/notify';
import type { City, Place } from '@/utils/geocode';

const router = useRouter();
const groupsStore = useGroupsStore();
const authStore = useAuthStore();

const sport = ref('sonstiges');
const name = ref('');
const description = ref('');
const maxMembers = ref(10);
const meetupAt = ref('');
const city = ref<string | null>(null);
const selectedCity = ref<City | null>(null);
const place = ref<Place | null>(null);
const myLocation = ref<{ lat: number; lng: number } | null>(null);
const isPublic = ref(false);
const loading = ref(false);
const errorMessage = ref('');

// Stadt aus dem Profil vorbelegen (Name + gespeicherte Stadt-Koordinaten).
onMounted(async () => {
  try {
    myLocation.value = await authStore.fetchMyLocation();
    const profileCity = authStore.profile?.city;
    if (myLocation.value && profileCity && !selectedCity.value) {
      city.value = profileCity;
      selectedCity.value = { name: profileCity, ...myLocation.value };
    }
  } catch {
    // Ohne Vorbelegung weiter - die Stadt kann man auch selbst waehlen.
  }
});

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
    if (place.value) {
      try {
        await groupsStore.saveMeetupPlace(id, place.value);
      } catch {
        notifyError('Gruppe erstellt, aber der Treffpunkt konnte nicht gespeichert werden.');
      }
    }
    await router.push(`/groups/${id}`);
  } catch {
    errorMessage.value = 'Die Gruppe konnte nicht erstellt werden. Bitte versuche es erneut.';
  } finally {
    loading.value = false;
  }
}
</script>
