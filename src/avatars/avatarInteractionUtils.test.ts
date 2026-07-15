import { describe, expect, it } from '@jest/globals';
import {
    createAvatarDefinitionKey,
    createAvatarInteractionRuntimeState,
    resolveAvatarPointerTarget,
    stepAvatarInteractionRuntimeState,
} from './avatarInteractionUtils';

describe('createAvatarDefinitionKey', () => {
    it('ignores object identity and relies on normalized avatar fields', () => {
        const firstKey = createAvatarDefinitionKey({
            agentName: '  Assistant  ',
            agentHash: 'hash-1',
            colors: ['#ff3366', ''],
        });
        const secondKey = createAvatarDefinitionKey({
            agentName: 'Assistant',
            agentHash: 'hash-1',
            colors: ['#ff3366'],
        });

        expect(firstKey).toBe(secondKey);
    });
});

describe('resolveAvatarPointerTarget', () => {
    it('clamps far-away pointers into the supported gaze range', () => {
        const pointerTarget = resolveAvatarPointerTarget(
            {
                left: 0,
                top: 0,
                width: 100,
                height: 100,
            },
            {
                clientX: 250,
                clientY: 50,
                isPointerActive: true,
                pointerType: 'mouse',
            },
        );

        expect(pointerTarget.gazeX).toBeGreaterThan(0.7);
        expect(pointerTarget.gazeX).toBeLessThanOrEqual(0.78);
        expect(pointerTarget.gazeY).toBe(0);
        expect(pointerTarget.intensity).toBe(1);
        expect(pointerTarget.pointerType).toBe('mouse');
    });
});

describe('stepAvatarInteractionRuntimeState', () => {
    it('smoothly approaches and then eases away from the pointer target', () => {
        const runtimeState = createAvatarInteractionRuntimeState();
        const activePointerTarget = resolveAvatarPointerTarget(
            {
                left: 0,
                top: 0,
                width: 100,
                height: 100,
            },
            {
                clientX: 100,
                clientY: 50,
                isPointerActive: true,
                pointerType: 'mouse',
            },
        );

        const firstActiveFrame = stepAvatarInteractionRuntimeState(runtimeState, activePointerTarget, 16);
        const secondActiveFrame = stepAvatarInteractionRuntimeState(firstActiveFrame, activePointerTarget, 32);
        const idleFrame = stepAvatarInteractionRuntimeState(
            secondActiveFrame,
            {
                gazeX: 0,
                gazeY: 0,
                bodyOffsetX: 0,
                bodyOffsetY: 0,
                intensity: 0,
                isPointerActive: false,
                pointerType: 'idle',
            },
            132,
        );

        expect(firstActiveFrame.gazeX).toBeGreaterThan(0);
        expect(secondActiveFrame.gazeX).toBeGreaterThan(firstActiveFrame.gazeX);
        expect(secondActiveFrame.intensity).toBeGreaterThan(firstActiveFrame.intensity);
        expect(idleFrame.gazeX).toBeLessThan(secondActiveFrame.gazeX);
        expect(idleFrame.intensity).toBeLessThan(secondActiveFrame.intensity);
        expect(idleFrame.pointerType).toBe('idle');
    });
});
