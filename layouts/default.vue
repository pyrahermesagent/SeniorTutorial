<script setup lang="ts">
import AppBottomNav from '../components/AppBottomNav.vue'
import AppTopBar from '../components/AppTopBar.vue'
</script>

<template>
  <div class="layout">
    <AppTopBar />
    <main class="layout__main">
      <slot />
    </main>
    <AppBottomNav />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* dvh keeps mobile URL-bar collapse from causing layout jumps. */
  min-height: 100dvh;
}

.layout__main {
  flex: 1;
  width: 100%;
  max-width: 56rem; /* 1120px reading column */
  margin: 0 auto;
  padding: var(--space-4) var(--space-3);
}

@media (max-width: 767.98px) {
  .layout__main {
    /* Keeps content clear of the fixed bottom navigation bar. */
    padding-bottom: calc(3.6rem + var(--space-4));
  }
}
</style>
