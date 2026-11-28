// Note: [💞] Ignore a discrepancy between file name and entity name

/**
 * One callback registered in the shared avatar animation scheduler.
 *
 * @private utility of the avatar rendering system
 */
type AvatarAnimationListener = (now: number) => void;

/**
 * One scheduled avatar animation entry tracked by the shared loop.
 *
 * @private utility of the avatar rendering system
 */
type AvatarAnimationListenerEntry = {
    readonly listener: AvatarAnimationListener;
    lastRunAtMs: number;
};

/**
 * Target frames per second for a single animated avatar.
 *
 * Animated octopus visuals change slowly enough that ~24 fps per avatar is indistinguishable
 * from 60 fps in practice. Combined with `MAX_AVATAR_LISTENERS_PER_FRAME` this bounds total
 * rendering work even when many avatars are visible.
 *
 * @private utility of the avatar rendering system
 */
const AVATAR_TARGET_FPS = 24;

/**
 * Minimum elapsed time in milliseconds required between two consecutive renders of the same avatar.
 *
 * @private utility of the avatar rendering system
 */
const AVATAR_TARGET_FRAME_INTERVAL_MS = 1000 / AVATAR_TARGET_FPS;

/**
 * Hard cap on how many avatar listeners can run inside the same animation frame.
 *
 * The default visual takes several milliseconds to render, so firing every visible avatar
 * on the same animation frame stalls the main thread for tens of milliseconds and drops the
 * overall page FPS to single digits. Bounding the number of listeners that fire per frame
 * spreads the work across animation frames and keeps the UI responsive even with many
 * visible avatars — each individual avatar still reaches `AVATAR_TARGET_FPS` because work
 * is interleaved instead of skipped.
 *
 * @private utility of the avatar rendering system
 */
const MAX_AVATAR_LISTENERS_PER_FRAME = 2;

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
const avatarAnimationListeners = new Map<number, AvatarAnimationListenerEntry>();

/**
 * Active shared animation-frame handle.
 *
 * @private utility of the avatar rendering system
 */
let avatarAnimationFrameId: number | null = null;

/**
 * Registers one avatar animation callback in the shared animation loop.
 *
 * Each listener is staggered at registration time so it does not fire on the same animation
 * frame as the existing listeners, and the shared loop further caps how many listeners run
 * per frame, keeping the main thread responsive when many avatars are mounted.
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
    const existingListenerCount = avatarAnimationListeners.size;
    const staggerOffsetMs =
        ((existingListenerCount % Math.max(1, MAX_AVATAR_LISTENERS_PER_FRAME)) * AVATAR_TARGET_FRAME_INTERVAL_MS) /
        Math.max(1, MAX_AVATAR_LISTENERS_PER_FRAME);
    avatarAnimationListeners.set(listenerId, {
        listener: avatarAnimationListener,
        // Phase the listener so multiple new listeners do not synchronize on the same frame.
        lastRunAtMs: performance.now() - AVATAR_TARGET_FRAME_INTERVAL_MS + staggerOffsetMs,
    });
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

        const dueListenerEntries: Array<AvatarAnimationListenerEntry> = [];

        for (const listenerEntry of avatarAnimationListeners.values()) {
            if (now - listenerEntry.lastRunAtMs >= AVATAR_TARGET_FRAME_INTERVAL_MS) {
                dueListenerEntries.push(listenerEntry);
            }
        }

        // Run the most stale listeners first so each avatar keeps its target FPS even when
        // total work exceeds the per-frame budget.
        dueListenerEntries.sort(
            (firstListenerEntry, secondListenerEntry) =>
                firstListenerEntry.lastRunAtMs - secondListenerEntry.lastRunAtMs,
        );

        const listenersToRunCount = Math.min(dueListenerEntries.length, MAX_AVATAR_LISTENERS_PER_FRAME);

        for (let listenerIndex = 0; listenerIndex < listenersToRunCount; listenerIndex++) {
            const listenerEntry = dueListenerEntries[listenerIndex]!;
            listenerEntry.lastRunAtMs = now;
            listenerEntry.listener(now);
        }

        ensureAvatarAnimationLoop();
    };

    avatarAnimationFrameId = window.requestAnimationFrame(runFrame);
}
