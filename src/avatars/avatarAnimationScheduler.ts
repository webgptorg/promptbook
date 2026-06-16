// Note: [💞] Ignore a discrepancy between file name and entity name

/**
 * One callback registered in the shared avatar animation scheduler.
 *
 * @private utility of the avatar rendering system
 */
type AvatarAnimationListener = (now: number) => void;

/**
 * Target frames per second for the shared avatar animation loop.
 *
 * Animated octopus visuals change slowly enough that 24 fps is indistinguishable
 * from 60 fps in practice, while cutting rendering work by ~60% when multiple
 * avatars are on screen simultaneously.
 *
 * @private utility of the avatar rendering system
 */
const AVATAR_TARGET_FPS = 24;

/**
 * Minimum elapsed time in milliseconds required between avatar render passes.
 *
 * @private utility of the avatar rendering system
 */
const AVATAR_TARGET_FRAME_INTERVAL_MS = 1000 / AVATAR_TARGET_FPS;

/**
 * Next registration id used by the shared avatar animation scheduler.
 *
 * @private utility of the avatar rendering system
 */
let nextAvatarAnimationListenerId = 1;

/**
 * Active avatar animation callbacks keyed by their registration id.
 *
 * @private utility of the avatar rendering system
 */
const avatarAnimationListeners = new Map<number, AvatarAnimationListener>();

/**
 * Active shared animation-frame handle.
 *
 * @private utility of the avatar rendering system
 */
let avatarAnimationFrameId: number | null = null;

/**
 * Timestamp of the most recently rendered avatar frame.
 *
 * Used to throttle callbacks to `AVATAR_TARGET_FRAME_INTERVAL_MS`.
 *
 * @private utility of the avatar rendering system
 */
let lastAvatarFrameTime = 0;

/**
 * Registers one avatar animation callback in the shared animation loop.
 *
 * @param avatarAnimationListener Frame callback invoked on every animation frame.
 * @returns Cleanup function that unregisters the callback.
 *
 * @private utility of the avatar rendering system
 */
export function retainAvatarAnimationListener(avatarAnimationListener: AvatarAnimationListener): () => void {
    if (typeof window === 'undefined') {
        return () => undefined;
    }

    const listenerId = nextAvatarAnimationListenerId++;
    avatarAnimationListeners.set(listenerId, avatarAnimationListener);
    ensureAvatarAnimationLoop();

    return () => {
        avatarAnimationListeners.delete(listenerId);

        if (avatarAnimationListeners.size === 0 && avatarAnimationFrameId !== null) {
            window.cancelAnimationFrame(avatarAnimationFrameId);
            avatarAnimationFrameId = null;
        }
    };
}

/**
 * Ensures the shared animation loop is running while at least one avatar listener is active.
 *
 * @private utility of the avatar rendering system
 */
function ensureAvatarAnimationLoop(): void {
    if (avatarAnimationFrameId !== null || avatarAnimationListeners.size === 0 || typeof window === 'undefined') {
        return;
    }

    const runFrame = (now: number) => {
        avatarAnimationFrameId = null;

        if (now - lastAvatarFrameTime >= AVATAR_TARGET_FRAME_INTERVAL_MS) {
            lastAvatarFrameTime = now;

            for (const avatarAnimationListener of [...avatarAnimationListeners.values()]) {
                avatarAnimationListener(now);
            }
        }

        ensureAvatarAnimationLoop();
    };

    avatarAnimationFrameId = window.requestAnimationFrame(runFrame);
}
