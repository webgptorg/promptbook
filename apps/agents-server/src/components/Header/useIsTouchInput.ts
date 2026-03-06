'use client';

import { useEffect, useState } from 'react';

const TOUCH_INPUT_MEDIA_QUERY = '(hover: none) and (pointer: coarse)';

/**
 * @private function of Header
 */
function detectTouchFirstInput() {
    if (typeof window === 'undefined') {
        return false;
    }

    const navigatorWithTouch = window.navigator as Navigator & { msMaxTouchPoints?: number };
    const hasTouchPoint =
        ('ontouchstart' in window && window.ontouchstart !== undefined) ||
        (navigatorWithTouch.maxTouchPoints ?? 0) > 0 ||
        (navigatorWithTouch.msMaxTouchPoints ?? 0) > 0;
    const prefersTouchMedia =
        typeof window.matchMedia === 'function' && window.matchMedia(TOUCH_INPUT_MEDIA_QUERY).matches;
    return hasTouchPoint || prefersTouchMedia;
}

/**
 * @private Hook used by Header to tell whether the environment prefers touch input.
 */
export function useIsTouchInput() {
    const [isTouchInput, setIsTouchInput] = useState<boolean>(() => detectTouchFirstInput());

    useEffect(() => {
        const updateTouchInput = () => {
            setIsTouchInput(detectTouchFirstInput());
        };

        updateTouchInput();

        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return;
        }

        const mediaQueryList = window.matchMedia(TOUCH_INPUT_MEDIA_QUERY);
        const legacyMediaQueryList = mediaQueryList as MediaQueryList & {
            addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
            removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
        };
        const handleMediaChange = () => updateTouchInput();

        if ('addEventListener' in mediaQueryList) {
            mediaQueryList.addEventListener('change', handleMediaChange);
            return () => void mediaQueryList.removeEventListener('change', handleMediaChange);
        }

        legacyMediaQueryList.addListener?.(handleMediaChange);
        return () => void legacyMediaQueryList.removeListener?.(handleMediaChange);
    }, []);

    return isTouchInput;
}
