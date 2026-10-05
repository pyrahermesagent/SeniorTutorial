// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  MESH_NODE_COUNT,
  centralDown,
  createNetwork,
  meshAliveCount,
  meshRunning,
  toggleCentralServer,
  toggleNode,
} from '../../utils/network'

describe('node network', () => {
  it('starts with the central server and all eight mesh nodes running', () => {
    const network = createNetwork()
    expect(network.centralServerOn).toBe(true)
    expect(network.meshNodesOn).toHaveLength(MESH_NODE_COUNT)
    expect(MESH_NODE_COUNT).toBe(8)
    expect(network.meshNodesOn.every(Boolean)).toBe(true)
    expect(centralDown(network)).toBe(false)
    expect(meshRunning(network)).toBe(true)
    expect(meshAliveCount(network)).toBe(8)
  })

  it('goes down the moment the single central server is unplugged', () => {
    let network = createNetwork()
    network = toggleCentralServer(network)
    expect(centralDown(network)).toBe(true)

    // plugging it back in restores the system
    network = toggleCentralServer(network)
    expect(centralDown(network)).toBe(false)
  })

  it('keeps the mesh running while any one node is still on', () => {
    let network = createNetwork()
    for (const index of [0, 1, 2, 3, 4, 5, 6]) {
      network = toggleNode(network, index)
    }
    expect(meshAliveCount(network)).toBe(1)
    expect(meshRunning(network)).toBe(true)
  })

  it('goes down only when the last mesh node is unplugged', () => {
    let network = createNetwork()
    for (let index = 0; index < MESH_NODE_COUNT; index += 1) {
      network = toggleNode(network, index)
    }
    expect(meshAliveCount(network)).toBe(0)
    expect(meshRunning(network)).toBe(false)
  })

  it('restores a mesh node when it is plugged back in', () => {
    let network = createNetwork()
    network = toggleNode(network, 3)
    network = toggleNode(network, 5)
    expect(meshAliveCount(network)).toBe(6)

    network = toggleNode(network, 3)
    expect(meshAliveCount(network)).toBe(7)
    expect(network.meshNodesOn[3]).toBe(true)
    expect(network.meshNodesOn[5]).toBe(false)
  })

  it('keeps the two panels independent of each other', () => {
    let network = toggleCentralServer(createNetwork())
    expect(centralDown(network)).toBe(true)
    expect(meshRunning(network)).toBe(true)
    expect(meshAliveCount(network)).toBe(8)

    for (let index = 0; index < MESH_NODE_COUNT; index += 1) {
      network = toggleNode(network, index)
    }
    expect(meshRunning(network)).toBe(false)
    expect(centralDown(network)).toBe(true)

    network = toggleCentralServer(network)
    expect(centralDown(network)).toBe(false)
    expect(meshRunning(network)).toBe(false)
  })

  it('ignores toggles for nodes that do not exist', () => {
    const network = createNetwork()
    expect(toggleNode(network, -1)).toBe(network)
    expect(toggleNode(network, MESH_NODE_COUNT)).toBe(network)
  })

  it('never mutates the previous state', () => {
    const network = createNetwork()
    const toggled = toggleNode(network, 0)
    expect(network.meshNodesOn[0]).toBe(true)
    expect(toggled.meshNodesOn[0]).toBe(false)
  })
})
