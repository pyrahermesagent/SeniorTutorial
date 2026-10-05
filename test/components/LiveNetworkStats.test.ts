import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

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

import LiveNetworkStats from '../../components/learn/LiveNetworkStats.vue'

// One 60-second performance sample: 180,000 transactions over 150 slots →
// 3,000 TPS and 0.4 seconds per slot ("page").
function stubFetchWithSample() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: unknown, init?: { body?: unknown }) => {
      const request = JSON.parse(String(init?.body))
      return {
        ok: true,
        text: async () =>
          JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            result: [
              {
                numNonVoteTransactions: 150000,
                numSlots: 150,
                numTransactions: 180000,
                samplePeriodSecs: 60,
                slot: 250000000,
              },
            ],
          }),
      } as Response
    }),
  )
}

function stubFetchFailing() {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network busy')))
}

describe('LiveNetworkStats', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows a loading state before the network answers', () => {
    stubFetchWithSample()
    const wrapper = mount(LiveNetworkStats)
    expect(wrapper.text()).toContain('live')
  })

  it('shows the live TPS and seconds-per-page once the RPC answers', async () => {
    stubFetchWithSample()
    const wrapper = mount(LiveNetworkStats)
    await flushPromises()
    expect(wrapper.text()).toContain('about 3,000 transactions every second')
    expect(wrapper.text()).toContain('about every 0.4 seconds')
  })

  it('shows a friendly notice with a retry button when the fetch fails', async () => {
    stubFetchFailing()
    const wrapper = mount(LiveNetworkStats)
    await flushPromises()
    expect(wrapper.text()).toContain("couldn't load the live numbers")
    const retry = wrapper
      .findAll('button')
      .find((candidate) => candidate.text().includes('Try again'))
    expect(retry, '"Try again" button').toBeDefined()
  })

  it('loads the numbers when Try again succeeds after a failure', async () => {
    stubFetchFailing()
    const wrapper = mount(LiveNetworkStats)
    await flushPromises()
    expect(wrapper.text()).toContain("couldn't load the live numbers")

    stubFetchWithSample()
    const retry = wrapper.findAll('button').find((c) => c.text().includes('Try again'))!
    await retry.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('about 3,000 transactions every second')
  })
})
