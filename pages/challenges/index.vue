<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ChallengeCard from '../../components/ChallengeCard.vue'
import { useProgress } from '../../composables/useProgress'
import { CHALLENGES } from '../../utils/challenges'
import type { ChallengeId } from '../../utils/progress'

const { isChallengeDone } = useProgress()

/*
 * Prerendered HTML always shows zero progress. The persisted localStorage
 * state is only reflected after mount, so hydration matches the static
 * markup (same pattern as NetworkToggle and the lessons dashboard).
 */
const settled = ref(false)
onMounted(() => {
  settled.value = true
})

function showDone(id: ChallengeId): boolean {
  return settled.value && isChallengeDone(id)
}
</script>

<template>
  <div class="challenges">
    <header class="challenges__header">
      <h1 class="challenges__title">Your challenges</h1>
      <p class="challenges__lead">
        Four small challenges let you try real Solana actions with your own wallet, at your own
        pace. Start at the top and work your way down — each one has clear steps, and nothing
        happens without your approval.
      </p>
      <p class="challenges__honesty">
        There are no prizes, points, or badges here. The reward is what you'll know — and that
        you did it yourself.
      </p>
    </header>

    <ol class="challenges__list" role="list">
      <li v-for="challenge in CHALLENGES" :key="challenge.id" class="challenges__item">
        <ChallengeCard :challenge="challenge" :done="showDone(challenge.id)" />
      </li>
    </ol>
  </div>
</template>

<style scoped>
.challenges {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.challenges__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-4);
}

.challenges__title {
  margin: 0;
}

.challenges__lead {
  margin: 0;
  font-size: var(--text-lg);
}

.challenges__honesty {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 700;
}

.challenges__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
