'use client';

import { useState } from 'react';
import { SecretInput } from '@/src/components/SecretInput/SecretInput';

type CopyFieldProps = {
    label: string;
    value: string;
};

/**
 * Renders a read-only secret value with copy and visibility toggle controls.
 * @private Used inside the agent integration UI to guard API tokens.
 */
export function CopyField({ label, value }: CopyFieldProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="w-full">
            <SecretInput
                label={label}
                value={value}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
                endAdornment={
                    <button
                        type="button"
                        title={`Copy ${label}`}
                        onClick={handleCopy}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-promptbook-blue"
                    >
                        {copied ? '✓ Copied' : 'Copy'}
                    </button>
                }
            />
        </div>
    );
}
