<template>
  <!-- Karte mit Gruppen (rund, orange Rand) und Gesuchen (Sprechblase).
       Positionen sind bewusst ungefaehr (Stadt, leicht verteilt). -->
  <div class="nx-map-wrap">
    <div ref="el" class="nx-map" />
    <div class="nx-map-legend">
      <span><i class="nx-map-dot nx-map-dot--group" />Gruppe</span>
      <span><i class="nx-map-dot nx-map-dot--post" />Gesuch</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { spreadPoint, type MapItem } from '@/utils/map';

const props = defineProps<{
  items: MapItem[];
  center: { lat: number; lng: number } | null;
  radiusKm: number;
  selectedId: string | null;
}>();

const emit = defineEmits<{ select: [id: string | null] }>();

const el = ref<HTMLDivElement | null>(null);
let map: L.Map | null = null;
let markerLayer: L.LayerGroup | null = null;
let radiusCircle: L.Circle | null = null;
// Nur beim ersten Laden auf die Angebote zoomen - spaeter (Filter, Live-
// Aktualisierung) bleibt der Ausschnitt, den der Nutzer gewaehlt hat.
let fitted = false;

// Mitte Deutschlands, falls (noch) kein Wohnort bekannt ist
const FALLBACK = { lat: 51.16, lng: 10.45 };

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function icon(item: MapItem, selected: boolean): L.DivIcon {
  const cls = `nx-marker nx-marker--${item.kind}${selected ? ' nx-marker--selected' : ''}`;
  return L.divIcon({
    className: '',
    html: `<div class="${cls}" style="--sport:${escapeHtml(item.color)}">${escapeHtml(item.emoji)}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function drawMarkers() {
  if (!map || !markerLayer) return;
  markerLayer.clearLayers();
  const points: L.LatLngTuple[] = [];
  for (const item of props.items) {
    const pos = spreadPoint(item.id, item.lat, item.lng);
    points.push([pos.lat, pos.lng]);
    const selected = item.id === props.selectedId;
    L.marker([pos.lat, pos.lng], {
      icon: icon(item, selected),
      zIndexOffset: selected ? 1000 : item.kind === 'group' ? 100 : 0,
      keyboard: true,
      title: item.kind === 'group' ? 'Gruppe' : 'Gesuch',
    })
      .on('click', () => emit('select', item.id))
      .addTo(markerLayer);
  }
  if (!fitted && points.length > 0) {
    if (props.center) points.push([props.center.lat, props.center.lng]);
    // Nah genug heranzoomen, damit Angebote aus derselben Stadt getrennt sichtbar sind
    map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 13 });
    fitted = true;
  }
}

function drawRadius() {
  if (!map) return;
  radiusCircle?.remove();
  radiusCircle = null;
  if (!props.center) return;
  radiusCircle = L.circle([props.center.lat, props.center.lng], {
    radius: props.radiusKm * 1000,
    color: '#ff5a1f',
    weight: 1,
    opacity: 0.5,
    fillOpacity: 0.04,
    interactive: false,
  }).addTo(map);
  if (!fitted) map.fitBounds(radiusCircle.getBounds(), { padding: [8, 8] });
}

onMounted(() => {
  if (!el.value) return;
  const c = props.center ?? FALLBACK;
  map = L.map(el.value, {
    center: [c.lat, c.lng],
    zoom: props.center ? 11 : 6,
    zoomControl: false,
    attributionControl: true,
  });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
    subdomains: 'abcd',
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-Mitwirkende © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
  }).addTo(map);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  map.attributionControl.setPrefix(false);
  map.on('click', () => emit('select', null));
  markerLayer = L.layerGroup().addTo(map);
  drawRadius();
  drawMarkers();
});

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});

watch(() => [props.items, props.selectedId], drawMarkers);
watch(() => [props.center?.lat, props.center?.lng, props.radiusKm], drawRadius);
</script>

<style>
/* nicht scoped: Leaflet erzeugt die Marker-Elemente selbst */
.nx-map-wrap {
  position: relative;
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid rgba(243, 239, 232, 0.08);
}
.nx-map {
  height: min(58vh, 520px);
  min-height: 320px;
  background: var(--nx-bg);
}
.nx-map-legend {
  position: absolute;
  left: 10px;
  top: 10px;
  z-index: 500;
  display: flex;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(18, 17, 13, 0.82);
  backdrop-filter: blur(8px);
  font-size: 12px;
  color: var(--nx-cream);
}
.nx-map-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.nx-map-dot {
  display: inline-block;
  width: 11px;
  height: 11px;
  border: 2px solid var(--nx-accent);
  background: var(--nx-surface-2);
}
.nx-map-dot--group {
  border-radius: 50%;
}
.nx-map-dot--post {
  border-radius: 4px 50% 50% 50%;
  border-color: var(--nx-cream);
}
.nx-marker {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: var(--nx-surface-2);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45), inset 0 0 0 2px var(--sport);
  transition: transform 0.15s ease;
}
.nx-marker--group {
  border-radius: 50%;
  border: 3px solid var(--nx-accent);
}
.nx-marker--post {
  border-radius: 6px 50% 50% 50%;
  border: 3px solid var(--nx-cream);
}
.nx-marker--selected {
  transform: scale(1.25);
  background: var(--nx-accent);
}
.nx-map .leaflet-control-attribution {
  background: rgba(18, 17, 13, 0.75);
  color: var(--nx-muted);
  font-size: 10px;
}
.nx-map .leaflet-control-attribution a {
  color: var(--nx-cream);
}
.nx-map .leaflet-bar a {
  background: var(--nx-surface);
  color: var(--nx-cream);
  border-bottom-color: rgba(243, 239, 232, 0.1);
}
</style>
