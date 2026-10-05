/*
 * Network state for the lesson-3 "who's in charge" simulation.
 * Pure functions over immutable state — the Vue component is a thin wrapper
 * and tests drive these directly.
 *
 * Two independent systems: one central server (left panel) and a mesh of
 * eight peer nodes (right panel). `true` means plugged in and running.
 */

export interface NetworkState {
  centralServerOn: boolean
  meshNodesOn: boolean[]
}

export const CLIENT_COUNT = 4
export const MESH_NODE_COUNT = 8

export function createNetwork(): NetworkState {
  return {
    centralServerOn: true,
    meshNodesOn: Array.from({ length: MESH_NODE_COUNT }, () => true),
  }
}

/** Toggles the single central server off or back on. */
export function toggleCentralServer(state: NetworkState): NetworkState {
  return { ...state, centralServerOn: !state.centralServerOn }
}

/** Toggles one mesh node off or back on; unknown indexes leave the state untouched. */
export function toggleNode(state: NetworkState, index: number): NetworkState {
  if (index < 0 || index >= state.meshNodesOn.length) {
    return state
  }
  return {
    ...state,
    meshNodesOn: state.meshNodesOn.map((on, nodeIndex) =>
      nodeIndex === index ? !on : on,
    ),
  }
}

/** The left panel dies the moment its one server is unplugged. */
export function centralDown(state: NetworkState): boolean {
  return !state.centralServerOn
}

export function meshAliveCount(state: NetworkState): number {
  return state.meshNodesOn.filter(Boolean).length
}

/** The right panel keeps running while even one node is still on. */
export function meshRunning(state: NetworkState): boolean {
  return meshAliveCount(state) > 0
}
