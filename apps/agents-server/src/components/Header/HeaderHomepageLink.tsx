'use client';

import promptbookLogoBlueTransparent from '@/public/logo-blue-white-256.png';
import Image from 'next/image';
import type { MouseEventHandler } from 'react';
import { HeadlessLink } from '../_utils/headlessParam';

/**
 * Props for the shared header homepage link rendered in desktop and mobile navigation.
 */
type HeaderHomepageLinkProps = {
    readonly serverName: string;
    readonly serverLogoUrl: string | null;
    readonly className?: string;
    readonly labelClassName?: string;
    readonly logoClassName?: string;
    readonly isCompactOnMobile?: boolean;
    readonly onClick?: MouseEventHandler<HTMLAnchorElement>;
};

/**
 * Renders the shared server logo/name link that always navigates back to the homepage.
 */
export function HeaderHomepageLink({
    serverName,
    serverLogoUrl,
    className = '',
    labelClassName = '',
    logoClassName = '',
    isCompactOnMobile = false,
    onClick,
}: HeaderHomepageLinkProps) {
    const compactServerName = serverName.split(' ')[0] || serverName;
    const mergedLogoClassName = `h-6 w-6 shrink-0 object-contain sm:h-8 sm:w-8 ${logoClassName}`.trim();
    const mergedLabelClassName =
        `min-w-0 truncate text-base font-bold tracking-tight text-gray-900 dark:text-slate-100 ${labelClassName}`.trim();

    return (
        <HeadlessLink
            href="/"
            isOptimisticSamePathNavigation={true}
            aria-label={serverName}
            className={`flex min-w-0 items-center gap-3 ${className}`.trim()}
            onClick={onClick}
        >
            <span className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-white/90 p-1 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900/90 dark:ring-slate-700/80">
                {serverLogoUrl ? (
                    // Note: `next/image` does not load external images well without extra config
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={serverLogoUrl}
                        alt=""
                        aria-hidden
                        width={32}
                        height={32}
                        className={mergedLogoClassName}
                    />
                ) : (
                    <Image
                        src={promptbookLogoBlueTransparent}
                        alt=""
                        aria-hidden
                        width={32}
                        height={32}
                        className={mergedLogoClassName}
                    />
                )}
            </span>
            <span className={mergedLabelClassName}>
                {isCompactOnMobile ? (
                    <>
                        <span className="hidden sm:inline">{serverName}</span>
                        <span className="sm:hidden">{compactServerName}</span>
                    </>
                ) : (
                    serverName
                )}
            </span>
        </HeadlessLink>
    );
}
