import { normalizeAvatarDefinition } from './avatarRenderingUtils';
import type { AvatarDefinition } from './types/AvatarDefinition';
import type { AvatarInteractionState, AvatarPointerType } from './types/AvatarVisualDefinition';

// Note: [💞] Ignore a discrepancy between file name and entity name

/**
 * Maximum normalized eye travel used when the viewer moves across the viewport.
 *
 * @private utility of the avatar rendering system
 */
const MAX_GAZE_OFFSET = 0.78;

/**
 * Maximum normalized body lean used for subtle mantle response.
 *
 * @private utility of the avatar rendering system
 */
const MAX_BODY_OFFSET = 0.28;

/**
 * Smoothing window used while a live pointer or touch target is active.
 *
 * @private utility of the avatar rendering system
 */
const ACTIVE_INTERACTION_SMOOTHING_MS = 90;

/**
 * Slower smoothing window used when easing the avatar back to its idle state.
 *
 * @private utility of the avatar rendering system
 */
const IDLE_INTERACTION_SMOOTHING_MS = 230;

/**
 * Maximum frame delta allowed when smoothing interaction after tab stalls.
 *
 * @private utility of the avatar rendering system
 */
const MAX_INTERACTION_FRAME_DELTA_MS = 64;

/**
 * Extra damping used for the slower body lean compared with the quicker eye motion.
 *
 * @private utility of the avatar rendering system
 */
const BODY_INTERACTION_SMOOTHING_MULTIPLIER = 1.2;

/**
 * Internal interaction state kept between animation frames.
 *
 * @private utility of the avatar rendering system
 */
export type AvatarInteractionRuntimeState = AvatarInteractionState & {
    readonly lastFrameMs: number | null;
};

/**
 * Raw shared pointer sample used to derive one avatar-local gaze target.
 *
 * @private utility of the avatar rendering system
 */
export type AvatarPointerSnapshot = {
    readonly clientX: number;
    readonly clientY: number;
    readonly isPointerActive: boolean;
    readonly pointerType: Exclude<AvatarPointerType, 'idle'>;
};

/**
 * Avatar-local pointer target resolved from viewport coordinates.
 *
 * @private utility of the avatar rendering system
 */
export type AvatarPointerTarget = {
    readonly gazeX: number;
    readonly gazeY: number;
    readonly bodyOffsetX: number;
    readonly bodyOffsetY: number;
    readonly intensity: number;
    readonly isPointerActive: boolean;
    readonly pointerType: AvatarPointerType;
};

/**
 * Stable zeroed interaction state used by non-interactive render paths.
 *
 * @private utility of the avatar rendering system
 */
const IDLE_AVATAR_INTERACTION_STATE: AvatarInteractionState = {
    gazeX: 0,
    gazeY: 0,
    bodyOffsetX: 0,
    bodyOffsetY: 0,
    intensity: 0,
    isPointerActive: false,
    pointerType: 'idle',
};

/**
 * Creates one stable cache key from the meaningful avatar-definition fields.
 *
 * @param avatarDefinition Normalized or raw avatar definition.
 * @returns Stable cache key that ignores object identity churn.
 *
 * @private utility of the avatar rendering system
 */
export function createAvatarDefinitionKey(avatarDefinition: AvatarDefinition): string {
    const normalizedAvatarDefinition = normalizeAvatarDefinition(avatarDefinition);

    return [
        normalizedAvatarDefinition.agentName,
        normalizedAvatarDefinition.agentHash,
        normalizedAvatarDefinition.colors.join('|'),
    ].join('::');
}

/**
 * Returns the neutral interaction state used by static/server-side renders.
 *
 * @returns Zeroed interaction state.
 *
 * @private utility of the avatar rendering system
 */
export function createIdleAvatarInteractionState(): AvatarInteractionState {
    return IDLE_AVATAR_INTERACTION_STATE;
}

/**
 * Creates a fresh runtime state for the interactive animation loop.
 *
 * @returns Runtime interaction state with neutral values.
 *
 * @private utility of the avatar rendering system
 */
export function createAvatarInteractionRuntimeState(): AvatarInteractionRuntimeState {
    return {
        ...IDLE_AVATAR_INTERACTION_STATE,
        lastFrameMs: null,
    };
}

/**
 * Converts the shared viewport pointer state into one avatar-local gaze target.
 *
 * @param avatarBounds Canvas bounds in viewport coordinates.
 * @param pointerSnapshot Latest shared pointer sample.
 * @returns Local target used to steer eyes and subtle body lean.
 *
 * @private utility of the avatar rendering system
 */
export function resolveAvatarPointerTarget(
    avatarBounds: Pick<DOMRectReadOnly, 'left' | 'top' | 'width' | 'height'>,
    pointerSnapshot: AvatarPointerSnapshot | null,
): AvatarPointerTarget {
    if (!pointerSnapshot || !pointerSnapshot.isPointerActive) {
        return {
            ...IDLE_AVATAR_INTERACTION_STATE,
        };
    }

    const centerX = avatarBounds.left + avatarBounds.width / 2;
    const centerY = avatarBounds.top + avatarBounds.height / 2;
    const normalizedX = (pointerSnapshot.clientX - centerX) / Math.max(avatarBounds.width / 2, 1);
    const normalizedY = (pointerSnapshot.clientY - centerY) / Math.max(avatarBounds.height / 2, 1);
    const normalizedLength = Math.hypot(normalizedX, normalizedY) || 1;
    const clampedLength = Math.min(1, normalizedLength);
    const targetX = (normalizedX / normalizedLength) * clampedLength;
    const targetY = (normalizedY / normalizedLength) * clampedLength;
    const intensity = clamp01(clampedLength);

    return {
        gazeX: targetX * MAX_GAZE_OFFSET,
        gazeY: targetY * MAX_GAZE_OFFSET,
        bodyOffsetX: targetX * MAX_BODY_OFFSET,
        bodyOffsetY: targetY * MAX_BODY_OFFSET,
        intensity,
        isPointerActive: true,
        pointerType: pointerSnapshot.pointerType,
    };
}

/**
 * Advances the smoothed interaction state toward the latest pointer target.
 *
 * @param runtimeState Previous animation-frame state.
 * @param pointerTarget Latest local pointer target.
 * @param nowMs Current animation-frame timestamp.
 * @returns Next runtime state to keep in the animation loop.
 *
 * @private utility of the avatar rendering system
 */
export function stepAvatarInteractionRuntimeState(
    runtimeState: AvatarInteractionRuntimeState,
    pointerTarget: AvatarPointerTarget,
    nowMs: number,
): AvatarInteractionRuntimeState {
    const deltaMs =
        runtimeState.lastFrameMs === null
            ? 16
            : Math.min(MAX_INTERACTION_FRAME_DELTA_MS, Math.max(8, nowMs - runtimeState.lastFrameMs));
    const smoothingWindowMs = pointerTarget.isPointerActive
        ? ACTIVE_INTERACTION_SMOOTHING_MS
        : IDLE_INTERACTION_SMOOTHING_MS;

    // This exponential interpolation keeps the gaze response smooth regardless of fluctuating frame rates.
    return {
        gazeX: interpolateExponentially(runtimeState.gazeX, pointerTarget.gazeX, deltaMs, smoothingWindowMs),
        gazeY: interpolateExponentially(runtimeState.gazeY, pointerTarget.gazeY, deltaMs, smoothingWindowMs),
        bodyOffsetX: interpolateExponentially(
            runtimeState.bodyOffsetX,
            pointerTarget.bodyOffsetX,
            deltaMs,
            smoothingWindowMs * BODY_INTERACTION_SMOOTHING_MULTIPLIER,
        ),
        bodyOffsetY: interpolateExponentially(
            runtimeState.bodyOffsetY,
            pointerTarget.bodyOffsetY,
            deltaMs,
            smoothingWindowMs * BODY_INTERACTION_SMOOTHING_MULTIPLIER,
        ),
        intensity: interpolateExponentially(runtimeState.intensity, pointerTarget.intensity, deltaMs, smoothingWindowMs),
        isPointerActive: pointerTarget.isPointerActive,
        pointerType: pointerTarget.pointerType,
        lastFrameMs: nowMs,
    };
}

/**
 * Clamps a scalar into the inclusive `[0, 1]` range.
 *
 * @param value Arbitrary scalar.
 * @returns Clamped scalar.
 *
 * @private utility of the avatar rendering system
 */
function clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
}

/**
 * Interpolates between two values using frame-rate-independent exponential easing.
 *
 * @param currentValue Current smoothed value.
 * @param targetValue Target value.
 * @param deltaMs Elapsed milliseconds since the previous frame.
 * @param smoothingWindowMs Time constant controlling responsiveness.
 * @returns Smoothed next value.
 *
 * @private utility of the avatar rendering system
 */
function interpolateExponentially(
    currentValue: number,
    targetValue: number,
    deltaMs: number,
    smoothingWindowMs: number,
): number {
    const blend = 1 - Math.exp(-deltaMs / Math.max(1, smoothingWindowMs));

    return currentValue + (targetValue - currentValue) * blend;
}
