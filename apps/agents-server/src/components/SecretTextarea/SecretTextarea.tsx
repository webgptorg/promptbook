'use client';

import { Eye, EyeOff } from 'lucide-react';
import { TextareaHTMLAttributes, type CSSProperties, useId, useState } from 'react';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';

/**
 * Extended style type that includes browser-specific text-masking property.
 */
type SecretTextareaStyle = CSSProperties & {
    WebkitTextSecurity?: 'none' | 'disc';
};

/**
 * Props used to configure the shared secret textarea field.
 */
export type SecretTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'children'> & {
    /**
     * Label rendered above the textarea.
     */
    label?: string;
    /**
     * Optional helper text shown beneath the textarea.
     */
    helperText?: string;
    /**
     * Controls whether the field starts in visible state.
     */
    initiallyVisible?: boolean;
    /**
     * Enables the show/hide toggle button.
     */
    showToggle?: boolean;
    /**
     * Additional classes applied to the wrapper element.
     */
    containerClassName?: string;
    /**
     * Additional classes applied to the textarea element.
     */
    textareaClassName?: string;
};

/**
 * Renders a textarea whose value can be masked and toggled for multiline secrets.
 */
export function SecretTextarea(props: SecretTextareaProps) {
    const { t } = useServerLanguage();
    const {
        label,
        helperText,
        initiallyVisible = false,
        showToggle = true,
        containerClassName,
        textareaClassName,
        className,
        style,
        id,
        disabled,
        ...textareaProps
    } = props;
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const [isVisible, setIsVisible] = useState(initiallyVisible);

    const toggleLabel = isVisible ? t('secretInput.hideSecret') : t('secretInput.showSecret');
    const baseTextareaClasses = [
        'block w-full min-h-[120px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-promptbook-blue focus:border-transparent disabled:opacity-50',
        'pr-12',
        textareaClassName,
        className,
    ]
        .filter(Boolean)
        .join(' ');
    const maskedStyle: SecretTextareaStyle = {
        ...(style || {}),
        WebkitTextSecurity: isVisible ? 'none' : 'disc',
    };

    return (
        <div className={['space-y-1', containerClassName].filter(Boolean).join(' ')}>
            {label && (
                <label htmlFor={textareaId} className="text-sm font-medium text-gray-700 block">
                    {label}
                </label>
            )}
            <div className="relative">
                <textarea
                    id={textareaId}
                    className={baseTextareaClasses}
                    style={maskedStyle}
                    disabled={disabled}
                    {...textareaProps}
                />
                {showToggle && (
                    <button
                        type="button"
                        onClick={() => setIsVisible((value) => !value)}
                        aria-label={toggleLabel}
                        disabled={disabled}
                        className={[
                            'absolute right-2 top-2 rounded-full p-2 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-promptbook-blue focus-visible:ring-opacity-60',
                            disabled ? 'cursor-not-allowed opacity-50' : '',
                        ]
                            .filter(Boolean)
                            .join(' ')}
                    >
                        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                )}
            </div>
            {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
        </div>
    );
}
