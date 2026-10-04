<script setup lang="ts">
import AppButton from '../components/AppButton.vue'
import AppNotice from '../components/AppNotice.vue'
</script>

<template>
  <div class="landing">
    <section class="hero" aria-labelledby="hero-title">
      <h1 id="hero-title" class="hero__title">
        Learn how the new internet of money works — at your own pace, one small step at a time.
      </h1>
      <p class="hero__lead">
        Free, friendly lessons about Solana. You practice with play money first, so nothing real
        is ever at risk.
      </p>
      <div class="hero__actions">
        <AppButton to="/learn" size="lg">Start learning</AppButton>
        <AppButton to="/start" variant="secondary" size="lg">
          I have a wallet — get started
        </AppButton>
      </div>
    </section>

    <AppNotice kind="info" class="landing__notice">
      <p class="landing__notice-title">What is this?</p>
      <p class="landing__notice-text">
        This is a free tutorial that teaches you, step by step, how Solana works — a new kind of
        money that lives on the internet. You do not need any computer or banking experience, and
        you can go as slowly as you like.
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

.landing__notice-title {
  margin: 0 0 var(--space-1);
  font-weight: 700;
}

.landing__notice-text {
  margin: 0;
}
</style>
