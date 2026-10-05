<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '../AppIcon.vue'
import {
  CLIENT_COUNT,
  MESH_NODE_COUNT,
  centralDown,
  createNetwork,
  meshAliveCount,
  meshRunning,
  toggleCentralServer,
  toggleNode,
} from '../../utils/network'

/*
 * Node positions in percent of the square mesh area — the SVG links and the
 * buttons share these coordinates so every line lands on a node center.
 */
const NODE_POSITIONS = [
  { x: 50, y: 20 },
  { x: 74, y: 29 },
  { x: 84, y: 50 },
  { x: 74, y: 71 },
  { x: 50, y: 80 },
  { x: 26, y: 71 },
  { x: 16, y: 50 },
  { x: 26, y: 29 },
]

/** Ring plus four cross-links: every node is connected to three others. */
const MESH_LINKS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 0],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
]

const CLIENT_NAMES = ['You', 'Anna', 'Marco', 'Rosa'].slice(0, CLIENT_COUNT)

const network = ref(createNetwork())

const isCentralDown = computed(() => centralDown(network.value))
const aliveCount = computed(() => meshAliveCount(network.value))
const isMeshRunning = computed(() => meshRunning(network.value))

const centralStatus = computed(() =>
  isCentralDown.value
    ? 'System down — everyone is cut off'
    : 'Running — but every computer here depends on that one server.',
)

const meshStatus = computed(() =>
  isMeshRunning.value
    ? `Still running — ${aliveCount.value} of ${MESH_NODE_COUNT} computers working`
    : 'All computers are off — the network is down',
)

function toggleServer() {
  network.value = toggleCentralServer(network.value)
}

function toggleMeshNode(index: number) {
  network.value = toggleNode(network.value, index)
}

function linkDead(link: [number, number]): boolean {
  return !network.value.meshNodesOn[link[0]] || !network.value.meshNodesOn[link[1]]
}
</script>

<template>
  <div class="network-sim">
    <p class="network-sim__hint">
      Tap a computer to unplug it. Tap it again to plug it back in.
    </p>

    <div class="network-sim__panels">
      <section class="network-panel network-panel--central" aria-labelledby="network-central-title">
        <h3 id="network-central-title" class="network-panel__title">One company in charge</h3>
        <p class="network-panel__story">One server in the middle. Everyone connects through it.</p>

        <div class="central-tree" :class="{ 'central-tree--down': isCentralDown }">
          <button
            type="button"
            class="central-tree__server"
            :aria-pressed="isCentralDown"
            @click="toggleServer"
          >
            <AppIcon :name="isCentralDown ? 'server-off' : 'server'" :size="28" />
            <span>The one central server</span>
          </button>
          <div class="central-tree__trunk" aria-hidden="true" />
          <ul class="central-tree__clients">
            <li
              v-for="name in CLIENT_NAMES"
              :key="name"
              class="central-tree__client"
              :class="{ 'central-tree__client--cut': isCentralDown }"
            >
              <AppIcon name="monitor" :size="24" />
              <span>{{ name }}</span>
            </li>
          </ul>
        </div>

        <p class="network-panel__status" aria-live="polite">{{ centralStatus }}</p>
      </section>

      <section class="network-panel network-panel--mesh" aria-labelledby="network-mesh-title">
        <h3 id="network-mesh-title" class="network-panel__title">Many independent keepers</h3>
        <p class="network-panel__story">
          Eight computers, each connected to the others. No boss in the middle.
        </p>

        <div class="mesh">
          <svg class="mesh__links" viewBox="0 0 100 100" aria-hidden="true">
            <line
              v-for="(link, linkIndex) in MESH_LINKS"
              :key="linkIndex"
              class="mesh__link"
              :class="{ 'mesh__link--dead': linkDead(link) }"
              :x1="NODE_POSITIONS[link[0]]!.x"
              :y1="NODE_POSITIONS[link[0]]!.y"
              :x2="NODE_POSITIONS[link[1]]!.x"
              :y2="NODE_POSITIONS[link[1]]!.y"
            />
          </svg>
          <button
            v-for="(on, index) in network.meshNodesOn"
            :key="index"
            type="button"
            class="mesh__node"
            :class="{ 'mesh__node--off': !on }"
            :style="{ left: `${NODE_POSITIONS[index]!.x}%`, top: `${NODE_POSITIONS[index]!.y}%` }"
            :aria-pressed="!on"
            :aria-label="`Computer ${index + 1}`"
            @click="toggleMeshNode(index)"
          >
            <AppIcon :name="on ? 'server' : 'server-off'" :size="26" />
            <span class="mesh__node-state" aria-hidden="true">{{ on ? index + 1 : 'off' }}</span>
          </button>
        </div>

        <p class="network-panel__status" aria-live="polite">{{ meshStatus }}</p>
      </section>
    </div>

    <p class="network-sim__solana">
      Solana has over 1,000 independent computers like these. No single one can be switched
      off to stop it.
    </p>
  </div>
</template>

<style scoped>
.network-sim {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
}

.network-sim__hint {
  margin: 0;
  font-size: var(--text-base);
}

.network-sim__panels {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

@media (min-width: 768px) {
  .network-sim__panels {
    flex-direction: row;
    align-items: stretch;
  }

  .network-panel {
    flex: 1 1 0;
  }
}

.network-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  background-color: var(--color-surface);
  border: 2px solid color-mix(in srgb, var(--color-ink) 20%, transparent);
  border-radius: 12px;
}

.network-panel__title {
  margin: 0;
}

.network-panel__story {
  margin: 0;
  font-size: var(--text-base);
  color: var(--color-secondary);
}

.network-panel__status {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
}

/* --- Left panel: the central server and its four dependent clients --- */

.central-tree {
  display: flex;
  flex-direction: column;
}

.central-tree__server {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  align-self: center;
  width: 100%;
  min-height: 2.8rem; /* 56px touch target */
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-surface);
  border: 3px solid var(--color-ink);
  border-radius: 12px;
  color: var(--color-ink);
  font-weight: 700;
  cursor: pointer;
  transition: background-color 120ms ease;
}

.central-tree__server:hover {
  background-color: color-mix(in srgb, var(--color-ink) 8%, transparent);
}

.central-tree--down .central-tree__server {
  border-style: dashed;
  border-color: color-mix(in srgb, var(--color-ink) 40%, transparent);
  color: color-mix(in srgb, var(--color-ink) 55%, transparent);
  background-color: color-mix(in srgb, var(--color-ink) 6%, transparent);
}

.central-tree__trunk {
  align-self: center;
  width: 3px;
  height: var(--space-3);
  background-color: color-mix(in srgb, var(--color-ink) 35%, transparent);
}

.central-tree__clients {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.central-tree__clients::before {
  content: '';
  position: absolute;
  top: 0;
  left: 12.5%;
  right: 12.5%;
  height: 3px;
  background-color: color-mix(in srgb, var(--color-ink) 35%, transparent);
}

.central-tree__client {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding-top: var(--space-3);
  font-size: var(--text-base);
  font-weight: 700;
  text-align: center;
}

.central-tree__client::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 3px;
  height: var(--space-3);
  background-color: color-mix(in srgb, var(--color-ink) 35%, transparent);
}

.central-tree--down .central-tree__trunk,
.central-tree--down .central-tree__clients::before,
.central-tree--down .central-tree__client::before {
  background-color: color-mix(in srgb, var(--color-ink) 15%, transparent);
}

.central-tree__client--cut {
  color: color-mix(in srgb, var(--color-ink) 45%, transparent);
}

/* --- Right panel: the mesh of eight independent nodes --- */

.mesh {
  position: relative;
  width: 100%;
  max-width: 22rem;
  margin: 0 auto;
  aspect-ratio: 1 / 1;
}

.mesh__links {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.mesh__link {
  stroke: color-mix(in srgb, var(--color-ink) 35%, transparent);
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}

.mesh__link--dead {
  stroke: color-mix(in srgb, var(--color-ink) 18%, transparent);
  stroke-dasharray: 5 5;
}

.mesh__node {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 3rem; /* 60px touch target */
  height: 3rem;
  min-height: 3rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-surface);
  border: 3px solid var(--color-ink);
  border-radius: 50%;
  color: var(--color-ink);
  cursor: pointer;
  transition: background-color 120ms ease;
}

.mesh__node:hover {
  background-color: color-mix(in srgb, var(--color-ink) 8%, transparent);
}

.mesh__node--off,
.mesh__node--off:hover {
  border-style: dashed;
  border-color: color-mix(in srgb, var(--color-ink) 40%, transparent);
  color: color-mix(in srgb, var(--color-ink) 50%, transparent);
  background-color: color-mix(in srgb, var(--color-ink) 6%, transparent);
}

.mesh__node-state {
  position: absolute;
  top: calc(100% + 0.15rem);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: var(--text-base);
  font-weight: 700;
}

.network-sim__solana {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-success-bg);
  border: 2px solid var(--color-success);
  border-radius: 12px;
  color: var(--color-success);
  font-size: var(--text-lg);
  font-weight: 700;
  text-align: center;
}
</style>
