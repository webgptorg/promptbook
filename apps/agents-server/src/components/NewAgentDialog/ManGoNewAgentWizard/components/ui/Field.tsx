import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';
import { FOCUS_RING_INPUT } from './tokens';

/**
 * Shared control styling for text inputs / textareas. Exported so hand-rolled inputs
 * elsewhere in the module (URL field, chat composer) stay visually identical — DRY.
 */
export const CONTROL =
    'w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 ' +
    'shadow-[var(--ob-shadow-xs)] placeholder:text-zinc-400 transition-[border-color,box-shadow] ' +
    'disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 ' +
    FOCUS_RING_INPUT;

/** Applied on top of CONTROL when a field is in an error state. */
export const CONTROL_ERROR =
    'border-red-300 focus:border-red-400 focus:ring-red-500/15';

type FieldShellProps = {
    readonly label: string;
    readonly hint?: ReactNode;
    readonly htmlFor: string;
    readonly children: ReactNode;
    readonly labelSuffix?: ReactNode;
    readonly error?: ReactNode;
    readonly describedById?: string;
};

function FieldShell({ label, hint, htmlFor, children, labelSuffix, error, describedById }: FieldShellProps) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={htmlFor} className="flex items-center gap-2 text-[13px] font-semibold text-zinc-700">
                {label}
                {labelSuffix}
            </label>
            {children}
            {error ? (
                <p id={describedById} className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden>
                        <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM7.25 5a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0V5zM8 10.25a.9.9 0 100 1.8.9.9 0 000-1.8z" />
                    </svg>
                    {error}
                </p>
            ) : (
                hint && (
                    <p id={describedById} className="text-xs leading-relaxed text-zinc-400">
                        {hint}
                    </p>
                )
            )}
        </div>
    );
}

type InputFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
    readonly label: string;
    readonly hint?: ReactNode;
    readonly labelSuffix?: ReactNode;
    /** When set, the control turns red and this message replaces the hint. Additive. */
    readonly error?: ReactNode;
};

export function InputField({ label, hint, labelSuffix, error, className, ...props }: InputFieldProps) {
    const id = useId();
    const descId = `${id}-desc`;
    return (
        <FieldShell label={label} hint={hint} htmlFor={id} labelSuffix={labelSuffix} error={error} describedById={descId}>
            <input
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={error || hint ? descId : undefined}
                className={cn(CONTROL, Boolean(error) && CONTROL_ERROR, className)}
                {...props}
            />
        </FieldShell>
    );
}

type TextareaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
    readonly label: string;
    readonly hint?: ReactNode;
    readonly labelSuffix?: ReactNode;
    /** When set, the control turns red and this message replaces the hint. Additive. */
    readonly error?: ReactNode;
};

export function TextareaField({ label, hint, labelSuffix, error, className, ...props }: TextareaFieldProps) {
    const id = useId();
    const descId = `${id}-desc`;
    return (
        <FieldShell label={label} hint={hint} htmlFor={id} labelSuffix={labelSuffix} error={error} describedById={descId}>
            <textarea
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={error || hint ? descId : undefined}
                className={cn(CONTROL, 'resize-y', Boolean(error) && CONTROL_ERROR, className)}
                {...props}
            />
        </FieldShell>
    );
}
