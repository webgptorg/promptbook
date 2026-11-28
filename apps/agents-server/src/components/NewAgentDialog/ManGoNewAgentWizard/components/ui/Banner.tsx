import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

export type BannerTone = 'info' | 'success' | 'warning' | 'error';

type BannerProps = {
    readonly tone?: BannerTone;
    /** Optional bold heading shown above the body. */
    readonly title?: ReactNode;
    readonly children?: ReactNode;
    /** Override the default emoji/icon for the tone. Pass `null` to hide it. */
    readonly icon?: ReactNode;
    readonly className?: string;
};

const TONES: Record<BannerTone, { wrap: string; icon: string; title: string; defaultIcon: string }> = {
    info: {
        wrap: 'border-[color:var(--ob-accent-200)] bg-[color:var(--ob-accent-50)] text-[color:var(--ob-accent-900)]',
        icon: 'text-[color:var(--ob-accent-600)]',
        title: 'text-[color:var(--ob-accent-900)]',
        defaultIcon: 'ℹ️',
    },
    success: {
        wrap: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        icon: 'text-emerald-600',
        title: 'text-emerald-900',
        defaultIcon: '✓',
    },
    warning: {
        wrap: 'border-amber-200 bg-amber-50 text-amber-800',
        icon: 'text-amber-600',
        title: 'text-amber-900',
        defaultIcon: '⚠️',
    },
    error: {
        wrap: 'border-red-200 bg-red-50 text-red-800',
        icon: 'text-red-600',
        title: 'text-red-900',
        defaultIcon: '⚠️',
    },
};

/** Inline contextual message — info / success / warning / error. */
export function Banner({ tone = 'info', title, children, icon, className }: BannerProps) {
    const t = TONES[tone];
    const isIconShown = icon !== null;
    return (
        <div
            role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
            className={cn(
                'flex gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed',
                'shadow-[var(--ob-shadow-xs)]',
                t.wrap,
                className,
            )}
        >
            {isIconShown && (
                <span className={cn('mt-px shrink-0 text-base leading-none', t.icon)} aria-hidden>
                    {icon ?? t.defaultIcon}
                </span>
            )}
            <div className="min-w-0">
                {title && <div className={cn('font-semibold', t.title)}>{title}</div>}
                {children && <div className={cn(Boolean(title) && 'mt-0.5 opacity-90')}>{children}</div>}
            </div>
        </div>
    );
}
