<script setup lang="ts">
withDefaults(defineProps<{ padded?: boolean }>(), { padded: true })
</script>

<template>
  <div class="app-card" :class="{ 'app-card--padded': padded }">
    <slot />
  </div>
</template>

<style scoped>
.app-card {
  background-color: var(--color-surface);
  border: 2px solid color-mix(in srgb, var(--color-ink) 12%, transparent);
  border-radius: 12px;
}

.app-card--padded {
  padding: var(--space-4);
}
</style>
