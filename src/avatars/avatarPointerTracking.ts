import type { AvatarPointerSnapshot } from './avatarInteractionUtils';
import type { AvatarPointerType } from './types/AvatarVisualDefinition';

// Note: [💞] Ignore a discrepancy between file name and entity name

/**
 * Active avatar instances currently consuming the shared pointer tracker.
 *
 * @private utility of the avatar rendering system
 */
let avatarPointerTrackingConsumerCount = 0;

/**
 * Latest shared viewport pointer sample.
 *
 * @private utility of the avatar rendering system
 */
let currentAvatarPointerSnapshot: AvatarPointerSnapshot | null = null;

/**
 * Cleanup function for the lazily attached global listeners.
 *
 * @private utility of the avatar rendering system
 */
let releaseAvatarPointerTrackingListeners: (() => void) | null = null;

/**
 * Starts the shared pointer tracker and returns a disposer for the caller.
 *
 * @returns Cleanup function that releases one consumer.
 *
 * @private utility of the avatar rendering system
 */
export function retainAvatarPointerTracking(): () => void {
    avatarPointerTrackingConsumerCount++;

    if (avatarPointerTrackingConsumerCount === 1) {
        releaseAvatarPointerTrackingListeners = attachAvatarPointerTrackingListeners();
    }

    return () => {
        avatarPointerTrackingConsumerCount = Math.max(0, avatarPointerTrackingConsumerCount - 1);

        if (avatarPointerTrackingConsumerCount === 0) {
            currentAvatarPointerSnapshot = null;
            releaseAvatarPointerTrackingListeners?.();
            releaseAvatarPointerTrackingListeners = null;
        }
    };
}

/**
 * Returns the latest shared viewport pointer sample when available.
 *
 * @returns Shared pointer snapshot or `null`.
 *
 * @private utility of the avatar rendering system
 */
export function getAvatarPointerSnapshot(): AvatarPointerSnapshot | null {
    return currentAvatarPointerSnapshot;
}

/**
 * Attaches the global pointer/touch listeners used by all live avatar canvases.
 *
 * @returns Cleanup function for the attached listeners.
 *
 * @private utility of the avatar rendering system
 */
function attachAvatarPointerTrackingListeners(): () => void {
    if (typeof window === 'undefined') {
        return () => undefined;
    }

    const clearPointerSnapshot = () => {
        currentAvatarPointerSnapshot = null;
    };

    const updatePointerSnapshot = (
        clientX: number,
        clientY: number,
        pointerType: Exclude<AvatarPointerType, 'idle'>,
    ) => {
        currentAvatarPointerSnapshot = {
            clientX,
            clientY,
            isPointerActive: true,
            pointerType,
        };
    };

    const handlePointerMove = (event: PointerEvent) => {
        updatePointerSnapshot(event.clientX, event.clientY, normalizeAvatarPointerType(event.pointerType));
    };

    const handlePointerDown = (event: PointerEvent) => {
        updatePointerSnapshot(event.clientX, event.clientY, normalizeAvatarPointerType(event.pointerType));
    };

    const handlePointerUp = (event: PointerEvent) => {
        if (normalizeAvatarPointerType(event.pointerType) !== 'mouse') {
            clearPointerSnapshot();
        }
    };

    const handleMouseOut = (event: MouseEvent) => {
        if (!event.relatedTarget) {
            clearPointerSnapshot();
        }
    };

    const handleTouchEvent = (event: TouchEvent) => {
        const touch = event.touches[0] || event.changedTouches[0];

        if (!touch) {
            clearPointerSnapshot();
            return;
        }

        updatePointerSnapshot(touch.clientX, touch.clientY, 'touch');
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', clearPointerSnapshot, { passive: true });
    window.addEventListener('mouseout', handleMouseOut, { passive: true });
    window.addEventListener('blur', clearPointerSnapshot);
    window.addEventListener('touchstart', handleTouchEvent, { passive: true });
    window.addEventListener('touchmove', handleTouchEvent, { passive: true });
    window.addEventListener('touchend', clearPointerSnapshot, { passive: true });
    window.addEventListener('touchcancel', clearPointerSnapshot, { passive: true });

    return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerdown', handlePointerDown);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', clearPointerSnapshot);
        window.removeEventListener('mouseout', handleMouseOut);
        window.removeEventListener('blur', clearPointerSnapshot);
        window.removeEventListener('touchstart', handleTouchEvent);
        window.removeEventListener('touchmove', handleTouchEvent);
        window.removeEventListener('touchend', clearPointerSnapshot);
        window.removeEventListener('touchcancel', clearPointerSnapshot);
    };
}

/**
 * Normalizes browser pointer-type strings into the shared avatar contract.
 *
 * @param pointerType Raw browser pointer type.
 * @returns Shared pointer type.
 *
 * @private utility of the avatar rendering system
 */
function normalizeAvatarPointerType(pointerType: string): Exclude<AvatarPointerType, 'idle'> {
    if (pointerType === 'touch' || pointerType === 'pen') {
        return pointerType;
    }

    return 'mouse';
}
