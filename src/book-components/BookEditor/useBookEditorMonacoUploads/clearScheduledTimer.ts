/**
 * Clears an optional scheduled timer when it exists.
 *
 * @private function of BookEditorMonaco
 */
export function clearScheduledTimer(timerId: number | null): void {
    if (timerId !== null) {
        clearTimeout(timerId);
    }
}
