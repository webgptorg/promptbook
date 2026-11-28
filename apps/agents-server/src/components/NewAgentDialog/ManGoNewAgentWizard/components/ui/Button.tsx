import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { Spinner } from './Spinner';
import { FOCUS_RING } from './tokens';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'inverted';
export type ButtonSize = 'md' | 'sm';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    readonly variant?: ButtonVariant;
    readonly size?: ButtonSize;
    /** When true, shows a spinner and disables the button (additive — defaults to false). */
    readonly isLoading?: boolean;
    /** Optional icon rendered before the label. */
    readonly leadingIcon?: ReactNode;
    /** Optional icon rendered after the label. */
    readonly trailingIcon?: ReactNode;
};

const BASE =
    'inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold ' +
    'transition-[box-shadow,transform,filter,color,border-color,background-color] duration-150 ease-out ' +
    'active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 ' +
    FOCUS_RING;

const VARIANTS: Record<ButtonVariant, string> = {
    primary:
        'text-[color:var(--ob-ink)] bg-[image:var(--ob-grad-primary)] ' +
        'shadow-[var(--ob-shadow-accent)] hover:shadow-[var(--ob-shadow-lg)] hover:brightness-[1.04] active:brightness-95',
    outline:
        'border border-zinc-200/80 bg-white text-zinc-700 shadow-[var(--ob-shadow-xs)] ' +
        'hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 active:bg-zinc-100',
    ghost: 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200/70',
    inverted:
        'bg-white text-[color:var(--ob-accent-700)] shadow-[var(--ob-shadow-sm)] ' +
        'hover:bg-white/90 active:bg-white/80',
};

const SIZES: Record<ButtonSize, string> = {
    md: 'h-10 px-5 text-sm',
    sm: 'h-8 px-3.5 text-[13px]',
};

export function Button({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leadingIcon,
    trailingIcon,
    className,
    type = 'button',
    disabled,
    children,
    ...props
}: ButtonProps) {
    const spinnerSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
    return (
        <button
            type={type}
            disabled={disabled || isLoading}
            aria-busy={isLoading || undefined}
            className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
            {...props}
        >
            {isLoading ? (
                <Spinner className={cn(spinnerSize, variant === 'primary' && 'border-white/40 border-t-white')} />
            ) : (
                leadingIcon && <span className="-ml-0.5 inline-flex shrink-0 items-center">{leadingIcon}</span>
            )}
            {children}
            {!isLoading && trailingIcon && (
                <span className="-mr-0.5 inline-flex shrink-0 items-center">{trailingIcon}</span>
            )}
        </button>
    );
}
