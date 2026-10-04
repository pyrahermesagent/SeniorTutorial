<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import AppNotice from './AppNotice.vue'
import { useWallet } from '../composables/useWallet'
import { classifySendError, type StandardWalletInfo } from '../utils/wallets'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { wallets, connect } = useWallet()

const connectError = ref<string | null>(null)

async function choose(info: StandardWalletInfo) {
  connectError.value = null
  try {
    await connect(info.name)
    emit('close')
  } catch (error) {
    // A cancelled connection just leaves the dialog open — no scolding.
    if (classifySendError(error) === 'rejected' || error === 'rejected') return
    connectError.value =
      'We could not connect to that wallet. Check that it is unlocked, then try again.'
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) connectError.value = null
  },
)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div v-if="open" class="wallet-modal" @click.self="emit('close')">
    <div
      class="wallet-modal__panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
    >
      <div class="wallet-modal__header">
        <h2 id="wallet-modal-title" class="wallet-modal__title">Connect your wallet</h2>
        <button type="button" class="wallet-modal__close" aria-label="Close" @click="emit('close')">
          <AppIcon name="x" :size="28" />
        </button>
      </div>

      <ul v-if="wallets.length" class="wallet-modal__list">
        <li v-for="info in wallets" :key="info.name">
          <button type="button" class="wallet-row" @click="choose(info)">
            <img v-if="info.icon" :src="info.icon" alt="" class="wallet-row__icon" />
            <AppIcon v-else name="wallet" :size="32" class="wallet-row__icon" />
            <span class="wallet-row__name">{{ info.name }}</span>
          </button>
        </li>
      </ul>

      <div v-else class="wallet-modal__empty">
        <AppNotice kind="info">No wallet found on this device.</AppNotice>
        <p class="wallet-modal__empty-text">
          A wallet is a free app that keeps your Solana account safe. Install one of these two,
          then come back to this page:
        </p>
        <div class="wallet-modal__install">
          <a
            class="wallet-modal__install-link"
            href="https://solflare.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <AppIcon name="external-link" :size="24" />
            Get Solflare
          </a>
          <a
            class="wallet-modal__install-link"
            href="https://phantom.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <AppIcon name="external-link" :size="24" />
            Get Phantom
          </a>
        </div>
      </div>

      <AppNotice v-if="connectError" kind="warning" class="wallet-modal__error">
        {{ connectError }}
      </AppNotice>
    </div>
  </div>
</template>

<style scoped>
.wallet-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-3);
  background-color: color-mix(in srgb, var(--color-ink) 55%, transparent);
}

.wallet-modal__panel {
  width: 100%;
  max-width: 28rem; /* 560px */
  max-height: 85vh;
  overflow-y: auto;
  padding: var(--space-4);
  background-color: var(--color-bg);
  border: 3px solid var(--color-ink);
  border-radius: 16px;
}

.wallet-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.wallet-modal__title {
  margin: 0;
  font-size: var(--text-xl);
  color: var(--color-ink);
}

.wallet-modal__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.8rem; /* 56px touch target */
  min-height: 2.8rem;
  padding: 0;
  background: transparent;
  border: 2px solid transparent;
  border-radius: 12px;
  color: var(--color-ink);
  cursor: pointer;
}

.wallet-modal__close:hover {
  background-color: color-mix(in srgb, var(--color-ink) 8%, transparent);
}

.wallet-modal__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.wallet-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-height: 3.2rem; /* 64px — generous row for unsure fingers */
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-surface);
  border: 2px solid var(--color-ink);
  border-radius: 12px;
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-ink);
  text-align: left;
  cursor: pointer;
}

.wallet-row:hover {
  background-color: color-mix(in srgb, var(--color-accent) 25%, var(--color-surface));
}

.wallet-row__icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: contain;
}

.wallet-modal__empty {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.wallet-modal__empty-text {
  margin: 0;
  font-size: var(--text-base);
  line-height: 1.5;
  color: var(--color-ink);
}

.wallet-modal__install {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.wallet-modal__install-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  min-height: 2.8rem; /* 56px touch target */
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-secondary);
  border: 2px solid var(--color-secondary);
  border-radius: 12px;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-bg);
  text-decoration: none;
}

.wallet-modal__install-link:hover {
  background-color: color-mix(in srgb, var(--color-secondary) 85%, var(--color-ink));
}

.wallet-modal__error {
  margin-top: var(--space-3);
}

.wallet-row:focus-visible,
.wallet-modal__close:focus-visible,
.wallet-modal__install-link:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}
</style>
