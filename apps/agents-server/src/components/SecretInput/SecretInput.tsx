'use client';

import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, InputHTMLAttributes, ReactNode, useId, useState } from 'react';

/**
 * Props used to configure the shared secret input field.
 * @private Internal props for the Agents Server secret input helper.
 */
export type SecretInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
    /** Label rendered above the input. */
    label?: string;
    /** Optional helper text shown beneath the input. */
    helperText?: string;
    /** Enables the show/hide toggle button. */
    showToggle?: boolean;
    /** Controls whether the field starts in visible state. */
    initiallyVisible?: boolean;
    /** Content rendered to the left of the input (usually an icon). */
    startIcon?: ReactNode;
    /** Content rendered to the right of the input next to the toggle. */
    endAdornment?: ReactNode;
    /** Additional classes applied to the wrapper. */
    containerClassName?: string;
    /** Additional classes applied to the input element. */
    inputClassName?: string;
};

/**
 * Renders an input whose value can be masked and toggled for password- or token-style fields.
 * @private Shared helper for Password and token controls inside the Agents Server UI.
 */
export const SecretInput = forwardRef<HTMLInputElement, SecretInputProps>(function SecretInput(
    props,
    ref,
) {
    const {
        label,
        helperText,
        showToggle = true,
        initiallyVisible = false,
        startIcon,
        endAdornment,
        containerClassName,
        inputClassName,
        className: restClassName,
        id,
        ...inputProps
    } = props;
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const [isVisible, setIsVisible] = useState(initiallyVisible);

    const baseInputClasses = [
        'block w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-promptbook-blue focus:border-transparent disabled:opacity-50',
        startIcon ? 'pl-10' : 'pl-3',
        'pr-14',
        inputClassName,
        restClassName,
    ]
        .filter(Boolean)
        .join(' ');

    const toggleLabel = isVisible ? 'Hide secret value' : 'Show secret value';
    const toggleDisabled = Boolean(inputProps.disabled);

    return (
        <div className={['space-y-1', containerClassName].filter(Boolean).join(' ')}>
            {label && (
                <label htmlFor={inputId} className="text-sm font-medium text-gray-700 block">
                    {label}
                </label>
            )}
            <div className="relative flex items-center">
                {startIcon && (
                    <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                        {startIcon}
                    </div>
                )}
                <input
                    id={inputId}
                    ref={ref}
                    type={isVisible ? 'text' : 'password'}
                    className={baseInputClasses}
                    {...inputProps}
                />
                {(showToggle || endAdornment) && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 space-x-2">
                        {endAdornment}
                        {showToggle && (
                            <button
                                type="button"
                                onClick={() => setIsVisible((prev) => !prev)}
                                aria-label={toggleLabel}
                                disabled={toggleDisabled}
                                className={[
                                    'rounded-full p-2 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-promptbook-blue focus-visible:ring-opacity-60',
                                    toggleDisabled ? 'cursor-not-allowed opacity-50' : '',
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                            >
                                {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        )}
                    </div>
                )}
            </div>
            {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
        </div>
    );
});
