<script setup lang="ts">
import AppIcon from './AppIcon.vue'

const items = [
  { to: '/learn', label: 'Learn', icon: 'graduation-cap' },
  { to: '/start', label: 'Start', icon: 'rocket' },
  { to: '/challenges', label: 'Challenges', icon: 'trophy' },
  { to: '/glossary', label: 'Glossary', icon: 'book-open' },
]
</script>

<template>
  <nav class="bottom-nav" aria-label="Main sections">
    <NuxtLink v-for="item in items" :key="item.to" :to="item.to" class="bottom-nav__link">
      <AppIcon :name="item.icon" :size="28" />
      <span class="bottom-nav__label">{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
/* Hidden on tablets and desktops; only small screens get the bottom bar. */
.bottom-nav {
  display: none;
}

@media (max-width: 767.98px) {
  .bottom-nav {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 30;
    display: flex;
    background-color: var(--color-surface);
    border-top: 2px solid var(--color-ink);
    padding-bottom: env(safe-area-inset-bottom);
  }

  .bottom-nav__link {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-height: 3.6rem; /* 72px — generous target for unsure fingers */
    padding: var(--space-1);
    color: var(--color-ink);
    font-size: var(--text-base);
    font-weight: 700;
    text-decoration: none;
  }

  /* Amber only ever carries ink text — light text on it fails AA (2.02:1). */
  .bottom-nav__link.router-link-active {
    background-color: var(--color-accent);
    color: var(--color-ink);
  }

  .bottom-nav__link:focus-visible {
    outline: var(--focus-ring);
    outline-offset: calc(-1 * var(--focus-ring-width));
  }
}
</style>
