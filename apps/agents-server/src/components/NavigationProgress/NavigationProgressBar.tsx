'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NAVIGATION_PROGRESS_START_EVENT_NAME, dispatchNavigationProgressStart } from './navigationProgressEvents';

/**
 * Initial visible progress value used right after navigation starts.
 */
const INITIAL_PROGRESS_VALUE = 0.12;

/**
 * Maximum trickle progress value before the route is considered complete.
 */
const MAX_TRICKLE_PROGRESS_VALUE = 0.9;

/**
 * Smallest proportional trickle step used for each interval tick.
 */
const MIN_TRICKLE_FACTOR = 0.05;

/**
 * Additional random trickle factor range used for natural movement.
 */
const TRICKLE_RANDOM_FACTOR_RANGE = 0.07;

/**
 * Interval used for progressive loading increments while navigation is in progress.
 */
const PROGRESS_TRICKLE_INTERVAL_MS = 120;

/**
 * Minimum duration that keeps the bar visible after navigation starts.
 */
const MIN_PROGRESS_VISIBLE_DURATION_MS = 220;

/**
 * Delay used to fade out and reset the bar after reaching 100%.
 */
const PROGRESS_COMPLETE_HIDE_DELAY_MS = 160;

/**
 * Fallback timeout that resolves stalled navigation indicators.
 */
const NAVIGATION_STALL_TIMEOUT_MS = 12_000;

/**
 * Primary mouse button code used for normal left-click navigation.
 */
const PRIMARY_MOUSE_BUTTON = 0;

/**
 * Runtime-safe timer handle that works in both browser and Node typings.
 */
type TimerHandle = ReturnType<typeof setTimeout>;

/**
 * Runtime-safe interval handle that works in both browser and Node typings.
 */
type IntervalHandle = ReturnType<typeof setInterval>;

/**
 * Data kept for one active navigation progress session.
 */
type NavigationProgressSession = {
    /**
     * Monotonic token used to avoid race conditions between overlapping navigations.
     */
    readonly token: number;
    /**
     * Start timestamp of this session in milliseconds.
     */
    readonly startedAtMs: number;
};

/**
 * Returns true when keyboard modifiers imply a special click behavior.
 */
function isModifiedClick(event: MouseEvent): boolean {
    return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

/**
 * Resolves one anchor destination to an internal route path eligible for top-progress loading.
 *
 * @param anchor - Clicked anchor element.
 * @returns Destination path when the anchor points to a same-origin route change, otherwise `null`.
 */
function resolveInternalRouteFromAnchor(anchor: HTMLAnchorElement): string | null {
    const rawHref = anchor.getAttribute('href');
    if (!rawHref) {
        return null;
    }

    const trimmedHref = rawHref.trim();
    if (
        trimmedHref === '' ||
        trimmedHref.startsWith('#') ||
        trimmedHref.startsWith('mailto:') ||
        trimmedHref.startsWith('tel:') ||
        trimmedHref.startsWith('javascript:')
    ) {
        return null;
    }

    if (anchor.hasAttribute('download')) {
        return null;
    }

    if (anchor.target && anchor.target !== '_self') {
        return null;
    }

    let parsedHref: URL;
    try {
        parsedHref = new URL(trimmedHref, window.location.href);
    } catch {
        return null;
    }

    if (parsedHref.origin !== window.location.origin) {
        return null;
    }

    const currentPathAndSearch = `${window.location.pathname}${window.location.search}`;
    const destinationPathAndSearch = `${parsedHref.pathname}${parsedHref.search}`;

    if (destinationPathAndSearch === currentPathAndSearch) {
        return null;
    }

    return `${destinationPathAndSearch}${parsedHref.hash}`;
}

/**
 * Renders the fixed top-edge gradient loading bar for route transitions.
 */
export function NavigationProgressBar() {
    const pathname = usePathname() || '';
    const searchParams = useSearchParams();
    const locationKey = useMemo(() => `${pathname}?${searchParams?.toString() ?? ''}`, [pathname, searchParams]);

    const [progress, setProgress] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    const hasMountedRef = useRef(false);
    const activeSessionRef = useRef<NavigationProgressSession | null>(null);
    const sessionTokenCounterRef = useRef(0);
    const trickleIntervalRef = useRef<IntervalHandle | null>(null);
    const completeHideTimeoutRef = useRef<TimerHandle | null>(null);
    const stallTimeoutRef = useRef<TimerHandle | null>(null);

    /**
     * Completes the active progress session and schedules visual reset.
     *
     * @param expectedSessionToken - Optional token guard used by timeout callbacks.
     */
    const completeProgress = useCallback((expectedSessionToken?: number) => {
        const activeSession = activeSessionRef.current;
        if (!activeSession) {
            return;
        }

        if (expectedSessionToken !== undefined && activeSession.token !== expectedSessionToken) {
            return;
        }

        if (trickleIntervalRef.current !== null) {
            clearInterval(trickleIntervalRef.current);
            trickleIntervalRef.current = null;
        }

        if (stallTimeoutRef.current !== null) {
            clearTimeout(stallTimeoutRef.current);
            stallTimeoutRef.current = null;
        }

        const elapsedSinceStart = Date.now() - activeSession.startedAtMs;
        const remainingVisibleDuration = Math.max(0, MIN_PROGRESS_VISIBLE_DURATION_MS - elapsedSinceStart);
        const completedToken = activeSession.token;

        activeSessionRef.current = null;
        setProgress(1);

        if (completeHideTimeoutRef.current !== null) {
            clearTimeout(completeHideTimeoutRef.current);
            completeHideTimeoutRef.current = null;
        }

        completeHideTimeoutRef.current = setTimeout(() => {
            const currentSession = activeSessionRef.current;
            if (currentSession && currentSession.token !== completedToken) {
                return;
            }

            setIsVisible(false);
            setProgress(0);
        }, remainingVisibleDuration + PROGRESS_COMPLETE_HIDE_DELAY_MS);
    }, []);

    /**
     * Starts one progress session and enables gradual trickle updates.
     */
    const startProgress = useCallback(() => {
        if (completeHideTimeoutRef.current !== null) {
            clearTimeout(completeHideTimeoutRef.current);
            completeHideTimeoutRef.current = null;
        }

        const nextSessionToken = sessionTokenCounterRef.current + 1;
        sessionTokenCounterRef.current = nextSessionToken;

        activeSessionRef.current = {
            token: nextSessionToken,
            startedAtMs: Date.now(),
        };

        setIsVisible(true);
        setProgress((currentProgress) => Math.max(currentProgress, INITIAL_PROGRESS_VALUE));

        if (trickleIntervalRef.current === null) {
            trickleIntervalRef.current = setInterval(() => {
                setProgress((currentProgress) => {
                    if (currentProgress >= MAX_TRICKLE_PROGRESS_VALUE) {
                        return currentProgress;
                    }

                    const trickleFactor = MIN_TRICKLE_FACTOR + Math.random() * TRICKLE_RANDOM_FACTOR_RANGE;
                    const remainingDistance = MAX_TRICKLE_PROGRESS_VALUE - currentProgress;
                    const nextProgress = currentProgress + remainingDistance * trickleFactor;

                    return Math.min(MAX_TRICKLE_PROGRESS_VALUE, nextProgress);
                });
            }, PROGRESS_TRICKLE_INTERVAL_MS);
        }

        if (stallTimeoutRef.current !== null) {
            clearTimeout(stallTimeoutRef.current);
            stallTimeoutRef.current = null;
        }

        stallTimeoutRef.current = setTimeout(() => {
            completeProgress(nextSessionToken);
        }, NAVIGATION_STALL_TIMEOUT_MS);
    }, [completeProgress]);

    /**
     * Listens for explicit route-transition start events.
     */
    useEffect(() => {
        const handleProgressStartEvent = () => {
            startProgress();
        };

        window.addEventListener(NAVIGATION_PROGRESS_START_EVENT_NAME, handleProgressStartEvent as EventListener);
        return () => {
            window.removeEventListener(NAVIGATION_PROGRESS_START_EVENT_NAME, handleProgressStartEvent as EventListener);
        };
    }, [startProgress]);

    /**
     * Emits route-transition start events for same-origin anchor clicks.
     */
    useEffect(() => {
        const handleDocumentClick = (event: MouseEvent) => {
            if (event.defaultPrevented || event.button !== PRIMARY_MOUSE_BUTTON || isModifiedClick(event)) {
                return;
            }

            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const anchor = target.closest('a');
            if (!(anchor instanceof HTMLAnchorElement)) {
                return;
            }

            const destination = resolveInternalRouteFromAnchor(anchor);
            if (!destination) {
                return;
            }

            dispatchNavigationProgressStart({ href: destination, source: 'link' });
        };

        document.addEventListener('click', handleDocumentClick);
        return () => {
            document.removeEventListener('click', handleDocumentClick);
        };
    }, []);

    /**
     * Completes the active progress session when route location changes.
     */
    useEffect(() => {
        if (!hasMountedRef.current) {
            hasMountedRef.current = true;
            return;
        }

        completeProgress();
    }, [completeProgress, locationKey]);

    /**
     * Cleans all timers when the component unmounts.
     */
    useEffect(() => {
        return () => {
            if (trickleIntervalRef.current !== null) {
                clearInterval(trickleIntervalRef.current);
                trickleIntervalRef.current = null;
            }
            if (completeHideTimeoutRef.current !== null) {
                clearTimeout(completeHideTimeoutRef.current);
                completeHideTimeoutRef.current = null;
            }
            if (stallTimeoutRef.current !== null) {
                clearTimeout(stallTimeoutRef.current);
                stallTimeoutRef.current = null;
            }
        };
    }, []);

    return (
        <div className={`agents-server-navigation-progress ${isVisible ? 'is-visible' : ''}`} aria-hidden={true}>
            <div className="agents-server-navigation-progress__bar" style={{ width: `${progress * 100}%` }} />
        </div>
    );
}
