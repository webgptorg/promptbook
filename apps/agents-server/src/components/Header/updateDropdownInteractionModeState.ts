import type { DropdownInteractionMode } from './HeaderTypes';

/**
 * Updates one keyed dropdown interaction mode entry while preserving object identity whenever nothing changes.
 *
 * @private function of Header
 */
export function updateDropdownInteractionModeState(
    previous: Record<string, DropdownInteractionMode>,
    key: string,
    mode: DropdownInteractionMode | null,
): Record<string, DropdownInteractionMode> {
    if (mode === null) {
        if (!(key in previous)) {
            return previous;
        }

        const next = { ...previous };
        delete next[key];
        return next;
    }

    if (previous[key] === mode) {
        return previous;
    }

    return {
        ...previous,
        [key]: mode,
    };
}
