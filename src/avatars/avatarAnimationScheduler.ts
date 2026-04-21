// Note: [💞] Ignore a discrepancy between file name and entity name

/**
 * One callback registered in the shared avatar animation scheduler.
 *
 * @private utility of the avatar rendering system
 */
type AvatarAnimationListener = (now: number) => void;

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

        for (const avatarAnimationListener of [...avatarAnimationListeners.values()]) {
            avatarAnimationListener(now);
        }

        ensureAvatarAnimationLoop();
    };

    avatarAnimationFrameId = window.requestAnimationFrame(runFrame);
}
