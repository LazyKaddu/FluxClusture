import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SwarmClient } from '../src/services/SwarmClient.js';

describe('Worker and Master Render Settings mapping regression (Issue #3)', () => {
    const testSettings = {
        ownerId: 'socket_master_xyz_987',
        glbHash: 'QmTestHash1234567890abcdef',
        width: 1920,
        height: 1080,
        noiseThreshold: 0.17,
        samples: 777,
        animationIndex: 4,
        fps: 29
    };

    it('setRenderSetting maps object-based parameters correctly to internal state', () => {
        const client = new SwarmClient();

        client.setRenderSetting(testSettings);

        assert.equal(client.ownerId, testSettings.ownerId, 'ownerId must match');
        assert.equal(client.glbHash, testSettings.glbHash, 'glbHash must match');
        assert.equal(client.width, 1920, 'width must be 1920 (not swapped with height)');
        assert.equal(client.height, 1080, 'height must be 1080 (not swapped with width)');
        assert.notEqual(client.width, client.height, 'width and height must not be equal in this test');
        assert.equal(client.noiseThreshold, 0.17, 'noiseThreshold must be 0.17 (not swapped with samples)');
        assert.equal(client.noise, 0.17, 'noise must be 0.17 for backwards compatibility');
        assert.equal(client.samples, 777, 'samples must be 777 (not swapped with noiseThreshold)');
        assert.notEqual(client.samples, client.noiseThreshold, 'samples and noiseThreshold must not be equal');
        assert.equal(client.animationIndex, 4, 'animationIndex must be 4');
        assert.equal(client.fps, 29, 'fps must be 29');
    });

    it('worker GET_RENDER_SETTINGS response handler maps server schema without swapping parameters', () => {
        const client = new SwarmClient();

        // Simulate server response from GET_RENDER_SETTINGS containing canonical job_meta schema
        const serverResponse = {
            success: true,
            settings: {
                ownerId: 'master_socket_node_1',
                glbHash: 'QmCanonicalGlbHash321',
                width: 1920,
                height: 1080,
                fps: 29,
                samples: 777,
                noiseThreshold: 0.17,
                animationIndex: 4
            }
        };

        client.socketManager.socket = {
            connected: true,
            connect() {},
            emit(event, ...args) {
                if (event === 'GET_RENDER_SETTINGS') {
                    const callback = args[args.length - 1];
                    if (typeof callback === 'function') {
                        callback(serverResponse);
                    }
                }
            },
            on() {},
            removeAllListeners() {}
        };

        client.joinAsWorker('test-room-regression-3');

        // Verify that the bug where width/height and samples/noiseThreshold were swapped is resolved
        assert.equal(client.ownerId, 'master_socket_node_1');
        assert.equal(client.glbHash, 'QmCanonicalGlbHash321');
        assert.equal(client.width, 1920, 'width must receive width (1920), not height (1080)');
        assert.equal(client.height, 1080, 'height must receive height (1080), not width (1920)');
        assert.equal(client.noiseThreshold, 0.17, 'noiseThreshold must receive noiseThreshold (0.17), not samples (777)');
        assert.equal(client.noise, 0.17, 'noise must receive noiseThreshold (0.17)');
        assert.equal(client.samples, 777, 'samples must receive samples (777), not noiseThreshold (0.17)');
        assert.equal(client.animationIndex, 4, 'animationIndex must receive 4');
        assert.equal(client.fps, 29, 'fps must receive 29');
    });

    it('supports legacy noise field in object contract', () => {
        const client = new SwarmClient();

        client.setRenderSetting({
            ownerId: 'owner_legacy',
            glbHash: 'hash_legacy',
            width: 1280,
            height: 720,
            noise: 0.05,
            samples: 256,
            animationIndex: 1,
            fps: 24
        });

        assert.equal(client.width, 1280);
        assert.equal(client.height, 720);
        assert.equal(client.noiseThreshold, 0.05);
        assert.equal(client.noise, 0.05);
        assert.equal(client.samples, 256);
        assert.equal(client.animationIndex, 1);
        assert.equal(client.fps, 24);
    });

    it('maintains backwards compatibility for positional arguments', () => {
        const client = new SwarmClient();

        client.setRenderSetting(
            'owner_pos',
            'hash_pos',
            1920,
            1080,
            0.15,
            512,
            2,
            60
        );

        assert.equal(client.ownerId, 'owner_pos');
        assert.equal(client.glbHash, 'hash_pos');
        assert.equal(client.width, 1920);
        assert.equal(client.height, 1080);
        assert.equal(client.noiseThreshold, 0.15);
        assert.equal(client.noise, 0.15);
        assert.equal(client.samples, 512);
        assert.equal(client.animationIndex, 2);
        assert.equal(client.fps, 60);
    });

    it('guarantees identical schema contracts between master and worker configurations', () => {
        const masterConfig = {
            width: 1280,
            height: 720,
            noiseThreshold: 0.08,
            samples: 256,
            animationIndex: 1,
            fps: 24
        };

        const masterClient = new SwarmClient();
        masterClient.socketManager.socket = { id: 'master_socket_alpha' };

        masterClient.setRenderSetting({
            ownerId: masterClient.socketManager.id,
            glbHash: 'QmFileHash789',
            width: masterConfig.width,
            height: masterConfig.height,
            noiseThreshold: masterConfig.noiseThreshold,
            samples: masterConfig.samples,
            animationIndex: masterConfig.animationIndex,
            fps: masterConfig.fps
        });

        // Worker receives exactly the serialized metadata stored from the master job
        const workerClient = new SwarmClient();
        const serverStoredJobMeta = {
            ownerId: masterClient.ownerId,
            glbHash: masterClient.glbHash,
            width: masterConfig.width,
            height: masterConfig.height,
            fps: masterConfig.fps,
            samples: masterConfig.samples,
            noiseThreshold: masterConfig.noiseThreshold,
            animationIndex: masterConfig.animationIndex
        };

        const { ownerId, glbHash, width, height, samples, animationIndex, fps } = serverStoredJobMeta;
        const noiseThreshold = serverStoredJobMeta.noiseThreshold !== undefined
            ? serverStoredJobMeta.noiseThreshold
            : serverStoredJobMeta.noise;

        workerClient.setRenderSetting({
            ownerId,
            glbHash,
            width,
            height,
            noiseThreshold,
            samples,
            animationIndex,
            fps
        });

        assert.equal(workerClient.ownerId, masterClient.ownerId);
        assert.equal(workerClient.glbHash, masterClient.glbHash);
        assert.equal(workerClient.width, masterClient.width);
        assert.equal(workerClient.height, masterClient.height);
        assert.equal(workerClient.noiseThreshold, masterClient.noiseThreshold);
        assert.equal(workerClient.noise, masterClient.noise);
        assert.equal(workerClient.samples, masterClient.samples);
        assert.equal(workerClient.animationIndex, masterClient.animationIndex);
        assert.equal(workerClient.fps, masterClient.fps);
    });
});
