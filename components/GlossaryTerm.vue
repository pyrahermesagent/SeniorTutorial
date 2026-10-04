<script setup lang="ts">
defineProps<{
  term: string
}>()
</script>

<template>
  <NuxtLink :to="`/glossary#${term}`" class="glossary-term">
    <slot>{{ term }}</slot>
  </NuxtLink>
</template>

<style scoped>
.glossary-term {
  color: var(--color-ink);
  text-decoration: underline;
  text-decoration-style: dotted;
  text-decoration-thickness: 2px;
  text-underline-offset: 0.2em;
}

.glossary-term:hover {
  color: var(--color-secondary);
}
</style>
