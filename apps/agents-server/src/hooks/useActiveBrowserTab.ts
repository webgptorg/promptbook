'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `true` when the current browser tab is both visible and focused.
 */
export function useActiveBrowserTab(): boolean {
    const [isActiveBrowserTab, setIsActiveBrowserTab] = useState(resolveIsActiveBrowserTab);

    useEffect(() => {
        if (typeof document === 'undefined' || typeof window === 'undefined') {
            return;
        }

        const synchronize = (): void => {
            setIsActiveBrowserTab(resolveIsActiveBrowserTab());
        };

        synchronize();
        document.addEventListener('visibilitychange', synchronize);
        window.addEventListener('focus', synchronize);
        window.addEventListener('blur', synchronize);

        return () => {
            document.removeEventListener('visibilitychange', synchronize);
            window.removeEventListener('focus', synchronize);
            window.removeEventListener('blur', synchronize);
        };
    }, []);

    return isActiveBrowserTab;
}

/**
 * Resolves whether the current browser tab is eligible for live streaming UX.
 */
function resolveIsActiveBrowserTab(): boolean {
    if (typeof document === 'undefined') {
        return false;
    }

    const isVisible = document.visibilityState === 'visible';
    const hasFocus = typeof document.hasFocus === 'function' ? document.hasFocus() : true;

    return isVisible && hasFocus;
}
