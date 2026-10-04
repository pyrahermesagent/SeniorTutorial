<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import AppButton from './AppButton.vue'
import AppIcon from './AppIcon.vue'
import WalletConnectModal from './WalletConnectModal.vue'
import { useWallet } from '../composables/useWallet'
import { shortenAddress } from '../utils/wallets'

const { account, connecting, disconnect } = useWallet()

const modalOpen = ref(false)
const menuOpen = ref(false)
const copied = ref(false)
const root = ref<HTMLElement | null>(null)

let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function copyAddress() {
  if (!account.value) return
  try {
    await navigator.clipboard.writeText(account.value.address)
    copied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // Older browsers may block clipboard access; the address stays visible.
  }
}

async function onDisconnect() {
  menuOpen.value = false
  await disconnect()
}

function onDocumentClick(event: MouseEvent) {
  if (menuOpen.value && root.value && !root.value.contains(event.target as Node)) {
    menuOpen.value = false
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') menuOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
  clearTimeout(copiedTimer)
})
</script>

<template>
  <div ref="root" class="wallet-button">
    <template v-if="account">
      <button
        type="button"
        class="wallet-chip"
        :aria-expanded="menuOpen"
        aria-haspopup="menu"
        :aria-label="`Wallet connected: ${account.address}. Open wallet options`"
        @click="menuOpen = !menuOpen"
      >
        <AppIcon name="wallet" :size="24" />
        <span class="wallet-chip__address">{{ shortenAddress(account.address) }}</span>
        <AppIcon name="chevron-down" :size="24" />
      </button>

      <div v-if="menuOpen" class="wallet-menu" role="menu">
        <button type="button" class="wallet-menu__item" role="menuitem" @click="copyAddress">
          <AppIcon :name="copied ? 'check' : 'copy'" :size="24" />
          {{ copied ? 'Copied!' : 'Copy address' }}
        </button>
        <button type="button" class="wallet-menu__item" role="menuitem" @click="onDisconnect">
          <AppIcon name="log-out" :size="24" />
          Disconnect
        </button>
      </div>
    </template>

    <AppButton v-else :loading="connecting" @click="modalOpen = true">
      <span class="wallet-button__connect">
        <AppIcon name="wallet" :size="24" />
        Connect wallet
      </span>
    </AppButton>

    <WalletConnectModal :open="modalOpen" @close="modalOpen = false" />
  </div>
</template>

<style scoped>
.wallet-button {
  position: relative;
  display: inline-block;
}

.wallet-button__connect {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.wallet-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 2.8rem; /* 56px touch target */
  padding: var(--space-1) var(--space-2);
  background-color: var(--color-surface);
  border: 2px solid var(--color-ink);
  border-radius: 999px;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-ink);
  cursor: pointer;
}

.wallet-chip:hover {
  background-color: color-mix(in srgb, var(--color-accent) 25%, var(--color-surface));
}

.wallet-chip__address {
  font-variant-numeric: tabular-nums;
}

.wallet-menu {
  position: absolute;
  top: calc(100% + var(--space-1));
  right: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  min-width: 14rem;
  padding: var(--space-1);
  background-color: var(--color-bg);
  border: 2px solid var(--color-ink);
  border-radius: 12px;
  box-shadow: 0 8px 24px color-mix(in srgb, var(--color-ink) 25%, transparent);
}

.wallet-menu__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 2.8rem; /* 56px touch target */
  padding: var(--space-1) var(--space-2);
  background: transparent;
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-ink);
  text-align: left;
  cursor: pointer;
}

.wallet-menu__item:hover {
  background-color: color-mix(in srgb, var(--color-accent) 25%, var(--color-bg));
}

.wallet-chip:focus-visible,
.wallet-menu__item:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}
</style>
