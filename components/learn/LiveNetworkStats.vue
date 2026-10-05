<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { createSolanaRpc } from '@solana/kit'
import AppButton from '../AppButton.vue'
import AppNotice from '../AppNotice.vue'
import { CLUSTERS } from '../../utils/cluster'

/*
 * Live mainnet numbers for lesson 4. Always reads from mainnet — the lesson
 * teaches mainnet reality even when the learner's wallet is set to devnet
 * practice mode. Fetched only on the client (onMounted), so the prerendered
 * page shows the loading state and never calls the network during the build.
 *
 * One `getRecentPerformanceSamples(1)` call answers both questions: the
 * sample's transactions ÷ its seconds is the current TPS, and its seconds ÷
 * its slots is the time between notebook pages (about 0.4 s on mainnet).
 */
const MAINNET_RPC_URL = CLUSTERS['mainnet-beta'].rpcUrl

type Status = 'loading' | 'ready' | 'error'

const status = ref<Status>('loading')
const tps = ref(0)
const secondsPerPage = ref(0)

async function loadStats() {
  status.value = 'loading'
  try {
    const rpc = createSolanaRpc(MAINNET_RPC_URL)
    const samples = await rpc.getRecentPerformanceSamples(1).send()
    const sample = samples[0]
    const numSlots = sample ? Number(sample.numSlots) : 0
    if (!sample || sample.samplePeriodSecs <= 0 || numSlots <= 0) {
      throw new Error('no usable performance sample')
    }
    tps.value = Math.round(Number(sample.numTransactions) / sample.samplePeriodSecs)
    secondsPerPage.value = sample.samplePeriodSecs / numSlots
    status.value = 'ready'
  } catch {
    status.value = 'error'
  }
}

onMounted(loadStats)

const formattedTps = computed(() => tps.value.toLocaleString('en-US'))
const formattedSeconds = computed(() => secondsPerPage.value.toFixed(1))
</script>

<template>
  <div class="live-stats" aria-live="polite">
    <p v-if="status === 'loading'" class="live-stats__loading">
      Asking the live Solana network for its current numbers…
    </p>

    <template v-else-if="status === 'ready'">
      <p class="live-stats__line">
        Right now, Solana is handling about
        <strong class="live-stats__number">{{ formattedTps }}</strong>
        transactions every second.
      </p>
      <p class="live-stats__line">
        A new page is added to the notebook about every
        <strong class="live-stats__number">{{ formattedSeconds }}</strong>
        seconds.
      </p>
    </template>

    <div v-else class="live-stats__error">
      <AppNotice kind="warning">
        We couldn't load the live numbers right now — the network may be busy. Try again
        in a moment.
      </AppNotice>
      <AppButton variant="secondary" @click="loadStats">Try again</AppButton>
    </div>
  </div>
</template>

<style scoped>
.live-stats {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
}

.live-stats__loading {
  margin: 0;
  font-size: var(--text-lg);
}

.live-stats__line {
  margin: 0;
  font-size: var(--text-lg);
}

.live-stats__number {
  font-size: var(--text-xl);
  color: var(--color-secondary);
}

.live-stats__error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}
</style>
