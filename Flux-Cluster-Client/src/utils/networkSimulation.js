import * as THREE from 'three';

export const DEFAULT_NODE_COUNT = 90;
export const DEFAULT_MAX_CONNECTIONS = 3;
export const DEFAULT_BOUNDARY = 45;
export const DEFAULT_PROXIMITY_THRESHOLD = 20;
export const DEFAULT_NODE_SPEED = 6.0;

/**
 * Calculates max possible unique connections in the graph:
 * Math.floor((nodeCount * maxConnections) / 2)
 */
export function getMaxLineSegments(nodeCount, maxConnections = DEFAULT_MAX_CONNECTIONS) {
  return Math.floor((nodeCount * maxConnections) / 2);
}

/**
 * Generates a random point within [-boundary, boundary] on X, Y, Z
 */
export function getRandomPointInBounds(boundary = DEFAULT_BOUNDARY) {
  return new THREE.Vector3(
    (Math.random() - 0.5) * 2 * boundary,
    (Math.random() - 0.5) * 2 * boundary,
    (Math.random() - 0.5) * 2 * boundary
  );
}

/**
 * Creates the initial network simulation state.
 */
export function createNetworkState({
  nodeCount = DEFAULT_NODE_COUNT,
  boundary = DEFAULT_BOUNDARY,
  speed = DEFAULT_NODE_SPEED,
} = {}) {
  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: i,
      position: getRandomPointInBounds(boundary),
      target: getRandomPointInBounds(boundary),
      speed: speed * (0.8 + Math.random() * 0.4),
      rotation: new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      ),
      rotSpeed: {
        x: (Math.random() - 0.5) * 1.5,
        y: (Math.random() - 0.5) * 1.5,
        z: (Math.random() - 0.5) * 1.5,
      },
      connections: new Set(),
    });
  }
  return nodes;
}

/**
 * Updates positions, targets, rotations, and connections for all nodes in the network.
 */
export function updateNetworkStep(nodes, {
  boundary = DEFAULT_BOUNDARY,
  proximityThreshold = DEFAULT_PROXIMITY_THRESHOLD,
  maxConnections = DEFAULT_MAX_CONNECTIONS,
  deltaTime = 0.016,
  arrivalThreshold = 2.0,
} = {}) {
  const nodeCount = nodes.length;

  // 1. Move nodes toward targets & rotate cubes
  for (let i = 0; i < nodeCount; i++) {
    const node = nodes[i];
    const toTarget = new THREE.Vector3().subVectors(node.target, node.position);
    const dist = toTarget.length();

    if (dist < arrivalThreshold) {
      // Reached destination, pick a new random target within bounds
      node.target = getRandomPointInBounds(boundary);
    } else {
      toTarget.normalize();
      const step = Math.min(dist, node.speed * deltaTime);
      node.position.addScaledVector(toTarget, step);
    }

    // Autonomous tumbling rotation
    node.rotation.x += node.rotSpeed.x * deltaTime;
    node.rotation.y += node.rotSpeed.y * deltaTime;
    node.rotation.z += node.rotSpeed.z * deltaTime;
  }

  // 2. Sever existing connections that drift beyond threshold
  // (Adding a slight 5% hysteresis prevents rapid oscillation at the boundary)
  const breakThreshold = proximityThreshold * 1.05;
  for (let i = 0; i < nodeCount; i++) {
    const nodeA = nodes[i];
    for (const neighborId of Array.from(nodeA.connections)) {
      if (i < neighborId) {
        const nodeB = nodes[neighborId];
        const dist = nodeA.position.distanceTo(nodeB.position);
        if (dist > breakThreshold) {
          nodeA.connections.delete(neighborId);
          nodeB.connections.delete(i);
        }
      }
    }
  }

  // 3. Establish new connections for nearby nodes with capacity < maxConnections
  for (let i = 0; i < nodeCount; i++) {
    const nodeA = nodes[i];
    if (nodeA.connections.size >= maxConnections) continue;

    for (let j = i + 1; j < nodeCount; j++) {
      if (nodeA.connections.size >= maxConnections) break;
      const nodeB = nodes[j];
      if (nodeB.connections.size >= maxConnections) continue;
      if (nodeA.connections.has(j)) continue;

      const dist = nodeA.position.distanceTo(nodeB.position);
      if (dist <= proximityThreshold) {
        nodeA.connections.add(j);
        nodeB.connections.add(i);
      }
    }
  }
}

/**
 * Fills a pre-allocated Float32Array with current coordinates of active connection line segments.
 * Returns the number of active line segments written.
 */
export function populateLineBuffer(nodes, positionArray) {
  let ptr = 0;
  const nodeCount = nodes.length;

  for (let i = 0; i < nodeCount; i++) {
    const posA = nodes[i].position;
    for (const neighborId of nodes[i].connections) {
      if (i < neighborId) {
        const posB = nodes[neighborId].position;
        // Vertex 1 (X, Y, Z)
        positionArray[ptr++] = posA.x;
        positionArray[ptr++] = posA.y;
        positionArray[ptr++] = posA.z;
        // Vertex 2 (X, Y, Z)
        positionArray[ptr++] = posB.x;
        positionArray[ptr++] = posB.y;
        positionArray[ptr++] = posB.z;
      }
    }
  }

  return ptr / 6; // Active segments count
}
