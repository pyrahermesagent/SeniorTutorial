<script setup lang="ts">
import LessonShell from '../LessonShell.vue'
import InteractiveFigure from '../InteractiveFigure.vue'
import GlossaryTerm from '../GlossaryTerm.vue'
import TransferRaceSim from './TransferRaceSim.vue'
import { ref } from 'vue'

const raceKey = ref(0)
</script>

<template>
  <LessonShell
    lesson-slug="what-is-money"
    title="What is money, anyway?"
    intro="Before we try anything new, let's look at the money you already use — and why a new kind is worth your attention."
  >
    <section>
      <h2>Money runs on trust</h2>
      <p>
        Money works because we all agree to trust it. Today, banks keep the official record of
        who owns what. We trust them to keep that record safe and honest — and mostly, they do.
      </p>
    </section>

    <section>
      <h2>But the old system has limits</h2>
      <p>
        Banks keep office hours, even online. A <GlossaryTerm term="transfer">transfer</GlossaryTerm>
        to family abroad can take three business days and cost $25 or more in
        <GlossaryTerm term="fee">fees</GlossaryTerm> — and weekends don't count. Every payment
        passes through a company that can delay it, decline it, or freeze it.
      </p>
    </section>

    <section>
      <h2>A new kind of money</h2>
      <p>
        In 2009 a new idea appeared: money that lives on the internet itself, kept honest not by
        one company but by thousands of independent computers checking each other's work. No
        closing time. No borders. Fees measured in fractions of a penny. People call this
        "crypto", and Solana is one of the fastest and most widely used networks of its kind.
      </p>
      <p>
        It is not magic, and it is not a get-rich-quick scheme. It is simply a newer set of
        rails for moving value — and in these lessons you will see exactly how it works.
      </p>
    </section>

    <template #sim>
      <InteractiveFigure @replay="raceKey += 1">
        <TransferRaceSim :key="raceKey" />
        <template #caption>
          Watch the same $50 travel two ways: through a bank, and through Solana.
        </template>
      </InteractiveFigure>
    </template>
  </LessonShell>
</template>
