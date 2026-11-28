'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { NAVIGATION_PROGRESS_START_EVENT_NAME, type NavigationProgressStartDetail } from '../NavigationProgress/navigationProgressEvents';
import { normalizeDestinationForPathComparison } from '../_utils/clientNavigationFallback';
import { HomepageLoadingSkeleton } from '../Skeleton/HomepageLoadingSkeleton';

/**
 * Pathname of the homepage route rendered by the optimistic navigation shell.
 */
const HOME_PAGE_PATHNAME = '/';

/**
 * Pending homepage navigation metadata tracked by the persistent app shell.
 *
 * @private internal helper of Agents Server homepage navigation
 */
type PendingHomepageNavigation = {
    readonly sourcePathname: string;
    readonly destinationPathname: string;
};

/**
 * Props accepted by the homepage optimistic-navigation shell.
 *
 * @private internal helper of Agents Server homepage navigation
 */
type HomepageOptimisticNavigationProps = {
    readonly children: ReactNode;
    readonly pathname: string | null;
};

/**
 * Tracks the current navigation that should render the homepage loading skeleton.
 *
 * @param pathname - Current pathname reported by the shared app shell.
 * @returns Pending home-navigation metadata or `null` when no optimistic render is active.
 *
 * @private internal helper of Agents Server homepage navigation
 */
function usePendingHomepageNavigation(pathname: string | null): PendingHomepageNavigation | null {
    const pathnameRef = useRef(pathname);
    const [pendingHomepageNavigation, setPendingHomepageNavigation] =
        useState<PendingHomepageNavigation | null>(null);

    useEffect(() => {
        pathnameRef.current = pathname;
    }, [pathname]);

    useEffect(() => {
        if (pendingHomepageNavigation === null) {
            return;
        }

        if (
            pathname === pendingHomepageNavigation.destinationPathname ||
            pathname !== pendingHomepageNavigation.sourcePathname
        ) {
            setPendingHomepageNavigation(null);
        }
    }, [pathname, pendingHomepageNavigation]);

    useEffect(() => {
        const handleNavigationStart = (event: Event) => {
            const customEvent = event as CustomEvent<NavigationProgressStartDetail>;
            const destinationHref = customEvent.detail?.href;
            if (!destinationHref) {
                return;
            }

            const destinationPathname = normalizeDestinationForPathComparison(destinationHref);
            const currentPathname = pathnameRef.current;

            if (destinationPathname === HOME_PAGE_PATHNAME) {
                if (currentPathname === null || currentPathname === HOME_PAGE_PATHNAME) {
                    return;
                }

                setPendingHomepageNavigation({
                    sourcePathname: currentPathname,
                    destinationPathname,
                });
                return;
            }

            setPendingHomepageNavigation(null);
        };

        window.addEventListener(NAVIGATION_PROGRESS_START_EVENT_NAME, handleNavigationStart as EventListener);
        return () => {
            window.removeEventListener(NAVIGATION_PROGRESS_START_EVENT_NAME, handleNavigationStart as EventListener);
        };
    }, []);

    return pendingHomepageNavigation;
}

/**
 * Renders the homepage loading skeleton immediately after a pending homepage transition starts.
 *
 * @param props - Current pathname and children supplied by the persistent layout shell.
 * @returns Homepage children or the optimistic loading skeleton while home data is still streaming.
 *
 * @private internal helper of Agents Server homepage navigation
 */
export function HomepageOptimisticNavigation({ pathname, children }: HomepageOptimisticNavigationProps) {
    const pendingHomepageNavigation = usePendingHomepageNavigation(pathname);
    const isOptimisticallyNavigatingHome =
        pendingHomepageNavigation !== null &&
        pendingHomepageNavigation.destinationPathname === HOME_PAGE_PATHNAME &&
        pathname === pendingHomepageNavigation.sourcePathname &&
        pathname !== HOME_PAGE_PATHNAME;

    if (isOptimisticallyNavigatingHome) {
        return <HomepageLoadingSkeleton />;
    }

    return <>{children}</>;
}
