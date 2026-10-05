<script setup lang="ts">
import LessonShell from '../LessonShell.vue'
import InteractiveFigure from '../InteractiveFigure.vue'
import GlossaryTerm from '../GlossaryTerm.vue'
import LiveNetworkStats from './LiveNetworkStats.vue'
import FeeComparisonSlider from './FeeComparisonSlider.vue'
import { ref } from 'vue'

const statsKey = ref(0)
</script>

<template>
  <LessonShell
    lesson-slug="why-solana"
    title="Why Solana?"
    intro="There are many shared notebooks. Solana is the one built to be fast, inexpensive, and always on — and you can watch it working right now."
  >
    <section>
      <h2>Fast like a text message</h2>
      <p>
        Sending money through a bank is like mailing a letter: it travels for days and
        passes through many hands before it arrives. Sending with Solana is like texting:
        you tap send, and it arrives before you can put the phone down — usually in about
        a second.
      </p>
      <p>
        Every <GlossaryTerm term="transaction">transaction</GlossaryTerm> — every line
        written into the shared notebook — is checked and recorded in moments, at any
        hour, on any day. There is no closing time, and no "please allow three business
        days."
      </p>
    </section>

    <section>
      <h2>Fractions of a penny, not dollars</h2>
      <p>
        Banks charge for the trouble of moving money — a wire transfer often costs $25 or
        more, and the bill grows with the amount. Solana's
        <GlossaryTerm term="fee">fee</GlossaryTerm> for the same job is less than a penny,
        and it stays that small whether you send $10 or $10,000.
      </p>
      <p>Try the slider below and compare for yourself.</p>
    </section>

    <section>
      <h2>Running day and night for years</h2>
      <p>
        Solana has been running day and night for years, kept going by hundreds of
        independent validators around the world. No holidays, no maintenance
        windows, no head office that can pull the plug — the live numbers on this page
        are being produced right now, while you read this.
      </p>
      <p>
        One honest note: the price of SOL itself — the coin this network runs on — goes
        up and down, sometimes sharply. Speed and low fees are steady; prices are not.
        That is why the coming lessons have you practice with small amounts first.
      </p>
    </section>

    <template #sim>
      <InteractiveFigure @replay="statsKey += 1">
        <LiveNetworkStats :key="statsKey" />
        <template #caption>
          Fetched live from Solana's main network the moment you opened this page — press
          Replay to ask again.
        </template>
      </InteractiveFigure>
      <FeeComparisonSlider />
    </template>
  </LessonShell>
</template>
