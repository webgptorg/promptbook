'use client';

import { useEffect } from 'react';
import { resolveVisibleViewportHeight } from './resolveVisibleViewportHeight';

/**
 * CSS variable that stores the currently visible app viewport height.
 */
const APP_HEIGHT_CSS_VARIABLE_NAME = '--agents-server-app-height';

/**
 * Keeps the shared app-height CSS variable synchronized with the browser's
 * visible viewport so mobile browser chrome changes do not leave unused space.
 */
export function ViewportHeightController() {
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const rootElement = document.documentElement;
        const visualViewport = window.visualViewport;
        let animationFrameId: number | null = null;

        /**
         * Schedules one CSS variable refresh on the next animation frame.
         */
        const scheduleHeightUpdate = () => {
            if (animationFrameId !== null) {
                window.cancelAnimationFrame(animationFrameId);
            }

            animationFrameId = window.requestAnimationFrame(() => {
                animationFrameId = null;
                const visibleViewportHeight = resolveVisibleViewportHeight(window);

                if (visibleViewportHeight > 0) {
                    rootElement.style.setProperty(APP_HEIGHT_CSS_VARIABLE_NAME, `${visibleViewportHeight}px`);
                }
            });
        };

        scheduleHeightUpdate();

        window.addEventListener('resize', scheduleHeightUpdate);
        window.addEventListener('orientationchange', scheduleHeightUpdate);
        visualViewport?.addEventListener('resize', scheduleHeightUpdate);
        visualViewport?.addEventListener('scroll', scheduleHeightUpdate);

        return () => {
            if (animationFrameId !== null) {
                window.cancelAnimationFrame(animationFrameId);
            }

            window.removeEventListener('resize', scheduleHeightUpdate);
            window.removeEventListener('orientationchange', scheduleHeightUpdate);
            visualViewport?.removeEventListener('resize', scheduleHeightUpdate);
            visualViewport?.removeEventListener('scroll', scheduleHeightUpdate);
            rootElement.style.removeProperty(APP_HEIGHT_CSS_VARIABLE_NAME);
        };
    }, []);

    return null;
}
