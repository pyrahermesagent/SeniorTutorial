<script setup lang="ts">
import { computed, ref } from 'vue'
import { bankFeeEstimate, describeSolanaFee, formatUsd } from '../../utils/fees'

const amount = ref(500)

const solanaFee = describeSolanaFee()
const formattedAmount = computed(() => formatUsd(amount.value))
const bankFee = computed(() => formatUsd(bankFeeEstimate(amount.value)))
</script>

<template>
  <div class="fee-comparison">
    <label for="fee-amount" class="fee-comparison__label">
      If you send
      <span class="fee-comparison__amount">{{ formattedAmount }}</span>
      …
    </label>
    <input
      id="fee-amount"
      v-model.number="amount"
      type="range"
      min="1"
      max="10000"
      step="1"
      class="fee-comparison__slider"
      :aria-valuetext="formattedAmount"
    />
    <div class="fee-comparison__scale" aria-hidden="true">
      <span>$1</span>
      <span>$10,000</span>
    </div>

    <dl class="fee-comparison__rows">
      <div class="fee-comparison__row">
        <dt>On Solana, the fee is</dt>
        <dd class="fee-comparison__fee fee-comparison__fee--solana">{{ solanaFee }}</dd>
      </div>
      <div class="fee-comparison__row">
        <dt>A typical bank or wire transfer charges about</dt>
        <dd class="fee-comparison__fee fee-comparison__fee--bank">{{ bankFee }}</dd>
      </div>
    </dl>

    <p class="fee-comparison__readout" aria-live="polite">
      Sending {{ formattedAmount }}: the Solana fee is {{ solanaFee }}; a typical bank fee
      is about {{ bankFee }}.
    </p>
    <p class="fee-comparison__fine-print">
      The bank number is a typical estimate — your own bank may charge more or less. The
      Solana fee really is that small, whatever the amount.
    </p>
  </div>
</template>

<style scoped>
.fee-comparison {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background-color: var(--color-surface);
  border: 2px solid color-mix(in srgb, var(--color-ink) 12%, transparent);
  border-radius: 12px;
}

.fee-comparison__label {
  font-size: var(--text-lg);
  font-weight: 700;
}

.fee-comparison__amount {
  color: var(--color-secondary);
}

.fee-comparison__slider {
  width: 100%;
  min-height: 2.8rem; /* 56px touch target */
  accent-color: var(--color-secondary);
  cursor: pointer;
}

.fee-comparison__scale {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-base);
  color: var(--color-secondary);
}

.fee-comparison__rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
}

.fee-comparison__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-3);
  font-size: var(--text-lg);
}

.fee-comparison__row dt {
  margin: 0;
}

.fee-comparison__fee {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: 700;
}

.fee-comparison__fee--solana {
  color: var(--color-success);
}

.fee-comparison__readout {
  margin: 0;
  padding-top: var(--space-2);
  border-top: 2px solid color-mix(in srgb, var(--color-ink) 12%, transparent);
  font-size: var(--text-base);
}

.fee-comparison__fine-print {
  margin: 0;
  font-size: var(--text-base);
  color: var(--color-secondary);
}
</style>
