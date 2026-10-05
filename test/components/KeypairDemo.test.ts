import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

/*
 * kit's request coalescer subclasses globalThis.AbortController and applies
 * Node's setMaxListeners to the signal, which rejects happy-dom's AbortSignal
 * (not a Node EventTarget). Browser builds of kit skip that code path — this
 * is only a node-resolution-under-happy-dom quirk. vi.hoisted runs before the
 * component (and therefore @solana/kit) is imported, so the shim is in place
 * when kit captures the class. The shim signal is an EventEmitter, which
 * setMaxListeners accepts.
 */
await vi.hoisted(async () => {
  const { EventEmitter } = await import('node:events')

  class EnvAbortSignal extends EventEmitter {
    aborted = false
    addEventListener(type: string, listener: () => void) {
      this.on(type, listener)
    }
    removeEventListener(type: string, listener: () => void) {
      this.off(type, listener)
    }
  }

  class EnvAbortController {
    readonly signal = new EnvAbortSignal()
    abort() {
      this.signal.aborted = true
      this.signal.emit('abort')
    }
  }

  globalThis.AbortController = EnvAbortController as unknown as typeof AbortController
})

import KeypairDemo from '../../components/learn/KeypairDemo.vue'
import { isValidSolanaAddress } from '../../utils/cluster'

async function makePracticeAddress(wrapper: VueWrapper) {
  const button = wrapper
    .findAll('button')
    .find((candidate) => candidate.text().includes('Make me a practice address'))
  expect(button, '"Make me a practice address" button').toBeDefined()
  await button!.trigger('click')
  // kit's WebCrypto key generation resolves on a macrotask that outlives
  // flushPromises' timer — poll until the address is rendered instead.
  await vi.waitFor(() => {
    expect(wrapper.find('.keypair-demo__address').exists()).toBe(true)
  })
}

function shownAddress(wrapper: VueWrapper): string {
  return wrapper.find('.keypair-demo__address').text().trim()
}

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

function stubClipboard(writeText: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  if (originalClipboard) {
    Object.defineProperty(navigator, 'clipboard', originalClipboard)
  } else {
    delete (navigator as unknown as Record<string, unknown>).clipboard
  }
})

describe('KeypairDemo', () => {
  it('makes a practice address that is a real Solana address', async () => {
    const wrapper = mount(KeypairDemo)
    await makePracticeAddress(wrapper)

    const address = shownAddress(wrapper)
    expect(isValidSolanaAddress(address)).toBe(true)
    expect(wrapper.text()).toContain('safe to share')
  })

  it('persists nothing — localStorage stays untouched', async () => {
    const setSpy = vi.spyOn(Storage.prototype, 'setItem')
    const lengthBefore = localStorage.length

    const wrapper = mount(KeypairDemo)
    await makePracticeAddress(wrapper)

    expect(setSpy).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(lengthBefore)
    expect(wrapper.text()).toContain('thrown away the moment you leave this page')
  })

  it('copies the address to the clipboard and shows a big confirmation', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)

    const wrapper = mount(KeypairDemo)
    await makePracticeAddress(wrapper)
    const address = shownAddress(wrapper)

    const copy = wrapper
      .findAll('button')
      .find((candidate) => candidate.text().includes('Copy this address'))
    expect(copy, '"Copy this address" button').toBeDefined()
    await copy!.trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith(address)
    expect(wrapper.text()).toContain('Copied!')
  })

  it('falls back to selecting the address when the clipboard is unavailable', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('not allowed'))
    stubClipboard(writeText)

    const wrapper = mount(KeypairDemo)
    await makePracticeAddress(wrapper)

    const copy = wrapper
      .findAll('button')
      .find((candidate) => candidate.text().includes('Copy this address'))
    await copy!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Copied!')
    expect(wrapper.text()).toContain('copy it by hand')
  })
})
