'use client';

import { useState } from 'react';

type CopyFieldProps = {
    label: string;
    value: string;
};

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
            <label className="block text-xs text-gray-500 font-semibold mb-1">{label}</label>
            <div className="flex gap-2 items-center">
                <input
                    type="text"
                    value={value}
                    readOnly
                    className="flex-1 px-2 py-1 border rounded text-sm bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onFocus={(e) => e.target.select()}
                />
                <button
                    type="button"
                    className="px-3 py-1 bg-gray-800 text-white rounded text-xs font-semibold transition hover:bg-gray-700 active:bg-gray-900"
                    onClick={handleCopy}
                >
                    {copied ? '✓ Copied' : 'Copy'}
                </button>
            </div>
        </div>
    );
}
