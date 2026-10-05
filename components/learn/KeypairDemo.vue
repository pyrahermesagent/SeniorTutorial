<script setup lang="ts">
import { ref } from 'vue'
import { generateKeyPairSigner } from '@solana/kit'
import AppButton from '../AppButton.vue'
import AppIcon from '../AppIcon.vue'
import AppNotice from '../AppNotice.vue'

/*
 * Practice keypair, made on this device and kept only in component state.
 * Nothing is written to storage and nothing is sent anywhere — the secret
 * part is dropped the moment the address is shown, and the whole pair is
 * forgotten when you leave this page.
 */
const address = ref<string | null>(null)
const busy = ref(false)
const copied = ref(false)
const copyUnavailable = ref(false)
const addressEl = ref<HTMLElement | null>(null)

async function makePracticeAddress() {
  busy.value = true
  copied.value = false
  copyUnavailable.value = false
  try {
    const signer = await generateKeyPairSigner()
    address.value = signer.address
  } finally {
    busy.value = false
  }
}

async function copyAddress() {
  if (!address.value) return
  copied.value = false
  copyUnavailable.value = false
  try {
    await navigator.clipboard.writeText(address.value)
    copied.value = true
  } catch {
    copyUnavailable.value = true
    selectAddressText()
  }
}

function selectAddressText() {
  const el = addressEl.value
  if (!el) return
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(el)
  selection.removeAllRanges()
  selection.addRange(range)
}
</script>

<template>
  <div class="keypair-demo">
    <p class="keypair-demo__hint">
      Tap the button and this page makes a brand-new practice wallet pair, right here on
      your device. Nothing is saved and nothing is sent anywhere.
    </p>

    <AppButton :loading="busy" size="lg" class="keypair-demo__make" @click="makePracticeAddress">
      <AppIcon v-if="!busy" name="key-round" :size="24" />
      {{ address ? 'Make another practice address' : 'Make me a practice address' }}
    </AppButton>

    <div v-if="address" class="keypair-demo__result">
      <p class="keypair-demo__label">
        Your public address — safe to share, like your mailbox address:
      </p>
      <code ref="addressEl" class="keypair-demo__address">{{ address }}</code>

      <AppButton variant="secondary" size="lg" class="keypair-demo__copy" @click="copyAddress">
        <AppIcon name="copy" :size="24" />
        Copy this address
      </AppButton>

      <AppNotice v-if="copied" kind="success" class="keypair-demo__notice">
        <span class="keypair-demo__copied">Copied!</span> You just shared your address the way
        you would hand someone your mailbox address — that is all anyone needs to send you
        something.
      </AppNotice>
      <AppNotice v-if="copyUnavailable" kind="info" class="keypair-demo__notice">
        Automatic copying is not available here. The address above is selected — copy it by
        hand (Ctrl+C, or tap and hold, then Copy).
      </AppNotice>
    </div>

    <p class="keypair-demo__secret-note">
      Every address also has a secret part. In a real wallet app the secret never leaves the
      app — and here, it's thrown away the moment you leave this page.
    </p>
  </div>
</template>

<style scoped>
.keypair-demo {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
  width: 100%;
}

.keypair-demo__hint {
  margin: 0;
  font-size: var(--text-base);
}

.keypair-demo__result {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  width: 100%;
}

.keypair-demo__label {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 700;
}

.keypair-demo__address {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-surface);
  border: 2px solid var(--color-ink);
  border-radius: 12px;
  font-size: var(--text-lg);
  font-weight: 700;
  word-break: break-all;
  user-select: all;
}

.keypair-demo__copied {
  font-size: var(--text-lg);
  font-weight: 700;
}

.keypair-demo__secret-note {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-warning-bg);
  border: 2px solid var(--color-accent);
  border-radius: 12px;
  font-size: var(--text-base);
}
</style>
