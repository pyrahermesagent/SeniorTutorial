<script setup lang="ts">
import { ref } from 'vue'
import AppButton from '../AppButton.vue'
import AppIcon from '../AppIcon.vue'
import AppNotice from '../AppNotice.vue'
import { useSolana } from '../../composables/useSolana'
import { useWallet } from '../../composables/useWallet'

const emit = defineEmits<{ funded: [] }>()

const { account } = useWallet()
const { requestDevnetAirdrop } = useSolana()

type FaucetState = 'idle' | 'pending' | 'success' | 'rate-limited' | 'unavailable'

const state = ref<FaucetState>('idle')

async function request() {
  const current = account.value
  if (!current || state.value === 'pending') return
  state.value = 'pending'
  const result = await requestDevnetAirdrop(current.address, 1)
  if ('sig' in result) {
    state.value = 'success'
    emit('funded')
  } else {
    state.value = result.error
  }
}
</script>

<template>
  <div class="devnet-faucet-button">
    <AppButton :loading="state === 'pending'" @click="request">
      <span class="devnet-faucet-button__label">
        <AppIcon name="droplets" :size="24" />
        {{ state === 'pending' ? 'Asking the faucet…' : 'Get 1 free practice SOL' }}
      </span>
    </AppButton>

    <AppNotice v-if="state === 'success'" kind="success" class="devnet-faucet-button__notice">
      <p>
        Done — 1 practice SOL is on its way to your wallet. It can take a few seconds to show up
        in your balance above.
      </p>
    </AppNotice>

    <AppNotice v-else-if="state === 'rate-limited'" kind="warning" class="devnet-faucet-button__notice">
      <p>
        The free practice faucet is busy right now. Wait a few minutes and try the button again,
        or use Solana's official faucet website:
        <a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer">
          faucet.solana.com
        </a>
      </p>
    </AppNotice>

    <AppNotice v-else-if="state === 'unavailable'" kind="warning" class="devnet-faucet-button__notice">
      <p>
        The practice faucet could not be reached just now. You can try again in a moment, or use
        Solana's official faucet website:
        <a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer">
          faucet.solana.com
        </a>
      </p>
    </AppNotice>
  </div>
</template>

<style scoped>
.devnet-faucet-button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

.devnet-faucet-button__label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.devnet-faucet-button__notice {
  max-width: 40rem;
}

.devnet-faucet-button__notice p {
  margin: 0;
}
</style>
