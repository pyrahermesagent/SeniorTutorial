<script setup lang="ts">
import { LEARN_PAGES } from '../../utils/learnPages'

const route = useRoute()
const slug = String(route.params.slug)
const lesson = LEARN_PAGES[slug]

if (!lesson) {
  throw createError({ statusCode: 404, statusMessage: 'Lesson not found', fatal: true })
}
</script>

<template>
  <component :is="lesson" />
</template>
