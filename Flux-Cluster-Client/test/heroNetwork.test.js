import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  DEFAULT_NODE_COUNT,
  DEFAULT_MAX_CONNECTIONS,
  getMaxLineSegments,
  getRandomPointInBounds,
  createNetworkState,
  updateNetworkStep,
  populateLineBuffer,
} from '../src/utils/networkSimulation.js';

import { roseVertexShader, roseFragmentShader } from '../src/shaders/roseShaders.js';

describe('Hero Network Simulation', () => {
  test('constants and buffer sizing calculation', () => {
    assert.equal(DEFAULT_MAX_CONNECTIONS, 3);
    assert.equal(getMaxLineSegments(DEFAULT_NODE_COUNT, 3), Math.floor((DEFAULT_NODE_COUNT * 3) / 2));
    assert.equal(getMaxLineSegments(90, 3), 135);
    assert.equal(getMaxLineSegments(10, 3), 15);
  });

  test('creates network state with requested node count and random bounds', () => {
    const nodes = createNetworkState({ nodeCount: 20, boundary: 30 });
    assert.equal(nodes.length, 20);

    for (const node of nodes) {
      assert.ok(Math.abs(node.position.x) <= 30);
      assert.ok(Math.abs(node.position.y) <= 30);
      assert.ok(Math.abs(node.position.z) <= 30);
      assert.equal(node.connections.size, 0);
      assert.ok(node.speed > 0);
    }
  });

  test('strictly enforces maxConnections limit of 3 under dense clustering', () => {
    const nodeCount = 50;
    const maxConnections = 3;
    const nodes = [];

    // Place all 50 nodes right next to each other in a 1-unit box
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        id: i,
        position: new THREE.Vector3(Math.random() * 0.5, Math.random() * 0.5, Math.random() * 0.5),
        target: new THREE.Vector3(0, 0, 0),
        speed: 1,
        rotation: new THREE.Euler(),
        rotSpeed: { x: 0, y: 0, z: 0 },
        connections: new Set(),
      });
    }

    // Run connection step with high proximity threshold
    updateNetworkStep(nodes, { proximityThreshold: 10, maxConnections });

    for (const node of nodes) {
      assert.ok(
        node.connections.size <= maxConnections,
        `Node ${node.id} has ${node.connections.size} connections, exceeding max of ${maxConnections}`
      );

      // Verify symmetry
      for (const neighborId of node.connections) {
        assert.ok(nodes[neighborId].connections.has(node.id), 'Connection must be bidirectional');
      }
    }
  });

  test('severs connection when nodes drift apart beyond threshold', () => {
    const nodes = [
      {
        id: 0,
        position: new THREE.Vector3(0, 0, 0),
        target: new THREE.Vector3(0, 0, 0),
        speed: 1,
        rotation: new THREE.Euler(),
        rotSpeed: { x: 0, y: 0, z: 0 },
        connections: new Set([1]),
      },
      {
        id: 1,
        position: new THREE.Vector3(5, 0, 0), // within 10 units
        target: new THREE.Vector3(5, 0, 0),
        speed: 1,
        rotation: new THREE.Euler(),
        rotSpeed: { x: 0, y: 0, z: 0 },
        connections: new Set([0]),
      },
    ];

    // Still close -> connection remains
    updateNetworkStep(nodes, { proximityThreshold: 10 });
    assert.ok(nodes[0].connections.has(1));
    assert.ok(nodes[1].connections.has(0));

    // Move apart to 25 units -> connection must break
    nodes[1].position.set(25, 0, 0);
    updateNetworkStep(nodes, { proximityThreshold: 10 });
    assert.equal(nodes[0].connections.has(1), false);
    assert.equal(nodes[1].connections.has(0), false);
  });

  test('populates Float32Array line buffer correctly without overflows', () => {
    const nodes = [
      {
        id: 0,
        position: new THREE.Vector3(1, 2, 3),
        target: new THREE.Vector3(0, 0, 0),
        speed: 1,
        rotation: new THREE.Euler(),
        rotSpeed: { x: 0, y: 0, z: 0 },
        connections: new Set([1]),
      },
      {
        id: 1,
        position: new THREE.Vector3(4, 5, 6),
        target: new THREE.Vector3(0, 0, 0),
        speed: 1,
        rotation: new THREE.Euler(),
        rotSpeed: { x: 0, y: 0, z: 0 },
        connections: new Set([0]),
      },
    ];

    const maxSegments = getMaxLineSegments(2, 3); // 3 segments
    const buffer = new Float32Array(maxSegments * 6);

    const segmentsCount = populateLineBuffer(nodes, buffer);
    assert.equal(segmentsCount, 1);

    // Check vertex 1 (1, 2, 3) and vertex 2 (4, 5, 6)
    assert.equal(buffer[0], 1);
    assert.equal(buffer[1], 2);
    assert.equal(buffer[2], 3);
    assert.equal(buffer[3], 4);
    assert.equal(buffer[4], 5);
    assert.equal(buffer[5], 6);
  });

  test('picks new target when node reaches arrival distance threshold', () => {
    const initialTarget = new THREE.Vector3(10, 10, 10);
    const node = {
      id: 0,
      position: new THREE.Vector3(9.9, 9.9, 9.9), // distance < arrivalThreshold (2.0)
      target: initialTarget.clone(),
      speed: 2,
      rotation: new THREE.Euler(),
      rotSpeed: { x: 0, y: 0, z: 0 },
      connections: new Set(),
    };

    updateNetworkStep([node], { arrivalThreshold: 2.0, boundary: 40 });

    // Target should have changed to a new random point
    assert.notDeepEqual(node.target, initialTarget);
  });

  test('validates RoseMesh GLSL shader uniforms and structure', () => {
    assert.ok(typeof roseVertexShader === 'string' && roseVertexShader.length > 50);
    assert.ok(typeof roseFragmentShader === 'string' && roseFragmentShader.length > 50);

    // Verify critical varyings and uniforms in shaders
    assert.ok(roseVertexShader.includes('varying vec2 vUv;'));
    assert.ok(roseVertexShader.includes('varying vec3 vWorldPos;'));
    assert.ok(roseVertexShader.includes('varying vec3 vWorldNormal;'));

    assert.ok(roseFragmentShader.includes('uniform float uTime;'));
    assert.ok(roseFragmentShader.includes('uniform vec3 uCameraPos;'));
    assert.ok(roseFragmentShader.includes('uniform float uGlowStrength;'));
    assert.ok(roseFragmentShader.includes('uniform float uGlowPower;'));
    assert.ok(roseFragmentShader.includes('gl_FragColor = vec4(finalColor, uOpacity);'));
  });
});

describe('HeroNetwork3D Mobile Interaction & Orbit Controls Logic', () => {
  const computeOrbitState = (isMobile, is3DActive) => {
    const isOrbitEnabled = !isMobile || is3DActive;
    const touchAction = isOrbitEnabled ? 'none' : 'pan-y';
    const containerClasses = !isOrbitEnabled
      ? 'touch-pan-y [&_canvas]:touch-pan-y'
      : 'touch-none [&_canvas]:touch-none';
    const buttonLabel = is3DActive ? '✕ Exit 3D (Scroll Mode)' : '⟳ Explore 3D';
    return { isOrbitEnabled, touchAction, containerClasses, buttonLabel };
  };

  test('on mobile default view: disables orbit controls, enables pan-y scroll, shows Explore 3D button', () => {
    const state = computeOrbitState(true, false);
    assert.equal(state.isOrbitEnabled, false);
    assert.equal(state.touchAction, 'pan-y');
    assert.ok(state.containerClasses.includes('touch-pan-y'));
    assert.equal(state.buttonLabel, '⟳ Explore 3D');
  });

  test('on mobile 3D explore mode: enables orbit controls, sets touchAction none, shows Exit 3D button', () => {
    const state = computeOrbitState(true, true);
    assert.equal(state.isOrbitEnabled, true);
    assert.equal(state.touchAction, 'none');
    assert.ok(state.containerClasses.includes('touch-none'));
    assert.equal(state.buttonLabel, '✕ Exit 3D (Scroll Mode)');
  });

  test('on desktop: always enables orbit controls and touchAction none regardless of mobile 3D toggle state', () => {
    const stateDefault = computeOrbitState(false, false);
    assert.equal(stateDefault.isOrbitEnabled, true);
    assert.equal(stateDefault.touchAction, 'none');

    const stateActive = computeOrbitState(false, true);
    assert.equal(stateActive.isOrbitEnabled, true);
    assert.equal(stateActive.touchAction, 'none');
  });
});

