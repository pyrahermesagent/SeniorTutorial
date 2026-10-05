<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppCard from './AppCard.vue'
import AppIcon from './AppIcon.vue'
import AppNotice from './AppNotice.vue'
import WalletButton from './WalletButton.vue'
import { useProgress } from '../composables/useProgress'
import { useSolana } from '../composables/useSolana'
import { useWallet } from '../composables/useWallet'
import type { ChallengeId } from '../utils/progress'

/*
 * Challenge page scaffolding.
 *
 * Completion contract: challenge PAGES (Tasks 18–21) call
 * useProgress().markChallengeDone(challenge) themselves when their
 * transaction succeeds. This shell never marks anything — it only READS
 * isChallengeDone(challenge) to show the completion tick.
 *
 * SSR contract: the prerendered HTML always shows the not-connected state
 * (goal + estimate + connect notice) and no completion tick. The connected
 * challenge UI, the tick, and any Mainnet warning are revealed after mount
 * via the settled ref, so hydration matches the static markup (the same
 * pattern as NetworkToggle).
 *
 * Slots: the default slot is the challenge UI (shown only when a wallet is
 * connected); the optional `recap` slot lets a page add a summary card
 * (for example after success).
 */
const props = defineProps<{
  challenge: ChallengeId
  goal: string
  estCost: string
}>()

defineSlots<{ default?: () => unknown; recap?: () => unknown }>()

const { account } = useWallet()
const { cluster } = useSolana()
const { isChallengeDone } = useProgress()

const settled = ref(false)
onMounted(() => {
  settled.value = true
})

const connected = computed(() => settled.value && account.value !== null)
const showDone = computed(() => settled.value && isChallengeDone(props.challenge))
const showMainnetWarning = computed(() => settled.value && cluster.value === 'mainnet-beta')
</script>

<template>
  <section class="challenge-shell" :data-challenge="challenge">
    <header class="challenge-shell__header">
      <p class="challenge-shell__goal">{{ goal }}</p>
      <p class="challenge-shell__cost">Estimated cost: {{ estCost }}</p>
      <p v-if="showDone" class="challenge-shell__done">
        <AppIcon name="circle-check" :size="24" />
        You've finished this challenge — well done!
      </p>
    </header>

    <div v-if="!connected" class="challenge-shell__connect">
      <AppNotice kind="info">
        <p>Connect your wallet to try this challenge. It is safe — connecting only lets this site see your balance, never move your money.</p>
      </AppNotice>
      <WalletButton />
    </div>

    <template v-else>
      <AppNotice v-if="showMainnetWarning" kind="warning">
        <p>
          Careful: you are on Mainnet, so this challenge uses real money. To practice free of
          charge first, switch to Devnet in the top bar.
        </p>
      </AppNotice>
      <slot />
      <AppCard v-if="$slots.recap" class="challenge-shell__recap">
        <slot name="recap" />
      </AppCard>
    </template>
  </section>
</template>

<style scoped>
.challenge-shell {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.challenge-shell__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.challenge-shell__goal {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
}

.challenge-shell__cost {
  margin: 0;
  font-size: var(--text-base);
  color: var(--color-secondary);
}

.challenge-shell__done {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  align-self: flex-start;
  margin: 0;
  padding: var(--space-1) var(--space-2);
  background-color: var(--color-success-bg);
  border: 2px solid var(--color-success);
  border-radius: 999px;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-success);
}

.challenge-shell__connect {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

.challenge-shell__connect p {
  margin: 0;
}
</style>
