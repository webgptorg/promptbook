// Note: [💞] Ignore a discrepancy between file name and entity name

/**
 * One callback observing the viewport visibility of an avatar canvas.
 *
 * @private utility of the avatar rendering system
 */
type AvatarVisibilityListener = (isVisible: boolean) => void;

/**
 * Shared `IntersectionObserver` callbacks grouped by observed element.
 *
 * @private utility of the avatar rendering system
 */
const avatarVisibilityListeners = new Map<Element, Set<AvatarVisibilityListener>>();

/**
 * Lazily created shared `IntersectionObserver` used by avatar canvases.
 *
 * @private utility of the avatar rendering system
 */
let avatarVisibilityObserver: IntersectionObserver | null = null;

/**
 * Observes one avatar element and notifies the caller when it enters or leaves the viewport.
 *
 * @param element Observed avatar element.
 * @param avatarVisibilityListener Listener notified with the current visibility state.
 * @returns Cleanup function that stops observing the element.
 *
 * @private utility of the avatar rendering system
 */
export function observeAvatarVisibility(
    element: Element,
    avatarVisibilityListener: AvatarVisibilityListener,
): () => void {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
        avatarVisibilityListener(true);
        return () => undefined;
    }

    const observer = getAvatarVisibilityObserver();
    const elementListeners = avatarVisibilityListeners.get(element) || new Set<AvatarVisibilityListener>();
    elementListeners.add(avatarVisibilityListener);
    avatarVisibilityListeners.set(element, elementListeners);
    observer.observe(element);

    return () => {
        const currentElementListeners = avatarVisibilityListeners.get(element);

        if (!currentElementListeners) {
            return;
        }

        currentElementListeners.delete(avatarVisibilityListener);

        if (currentElementListeners.size > 0) {
            return;
        }

        avatarVisibilityListeners.delete(element);
        observer.unobserve(element);
    };
}

/**
 * Creates the shared `IntersectionObserver` used by all avatar canvases.
 *
 * @returns Shared observer instance.
 *
 * @private utility of the avatar rendering system
 */
function getAvatarVisibilityObserver(): IntersectionObserver {
    if (avatarVisibilityObserver) {
        return avatarVisibilityObserver;
    }

    avatarVisibilityObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            const elementListeners = avatarVisibilityListeners.get(entry.target);

            if (!elementListeners) {
                continue;
            }

            const isVisible = entry.isIntersecting && entry.intersectionRatio > 0;

            for (const avatarVisibilityListener of elementListeners) {
                avatarVisibilityListener(isVisible);
            }
        }
    });

    return avatarVisibilityObserver;
}
