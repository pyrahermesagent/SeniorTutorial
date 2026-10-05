<script setup lang="ts">
import AppButton from '../components/AppButton.vue'
import AppNotice from '../components/AppNotice.vue'
</script>

<template>
  <div class="landing">
    <section class="hero" aria-labelledby="hero-title">
      <h1 id="hero-title" class="hero__title">
        Learn the new internet of money — one small step at a time.
      </h1>
      <p class="hero__lead">
        Free Solana lessons. You practice with play money, so nothing real is ever at risk.
      </p>
      <div class="hero__actions">
        <AppButton to="/learn" size="lg">Start learning</AppButton>
        <AppButton to="/start" variant="secondary" size="lg">
          I have a wallet — get started
        </AppButton>
      </div>
    </section>

    <AppNotice kind="info" class="landing__notice">
      <p class="landing__notice-text">
        No computer or banking experience needed. Go as slowly as you like.
      </p>
    </AppNotice>
  </div>
</template>

<style scoped>
.landing {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-4);
}

.hero > * {
  animation: hero-rise 500ms ease-out both;
}

.hero > :nth-child(2) {
  animation-delay: 90ms;
}

.hero > :nth-child(3) {
  animation-delay: 180ms;
}

@keyframes hero-rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.hero__title {
  margin: 0;
  max-width: 24ch;
}

.hero__lead {
  margin: 0;
  font-size: var(--text-lg);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.landing__notice {
  max-width: 40rem;
}

.landing__notice-text {
  margin: 0;
}
</style>
