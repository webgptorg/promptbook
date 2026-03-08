import { useEffect, useState } from 'react';

/**
 * Media query used to detect touch-centric environments where hover interactions are unavailable.
 */
const TOUCH_INPUT_MEDIA_QUERY = '(hover: none) and (pointer: coarse)';

/**
 * Detects whether the current browser context prefers touch-first input.
 *
 * @returns True when touch or coarse pointer capabilities are available.
 */
const detectTouchFirstInput = () => {
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
};

/**
 * Tracks whether interactions should prioritize tap/click expansion over hover behavior.
 *
 * @returns True for touch-first or coarse-pointer devices.
 * @private function of Header
 */
export function useHeaderTouchInput() {
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
