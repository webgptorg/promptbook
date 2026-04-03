// Utility to append ?headless param if present in current URL
import Link, { LinkProps } from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { dispatchNavigationProgressStart } from '../NavigationProgress/navigationProgressEvents';

/**
 * Props supported by `HeadlessLink`.
 */
type HeadlessLinkProps = LinkProps &
    React.AnchorHTMLAttributes<HTMLAnchorElement> & {
        children: React.ReactNode;
    };

/**
 * Returns true if `?headless` is present in current search params.
 */
export function useIsHeadless(): boolean {
    const searchParams = useSearchParams();
    return searchParams.has('headless');
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
 * Custom Link that preserves `?headless` query param across client-side navigations.
 *
 * @param props - Link props and HTML anchor attributes.
 * @returns Next.js link pointing to the normalized headless-safe destination.
 */
export function HeadlessLink({
    href,
    children,
    ...rest
}: HeadlessLinkProps) {
    const isHeadless = useIsHeadless();
    const finalHref = useMemo(() => appendHeadlessParam(String(href), isHeadless), [href, isHeadless]);
    return (
        <Link href={finalHref} {...rest}>
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
