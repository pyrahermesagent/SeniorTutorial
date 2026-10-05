<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '../components/AppCard.vue'
import { GLOSSARY } from '../content/glossary'

/*
 * Alphabetical by term, case-insensitive. The content file is kept sorted
 * too, but the page never relies on it — the reader always sees A to Z.
 */
const entries = computed(() =>
  [...GLOSSARY].sort((a, b) => a.term.toLowerCase().localeCompare(b.term.toLowerCase(), 'en')),
)

/* Letter index: each letter jumps to the first entry starting with it. */
const letterIndex = computed(() => {
  const seen = new Set<string>()
  const items: { letter: string; slug: string }[] = []
  for (const entry of entries.value) {
    const letter = entry.term.charAt(0).toUpperCase()
    if (!seen.has(letter)) {
      seen.add(letter)
      items.push({ letter, slug: entry.slug })
    }
  }
  return items
})
</script>

<template>
  <div class="glossary">
    <header class="glossary__header">
      <h1 class="glossary__title">Glossary</h1>
      <p class="glossary__lead">
        New words, explained plainly. Tap any dotted word in a lesson to land here.
      </p>
    </header>

    <nav class="glossary__index" aria-label="Jump to a letter">
      <a
        v-for="item in letterIndex"
        :key="item.letter"
        :href="`#${item.slug}`"
        class="glossary__letter"
        >{{ item.letter }}</a
      >
    </nav>

    <ul class="glossary__list" role="list">
      <li v-for="entry in entries" :key="entry.slug" class="glossary__item">
        <AppCard>
          <h2 :id="entry.slug" class="glossary__term">{{ entry.term }}</h2>
          <p class="glossary__definition">{{ entry.definition }}</p>
        </AppCard>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.glossary {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.glossary__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-4);
}

.glossary__title {
  margin: 0;
}

.glossary__lead {
  margin: 0;
  font-size: var(--text-lg);
}

.glossary__index {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.glossary__letter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.4rem;
  min-height: 2.4rem;
  padding: var(--space-1) var(--space-2);
  border: 2px solid color-mix(in srgb, var(--color-ink) 30%, transparent);
  border-radius: 999px;
  color: var(--color-ink);
  font-weight: 700;
  text-decoration: none;
}

.glossary__letter:hover {
  border-color: var(--color-ink);
  color: var(--color-secondary);
}

.glossary__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Keeps a jumped-to entry clear of the very top of the window. */
.glossary__term {
  margin: 0;
  scroll-margin-top: var(--space-4);
}

.glossary__definition {
  margin: var(--space-2) 0 0;
}
</style>
