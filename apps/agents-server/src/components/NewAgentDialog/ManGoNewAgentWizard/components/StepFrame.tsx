import type { ReactNode } from 'react';

import { cn } from '../lib/cn';
import { Card } from './ui/Card';

export function StepHeader({
    title,
    subtitle,
    eyebrow,
}: {
    readonly title: string;
    readonly subtitle?: ReactNode;
    /** Optional small uppercase label above the title. */
    readonly eyebrow?: ReactNode;
}) {
    return (
        <header className="mb-8">
            {eyebrow && (
                <div className="mb-2 text-[13px] font-semibold text-[color:var(--ob-accent-600)]">{eyebrow}</div>
            )}
            <h1 className="ob-display text-balance text-[28px] font-bold tracking-tight text-zinc-900">{title}</h1>
            {subtitle && <p className="mt-2.5 max-w-prose text-sm leading-relaxed text-zinc-500">{subtitle}</p>}
        </header>
    );
}

/** White padded card used as the body of form-like steps. */
export function StepCard({ className, children }: { readonly className?: string; readonly children: ReactNode }) {
    return <Card className={cn('p-8 sm:p-10', className)}>{children}</Card>;
}

/** Section heading inside a card — small uppercase label for grouped content. */
export function SectionLabel({ className, children }: { readonly className?: string; readonly children: ReactNode }) {
    return (
        <div className={cn('text-xs font-semibold text-zinc-400', className)}>{children}</div>
    );
}

/** Footer row with a divider — typically "back" on the left, primary action on the right. */
export function StepFooter({ left, right }: { readonly left?: ReactNode; readonly right?: ReactNode }) {
    return (
        <div className="mt-9 flex items-center justify-between gap-4 border-t border-zinc-100 pt-6">
            <div>{left}</div>
            <div className="flex items-center gap-3">{right}</div>
        </div>
    );
}
