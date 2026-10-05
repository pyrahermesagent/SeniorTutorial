<script setup lang="ts">
import AppNotice from '../components/AppNotice.vue'
import StepList from '../components/start/StepList.vue'
</script>

<template>
  <div class="start">
    <header class="start__header">
      <h1 class="start__title">Get started</h1>
      <p class="start__lead">
        Three steps: get a wallet, add a little SOL, try a challenge.
      </p>
    </header>

    <StepList />

    <AppNotice kind="info" class="start__notice">
      <p>
        Brand new to all of this? The <NuxtLink to="/learn">six short lessons</NuxtLink> explain
        every idea from the very beginning — no computer or banking experience needed.
      </p>
    </AppNotice>
  </div>
</template>

<style scoped>
.start {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.start__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-4);
}

.start__title {
  margin: 0;
}

.start__lead {
  margin: 0;
  font-size: var(--text-lg);
}

.start__notice {
  max-width: 40rem;
}

.start__notice p {
  margin: 0;
}
</style>
