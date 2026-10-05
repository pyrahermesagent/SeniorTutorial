<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '../AppButton.vue'
import AppIcon from '../AppIcon.vue'
import {
  addEntry,
  createLedger,
  resolveLedger,
  tamper,
  type NotebookCopy,
} from '../../utils/ledger'

const SUGGESTED_ENTRY = 'Anna pays Marco 2 SOL'

const copies = ref<NotebookCopy[]>(createLedger())
const draft = ref(SUGGESTED_ENTRY)
const cheating = ref(false)
const cheatTarget = ref<number | null>(null)
const cheatDraft = ref('')
const lastCheck = ref<'none' | 'agreed' | 'rejected'>('none')

const hasEntries = computed(() => (copies.value[0]?.entries.length ?? 0) > 0)

const statusLine = computed(() => {
  if (cheating.value && cheatTarget.value === null) {
    return 'Your turn: pick ONE notebook to cheat with — the others stay as they are.'
  }
  if (cheating.value) {
    return `Change the newest line in notebook ${cheatTarget.value + 1}, then check what the others say.`
  }
  if (lastCheck.value === 'rejected') {
    const index = copies.value.findIndex((copy) => copy.status === 'rejected')
    return `Notebook ${index + 1} disagreed with the others — so they outvoted it and changed it back. The notebooks vote; the odd one out loses.`
  }
  if (lastCheck.value === 'agreed') {
    return 'All four notebooks agree — there was nothing to fix.'
  }
  if (hasEntries.value) {
    return 'The new line landed in all four notebooks at once. Now try to cheat one of them.'
  }
  return 'Four helpers each keep an identical copy of the same notebook.'
})

function add() {
  const next = addEntry(copies.value, draft.value)
  if (next === copies.value) {
    return
  }
  copies.value = next
  lastCheck.value = 'none'
}

function startCheating() {
  cheating.value = true
  cheatTarget.value = null
  cheatDraft.value = ''
}

function pickCheatTarget(index: number) {
  const copy = copies.value[index]
  if (!copy || copy.entries.length === 0) {
    return
  }
  cheatTarget.value = index
  cheatDraft.value = copy.entries[copy.entries.length - 1] ?? ''
}

function check() {
  let next = copies.value
  if (cheatTarget.value !== null) {
    const copy = copies.value[cheatTarget.value]
    const original = copy?.entries[copy.entries.length - 1]
    if (original !== undefined && cheatDraft.value !== original) {
      next = tamper(next, cheatTarget.value, cheatDraft.value)
    }
  }
  next = resolveLedger(next)
  copies.value = next
  cheating.value = false
  cheatTarget.value = null
  lastCheck.value = next.some((copy) => copy.status === 'rejected') ? 'rejected' : 'agreed'
}
</script>

<template>
  <div class="ledger">
    <div class="ledger__controls">
      <label class="ledger__label" for="ledger-entry">Write a new line for the notebooks</label>
      <div class="ledger__entry-row">
        <input
          id="ledger-entry"
          v-model="draft"
          class="ledger__input"
          type="text"
          :placeholder="SUGGESTED_ENTRY"
          :disabled="cheating"
        />
        <AppButton :disabled="cheating" @click="add">Add to all notebooks</AppButton>
      </div>
    </div>

    <ol class="ledger__copies">
      <li
        v-for="(copy, index) in copies"
        :key="index"
        class="ledger__copy"
        :class="{ 'ledger__copy--rejected': copy.status === 'rejected' }"
      >
        <header class="ledger__copy-header">
          <AppIcon name="notebook-pen" :size="24" />
          <span class="ledger__copy-name">Notebook {{ index + 1 }}</span>
          <span v-if="copy.status === 'rejected'" class="ledger__badge">Outvoted</span>
        </header>
        <TransitionGroup v-if="copy.entries.length > 0" name="ledger-line" tag="ul" class="ledger__entries">
          <li
            v-for="(entry, entryIndex) in copy.entries"
            :key="entryIndex"
            class="ledger__entry"
            :style="{ '--line-delay': `${index * 120}ms` }"
          >
            <input
              v-if="cheating && cheatTarget === index && entryIndex === copy.entries.length - 1"
              v-model="cheatDraft"
              class="ledger__cheat-input"
              type="text"
              :aria-label="`Change the newest line of notebook ${index + 1}`"
            />
            <template v-else>{{ entry }}</template>
          </li>
        </TransitionGroup>
        <p v-else class="ledger__empty">Empty so far</p>
        <button
          v-if="cheating"
          type="button"
          class="ledger__pick"
          :class="{ 'ledger__pick--active': cheatTarget === index }"
          :aria-pressed="cheatTarget === index"
          @click="pickCheatTarget(index)"
        >
          {{ cheatTarget === index ? 'Cheating with this one' : 'Cheat with this notebook' }}
        </button>
      </li>
    </ol>

    <p class="ledger__status" aria-live="polite">{{ statusLine }}</p>

    <div class="ledger__actions">
      <AppButton v-if="!cheating" variant="secondary" :disabled="!hasEntries" @click="startCheating">
        Try to cheat
      </AppButton>
      <AppButton v-else @click="check">Check the notebooks</AppButton>
    </div>
  </div>
</template>

<style scoped>
.ledger {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
}

.ledger__controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.ledger__label {
  font-size: var(--text-base);
  font-weight: 700;
}

.ledger__entry-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.ledger__input {
  flex: 1 1 16rem;
  min-height: 2.8rem; /* 56px touch target */
  padding: var(--space-1) var(--space-2);
  border: 2px solid var(--color-ink);
  border-radius: 12px;
  background-color: var(--color-surface);
  color: var(--color-ink);
  font-family: var(--font-body);
  font-size: var(--text-base);
}

.ledger__copies {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.ledger__copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2);
  background-color: var(--color-surface);
  border: 2px solid color-mix(in srgb, var(--color-ink) 20%, transparent);
  border-radius: 12px;
}

.ledger__copy--rejected {
  background-color: var(--color-warning-bg);
  border-color: var(--color-accent);
  animation: ledger-snap-back 500ms ease;
}

@keyframes ledger-snap-back {
  0% {
    transform: scale(1.04);
  }
  100% {
    transform: scale(1);
  }
}

.ledger__copy-header {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-base);
  font-weight: 700;
}

.ledger__badge {
  margin-left: auto;
  padding: 0 var(--space-1);
  background-color: var(--color-accent);
  color: var(--color-ink); /* ink on amber — the only AA-safe pairing */
  border-radius: 8px;
  font-size: var(--text-base);
  font-weight: 700;
}

.ledger__entries {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.ledger__entry {
  padding: var(--space-1);
  background-color: var(--color-info-bg);
  border-radius: 8px;
  font-size: var(--text-base);
}

.ledger-line-enter-active {
  transition:
    opacity 300ms ease,
    transform 300ms ease;
  transition-delay: var(--line-delay, 0ms); /* staggered per notebook, driven by state */
}

.ledger-line-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.ledger__cheat-input {
  width: 100%;
  min-height: 2.4rem; /* 48px touch target */
  padding: 0 var(--space-1);
  border: 2px solid var(--color-accent);
  border-radius: 8px;
  background-color: var(--color-warning-bg);
  color: var(--color-ink);
  font-family: var(--font-body);
  font-size: var(--text-base);
}

.ledger__empty {
  margin: 0;
  font-size: var(--text-base);
  color: var(--color-secondary);
}

.ledger__pick {
  min-height: 2.4rem; /* 48px touch target */
  padding: var(--space-1) var(--space-2);
  background-color: transparent;
  border: 2px solid var(--color-ink);
  border-radius: 12px;
  color: var(--color-ink);
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: 700;
  cursor: pointer;
  transition: background-color 120ms ease;
}

.ledger__pick:hover {
  background-color: color-mix(in srgb, var(--color-ink) 8%, transparent);
}

.ledger__pick--active,
.ledger__pick--active:hover {
  background-color: var(--color-accent);
  color: var(--color-ink); /* ink on amber — the only AA-safe pairing */
}

.ledger__status {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
}

.ledger__actions {
  display: flex;
  justify-content: center;
}
</style>
