<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{ error: NuxtError }>()
</script>

<template>
  <main>
    <h1>We can't find that page</h1>
    <p v-if="error.statusCode === 404">
      The page you asked for isn't here. It may have moved, or there may be a
      small typo in the address.
    </p>
    <p v-else>Something didn't work on our side. Please try again in a moment.</p>
    <NuxtLink to="/">Back to the start</NuxtLink>
  </main>
</template>
