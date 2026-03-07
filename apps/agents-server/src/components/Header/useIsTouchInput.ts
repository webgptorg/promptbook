'use client';

import { useEffect, useState } from 'react';

/**
 * Media query used to identify touch-first/coarse pointer devices.
 *
 * @private internal constant of <Header/>
 */
const TOUCH_INPUT_MEDIA_QUERY = '(hover: none) and (pointer: coarse)';

/**
 * Detects touch-first input based on pointer capabilities and max touch points.
 *
 * @private function of <Header/>
 */
const detectTouchFirstInput = () => {
    if (typeof window === 'undefined') {
        return false;
    }

    const mediaMatches = window.matchMedia?.(TOUCH_INPUT_MEDIA_QUERY).matches ?? false;
    const pointerIsCoarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const touchPoints = navigator.maxTouchPoints ?? 0;

    return mediaMatches || pointerIsCoarse || touchPoints > 0;
};

/**
 * Exposes whether the active layout should prefer tap-first behavior.
 *
 * @private function of <Header/>
 */
export function useIsTouchInput() {
    const [isTouchInput, setIsTouchInput] = useState(false);

    useEffect(() => {
        setIsTouchInput(detectTouchFirstInput());

        const hoverMediaQuery = window.matchMedia(TOUCH_INPUT_MEDIA_QUERY);
        const pointerMediaQuery = window.matchMedia('(pointer: coarse)');

        const update = () => {
            setIsTouchInput(detectTouchFirstInput());
        };

        hoverMediaQuery.addEventListener('change', update);
        pointerMediaQuery.addEventListener('change', update);

        return () => {
            hoverMediaQuery.removeEventListener('change', update);
            pointerMediaQuery.removeEventListener('change', update);
        };
    }, []);

    return isTouchInput;
}
