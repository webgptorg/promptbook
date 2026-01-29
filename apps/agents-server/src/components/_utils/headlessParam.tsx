// Utility to append ?headless param if present in current URL
import Link, { LinkProps } from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

// Returns true if ?headless is present in current search params
export function useIsHeadless() {
    const searchParams = useSearchParams();
    return searchParams.has('headless');
}

// Appends ?headless to a given href if needed
export function appendHeadlessParam(href: string, isHeadless: boolean): string {
    if (!isHeadless) return href;
    if (href.includes('headless')) return href;
    const hasQuery = href.includes('?');
    return hasQuery ? `${href}&headless` : `${href}?headless`;
}

// Custom Link that preserves headless param
export function HeadlessLink({
    href,
    children,
    ...rest
}: LinkProps & { children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
    const isHeadless = useIsHeadless();
    const finalHref = useMemo(() => appendHeadlessParam(String(href), isHeadless), [href, isHeadless]);
    return (
        <Link href={finalHref} {...rest}>
            {children}
        </Link>
    );
}

import { useRouter } from 'next/navigation';

// Helper for router.push
export function pushWithHeadless(router: ReturnType<typeof useRouter>, href: string, isHeadless: boolean) {
    router.push(appendHeadlessParam(href, isHeadless));
}
