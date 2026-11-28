import type { HTMLAttributes } from 'react';

import { cn } from '../../lib/cn';
import { FOCUS_RING } from './tokens';

export type CardVariant = 'default' | 'elevated' | 'interactive';

type CardProps = HTMLAttributes<HTMLDivElement> & {
    /** Visual weight. `elevated` lifts off the page; `interactive` adds hover feedback. */
    readonly variant?: CardVariant;
};

const VARIANTS: Record<CardVariant, string> = {
    default: 'shadow-[var(--ob-shadow-sm)]',
    elevated: 'shadow-[var(--ob-shadow-lg)]',
    interactive:
        'shadow-[var(--ob-shadow-sm)] cursor-pointer transition-[box-shadow,border-color,transform] ' +
        'duration-200 hover:-translate-y-0.5 hover:border-[color:var(--ob-accent-200)] hover:shadow-[var(--ob-shadow-md)] ' +
        FOCUS_RING,
};

export function Card({ variant = 'default', className, ...props }: CardProps) {
    return (
        <div
            className={cn(
                'rounded-2xl border border-zinc-200/60 bg-white',
                VARIANTS[variant],
                className,
            )}
            {...props}
        />
    );
}
