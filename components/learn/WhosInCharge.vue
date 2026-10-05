<script setup lang="ts">
import LessonShell from '../LessonShell.vue'
import InteractiveFigure from '../InteractiveFigure.vue'
import GlossaryTerm from '../GlossaryTerm.vue'
import NodeNetworkSim from './NodeNetworkSim.vue'
import { ref } from 'vue'

const networkKey = ref(0)
</script>

<template>
  <LessonShell
    lesson-slug="whos-in-charge"
    title="Who's in charge here?"
    intro="With a bank, the answer is easy — the bank is. With Solana, the answer is the very thing that makes it special."
  >
    <section>
      <h2>One company in charge</h2>
      <p>
        Most services you use every day are run by one company. Your bank keeps your account
        on its own computers. Your email lives on the computers of one provider. The photos
        you save online sit in one company's machines.
      </p>
      <p>
        That works well enough — until the one company has a problem. A breakdown, a power
        cut, a business decision, and the whole service stops for everyone at once. One
        company is in charge, and everyone else simply has to hope it keeps running.
      </p>
    </section>

    <section>
      <h2>Many independent keepers</h2>
      <p>
        Solana works the other way around. The shared notebook from lesson 2 is kept by many
        independent computers, run by different people in different places. These keepers are
        called <GlossaryTerm term="validator">validators</GlossaryTerm>, and because no
        single one of them is in charge, Solana is called
        <GlossaryTerm term="decentralized">decentralized</GlossaryTerm> — the power is spread
        out instead of sitting in one place.
      </p>
      <p>
        If a few validators stop working, the rest carry on without missing a beat. There is
        no head office to phone, and no single machine that everything depends on.
      </p>
    </section>

    <section>
      <h2>Why this matters to you</h2>
      <p>
        A system with one boss has one off-switch. A system with hundreds of independent
        keepers has none: no single company can be switched off to stop it, and no one can
        quietly change the rules — the other keepers would simply refuse to go along.
      </p>
      <p>
        Solana's validators are run by different people in different places, on their own
        equipment, and they keep each other honest. Your money never depends on any one of
        them.
      </p>
    </section>

    <template #sim>
      <InteractiveFigure @replay="networkKey += 1">
        <NodeNetworkSim :key="networkKey" />
        <template #caption>
          Unplug the one server on the left — then try to switch off the whole network on
          the right.
        </template>
      </InteractiveFigure>
    </template>
  </LessonShell>
</template>
