'use client';

// Utility to append ?headless param if present in current URL
import Link, { LinkProps } from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { dispatchNavigationProgressStart } from '../NavigationProgress/navigationProgressEvents';

/**
 * Props supported by `HeadlessLink`.
 */
type HeadlessLinkProps = LinkProps &
    AnchorHTMLAttributes<HTMLAnchorElement> & {
        children: ReactNode;
        /**
         * Applies the navigation immediately through the browser history API when
         * the destination only changes the current pathname's query string/hash.
         */
        isOptimisticSamePathNavigation?: boolean;
    };

/**
 * Returns true if `?headless` is present in current search params.
 */
export function useIsHeadless(): boolean {
    const searchParams = useSearchParams();
    return searchParams?.has('headless') ?? false;
}

/**
 * Appends `?headless` to one href when the current page is in headless mode.
 *
 * @param href - Target href to normalize.
 * @param isHeadless - Whether the current route is in headless mode.
 * @returns Normalized href preserving headless mode when needed.
 */
export function appendHeadlessParam(href: string, isHeadless: boolean): string {
    if (!isHeadless) {
        return href;
    }
    if (href.includes('headless')) {
        return href;
    }
    const hasQuery = href.includes('?');
    return hasQuery ? `${href}&headless` : `${href}?headless`;
}

/**
 * Returns whether one click should be handled as a normal in-app client navigation.
 *
 * @param event - React mouse event raised by the anchor.
 * @param target - Optional anchor target attribute.
 * @param hasDownloadAttribute - Whether the link triggers a file download instead of a route change.
 * @returns `true` only for plain left-clicks that should stay in the current browsing context.
 */
function isStandardClientNavigationClick(
    event: MouseEvent<HTMLAnchorElement>,
    target: string | undefined,
    hasDownloadAttribute: boolean,
): boolean {
    return (
        event.button === 0 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey &&
        (!target || target === '_self') &&
        !hasDownloadAttribute
    );
}

/**
 * Returns whether one href points to the current origin and can be handled by the Next.js router.
 *
 * @param href - Absolute or relative link destination.
 * @returns `true` when the href resolves to the current browser origin.
 */
export function isSameOriginHref(href: string): boolean {
    if (typeof window === 'undefined') {
        return href.startsWith('/');
    }

    try {
        return new URL(href, window.location.href).origin === window.location.origin;
    } catch {
        return false;
    }
}

/**
 * Attempts one immediate same-path browser-history navigation.
 *
 * @param href - Destination href to evaluate.
 * @returns True when the current location was updated optimistically.
 */
function tryOptimisticSamePathNavigation(href: string): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        const destination = new URL(href, window.location.href);
        if (destination.origin !== window.location.origin || destination.pathname !== window.location.pathname) {
            return false;
        }

        const nextRelativeLocation = `${destination.pathname}${destination.search}${destination.hash}`;
        const currentRelativeLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`;

        if (nextRelativeLocation === currentRelativeLocation) {
            return true;
        }

        window.history.pushState(null, '', nextRelativeLocation);
        return true;
    } catch {
        return false;
    }
}

/**
 * Custom Link that preserves `?headless` query param across client-side navigations.
 *
 * @param props - Link props and HTML anchor attributes.
 * @returns Next.js link pointing to the normalized headless-safe destination.
 */
export function HeadlessLink({
    href,
    children,
    download,
    isOptimisticSamePathNavigation = false,
    onClick,
    target,
    ...rest
}: HeadlessLinkProps) {
    const isHeadless = useIsHeadless();
    const router = useRouter();
    const finalHref = useMemo(() => appendHeadlessParam(String(href), isHeadless), [href, isHeadless]);
    const handleClick = useCallback(
        (event: MouseEvent<HTMLAnchorElement>) => {
            onClick?.(event);

            if (event.defaultPrevented) {
                return;
            }

            if (!isStandardClientNavigationClick(event, target, download !== undefined) || !isSameOriginHref(finalHref)) {
                return;
            }

            event.preventDefault();

            if (isOptimisticSamePathNavigation && tryOptimisticSamePathNavigation(finalHref)) {
                return;
            }

            dispatchNavigationProgressStart({ href: finalHref, source: 'link' });
            router.push(finalHref);
        },
        [download, finalHref, isOptimisticSamePathNavigation, onClick, router, target],
    );

    return (
        <Link href={finalHref} download={download} onClick={handleClick} target={target} {...rest}>
            {children}
        </Link>
    );
}

/**
 * Executes `router.push(...)` while preserving headless mode and triggering route-loading UX.
 *
 * @param router - Next.js app-router instance.
 * @param href - Target href.
 * @param isHeadless - Whether current route is in headless mode.
 */
export function pushWithHeadless(router: ReturnType<typeof useRouter>, href: string, isHeadless: boolean): void {
    const destination = appendHeadlessParam(href, isHeadless);
    dispatchNavigationProgressStart({ href: destination, source: 'router' });
    router.push(destination);
}
