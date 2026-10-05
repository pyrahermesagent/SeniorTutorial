<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import AppIcon from '../AppIcon.vue'
import {
  BANK_DONE_TICK,
  bankDay,
  bankProgress,
  bankReceipt,
  raceStep,
  solanaProgress,
  solanaReceipt,
  startRace,
  type RaceState,
} from '../../utils/transferRace'

const TICK_MS = 200

const state = ref<RaceState>({ status: 'idle', tick: 0 })
let timer: ReturnType<typeof setInterval> | null = null

const running = computed(() => state.value.status === 'running')
const finished = computed(() => state.value.status === 'finished')

const solanaStyle = computed(() => ({ left: `${solanaProgress(state.value) * 100}%` }))
const bankStyle = computed(() => ({ left: `${bankProgress(state.value) * 100}%` }))

const bankCaption = computed(() => {
  const day = bankDay(state.value)
  if (day !== null) {
    return `Day ${day} — still travelling…`
  }
  return bankReceipt(state.value) ?? 'Waiting at the bank'
})

const solanaCaption = computed(
  () => solanaReceipt(state.value) ?? 'Ready when you are',
)

function stopTimer() {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

function play() {
  if (running.value) {
    return
  }
  state.value = startRace()
  stopTimer()
  timer = setInterval(() => {
    state.value = raceStep(state.value)
    if (state.value.status === 'finished') {
      stopTimer()
    }
  }, TICK_MS)
}

onBeforeUnmount(stopTimer)

defineExpose({ play })
</script>

<template>
  <div class="race">
    <div class="race__lane" aria-live="polite">
      <div class="race__label">
        <AppIcon name="zap" :size="28" />
        <span>Solana</span>
      </div>
      <div class="race__track">
        <span class="race__runner race__runner--solana" :style="solanaStyle" />
      </div>
      <p class="race__caption race__caption--solana">{{ solanaCaption }}</p>
    </div>

    <div class="race__lane" aria-live="polite">
      <div class="race__label">
        <AppIcon name="landmark" :size="28" />
        <span>Your bank</span>
      </div>
      <div class="race__track">
        <span class="race__runner race__runner--bank" :style="bankStyle" />
      </div>
      <p class="race__caption">{{ bankCaption }}</p>
    </div>

    <button
      v-if="!running && !finished"
      type="button"
      class="race__play"
      @click="play"
    >
      <AppIcon name="play" :size="24" />
      Send $50 both ways
    </button>
    <p v-if="finished" class="race__verdict">
      Same $50. Same you. Very different journey. Use the Replay button to watch it again.
    </p>
  </div>
</template>

<style scoped>
.race {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: 100%;
}

.race__lane {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.race__label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-lg);
  font-weight: 700;
}

.race__track {
  position: relative;
  height: 1rem;
  background-color: color-mix(in srgb, var(--color-ink) 10%, transparent);
  border-radius: 999px;
  overflow: hidden;
}

.race__runner {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1rem;
  border-radius: 999px;
  transform: translateX(-50%);
  transition: left 180ms linear;
}

.race__runner--solana {
  background-color: var(--color-accent);
}

.race__runner--bank {
  background-color: var(--color-secondary);
}

.race__caption {
  margin: 0;
  font-size: var(--text-base);
  min-height: 1.6em;
}

.race__caption--solana {
  font-weight: 700;
}

.race__play {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  align-self: center;
  min-height: 2.8rem; /* 56px touch target */
  padding: var(--space-2) var(--space-5);
  background-color: var(--color-accent);
  color: var(--color-ink);
  border: none;
  border-radius: 12px;
  font-size: var(--text-lg);
  font-weight: 700;
  cursor: pointer;
}

.race__play:hover {
  background-color: color-mix(in srgb, var(--color-accent) 88%, var(--color-ink));
}

.race__verdict {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
  text-align: center;
}
</style>
