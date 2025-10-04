/**
 * Keeps a value stable (frozen) while a condition is true.
 * Useful to prevent React re-renders from replacing DOM nodes that the user is selecting text in.
 *
 * Generic and reusable across components. DRY helper for selection-preserving behavior.
 *
 * @public exported from `@promptbook/components`
 */
import { useEffect, useRef } from 'react';

/**
 * Keeps the given value "frozen" while the freeze flag is true.
 * This prevents React re-renders from replacing DOM nodes that the user may be selecting.
 *
 * @param value The current value to potentially freeze
 * @param freeze When true, keep returning the last unfrozen value
 * @returns The frozen or live value
 * @public exported from `@promptbook/components`
 */
export function useFrozenValueWhile<T>(value: T, freeze: boolean): T {
    const ref = useRef<T>(value);

    useEffect(() => {
        if (!freeze) {
            ref.current = value;
        }
        // When freeze=true we intentionally do NOT update ref.current
    }, [value, freeze]);

    return ref.current;
}
