/**
 * Details describing a client versus server version mismatch.
 *
 * @private Internal Agents Server helper.
 */
export type ClientVersionMismatchInfo = {
    /**
     * Version that the server requires.
     */
    readonly requiredVersion: string;
    /**
     * Version reported by the outdated client, when known.
     */
    readonly reportedVersion: string | null;
    /**
     * Human-readable description of the mismatch.
     */
    readonly message: string;
};

type ClientVersionMismatchListener = (info: ClientVersionMismatchInfo) => void;

const listeners = new Set<ClientVersionMismatchListener>();

/**
 * Registers a callback that is notified when a client version mismatch occurs.
 *
 * @param listener - Handler invoked with mismatch details.
 * @returns Function that removes the listener when the component unmounts.
 *
 * @private Internal Agents Server helper.
 */
export function onClientVersionMismatch(listener: ClientVersionMismatchListener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/**
 * Broadcasts a client version mismatch so that UI components can react.
 *
 * @param info - Mismatch description published to every listener.
 *
 * @private Internal Agents Server helper.
 */
export function reportClientVersionMismatch(info: ClientVersionMismatchInfo): void {
    if (listeners.size === 0) {
        return;
    }

    for (const listener of listeners) {
        listener(info);
    }
}
