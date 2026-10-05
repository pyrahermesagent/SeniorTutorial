import { describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import NodeNetworkSim from '../../components/learn/NodeNetworkSim.vue'

function mountSim() {
  return mount(NodeNetworkSim)
}

function centralStatus(wrapper: VueWrapper) {
  return wrapper.find('.network-panel--central .network-panel__status')
}

function meshStatus(wrapper: VueWrapper) {
  return wrapper.find('.network-panel--mesh .network-panel__status')
}

describe('NodeNetworkSim', () => {
  it('renders one central server with four clients and a mesh of eight nodes', () => {
    const wrapper = mountSim()
    const server = wrapper.find('.central-tree__server')
    expect(server.exists()).toBe(true)
    expect(server.attributes('type')).toBe('button')
    expect(server.attributes('aria-pressed')).toBe('false')
    expect(wrapper.findAll('.central-tree__client')).toHaveLength(4)

    const nodes = wrapper.findAll('.mesh__node')
    expect(nodes).toHaveLength(8)
    for (const node of nodes) {
      expect(node.attributes('type')).toBe('button')
      expect(node.attributes('aria-pressed')).toBe('false')
    }
  })

  it('starts with both systems running', () => {
    const wrapper = mountSim()
    expect(centralStatus(wrapper).text()).not.toContain('System down')
    expect(meshStatus(wrapper).text()).toContain('Still running — 8 of 8 computers working')
    expect(wrapper.find('.network-sim__solana').text()).toContain(
      'Solana has hundreds of independent computers',
    )
  })

  it('reports "System down — everyone is cut off" the moment the central server is unplugged', async () => {
    const wrapper = mountSim()
    await wrapper.find('.central-tree__server').trigger('click')

    expect(centralStatus(wrapper).text()).toContain('System down — everyone is cut off')
    expect(wrapper.find('.central-tree__server').attributes('aria-pressed')).toBe('true')
    for (const client of wrapper.findAll('.central-tree__client')) {
      expect(client.classes()).toContain('central-tree__client--cut')
    }

    // the mesh is untouched
    expect(meshStatus(wrapper).text()).toContain('Still running — 8 of 8 computers working')
  })

  it('restores the central system when the server is plugged back in', async () => {
    const wrapper = mountSim()
    const server = wrapper.find('.central-tree__server')
    await server.trigger('click')
    await server.trigger('click')

    expect(centralStatus(wrapper).text()).not.toContain('System down')
    expect(server.attributes('aria-pressed')).toBe('false')
    expect(wrapper.find('.central-tree__client--cut').exists()).toBe(false)
  })

  it('keeps the mesh running until all eight nodes are unplugged', async () => {
    const wrapper = mountSim()
    const nodes = wrapper.findAll('.mesh__node')

    for (const index of [0, 1, 2, 3, 4, 5, 6]) {
      await nodes[index]!.trigger('click')
      expect(meshStatus(wrapper).text()).toContain(
        `Still running — ${7 - index} of 8 computers working`,
      )
    }

    await nodes[7]!.trigger('click')
    expect(meshStatus(wrapper).text()).toContain(
      'All computers are off — the network is down',
    )

    // the central side is untouched
    expect(centralStatus(wrapper).text()).not.toContain('System down')
  })

  it('marks unplugged nodes visibly and lets each be restored on its own', async () => {
    const wrapper = mountSim()
    const nodes = wrapper.findAll('.mesh__node')

    await nodes[2]!.trigger('click')
    expect(nodes[2]!.attributes('aria-pressed')).toBe('true')
    expect(nodes[2]!.classes()).toContain('mesh__node--off')
    expect(nodes[2]!.text()).toContain('off')

    await nodes[2]!.trigger('click')
    expect(nodes[2]!.attributes('aria-pressed')).toBe('false')
    expect(nodes[2]!.classes()).not.toContain('mesh__node--off')
    expect(meshStatus(wrapper).text()).toContain('Still running — 8 of 8 computers working')
  })

  it('recovers the mesh as soon as one node is plugged back in', async () => {
    const wrapper = mountSim()
    const nodes = wrapper.findAll('.mesh__node')
    for (const node of nodes) {
      await node.trigger('click')
    }
    expect(meshStatus(wrapper).text()).toContain(
      'All computers are off — the network is down',
    )

    await nodes[4]!.trigger('click')
    expect(meshStatus(wrapper).text()).toContain('Still running — 1 of 8 computers working')
  })
})
