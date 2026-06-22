import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'error';

type BadgeProps = {
    readonly tone?: BadgeTone;
    /** Renders a small leading status dot. */
    readonly dot?: boolean;
    readonly children: ReactNode;
    readonly className?: string;
};

const TONES: Record<BadgeTone, { chip: string; dot: string }> = {
    neutral: { chip: 'bg-zinc-100 text-zinc-600', dot: 'bg-zinc-400' },
    accent: {
        chip: 'bg-[color:var(--ob-accent-50)] text-[color:var(--ob-accent-700)] ring-1 ring-inset ring-[color:var(--ob-accent-100)]',
        dot: 'bg-[color:var(--ob-accent-500)]',
    },
    success: { chip: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    warning: { chip: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    error: { chip: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

/** Compact status pill / chip. */
export function Badge({ tone = 'neutral', dot = false, children, className }: BadgeProps) {
    const t = TONES[tone];
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                t.chip,
                className,
            )}
        >
            {dot && <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} aria-hidden />}
            {children}
        </span>
    );
}
