import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { FOCUS_RING } from './tokens';

export type IconButtonSize = 'md' | 'sm';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    /** Required for accessibility — icon-only buttons need a label. */
    readonly label: string;
    readonly size?: IconButtonSize;
    readonly children: ReactNode;
};

const SIZES: Record<IconButtonSize, string> = {
    md: 'h-9 w-9 text-lg',
    sm: 'h-7 w-7 text-base',
};

/** Square, icon-only button with an accessible label and consistent hover/focus. */
export function IconButton({ label, size = 'md', className, type = 'button', children, ...props }: IconButtonProps) {
    return (
        <button
            type={type}
            aria-label={label}
            title={label}
            className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-lg leading-none text-zinc-400',
                'transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-700',
                'disabled:pointer-events-none disabled:opacity-45',
                SIZES[size],
                FOCUS_RING,
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );
}
