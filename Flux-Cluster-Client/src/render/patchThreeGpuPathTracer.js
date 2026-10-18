import { PathTracingSceneGenerator } from 'three-gpu-pathtracer';

let isPatched = false;

/**
 * Patches three-gpu-pathtracer (v0.0.24) to resolve a ReferenceError bug in PathTracingSceneGenerator.js line 180:
 * `let needsMaterialIndexUpdate = result.changeType !== NO_CHANGE || this._materialUuids === null || this._materialUuids.length !== length;`
 * When rendering frame 1+ with NO_CHANGE, `this._materialUuids !== null`, causing JavaScript to evaluate the
 * 3rd term where `length` is an undeclared identifier, throwing:
 * `ReferenceError: length is not defined at PathTracingSceneGenerator.generate`.
 *
 * Resetting `this._materialUuids = null` before generating ensures the condition short-circuits on `this._materialUuids === null`,
 * preventing the invalid access while ensuring materials/material indices are refreshed properly for each frame.
 */
export function patchThreeGpuPathTracer() {
    if (isPatched) return;

    // Safety fallback for worker environments where `self.length` is undefined
    if (typeof self !== 'undefined' && self.length === undefined) {
        try {
            self.length = 0;
        } catch {
            // Ignore if self is sealed
        }
    }

    if (typeof PathTracingSceneGenerator !== 'undefined' && PathTracingSceneGenerator.prototype) {
        const originalGenerate = PathTracingSceneGenerator.prototype.generate;
        PathTracingSceneGenerator.prototype.generate = function (...args) {
            this._materialUuids = null;
            return originalGenerate.apply(this, args);
        };
    }

    isPatched = true;
}

// Auto-run on import
patchThreeGpuPathTracer();
