'use client';

import { Copy } from 'lucide-react';

interface CopyButtonProps {
    text: string;
    className?: string;
    children?: React.ReactNode;
}

export default function CopyButton({ text, className = '', children }: CopyButtonProps) {
    const copyToClipboard = (textToCopy: string) => {
        navigator.clipboard.writeText(textToCopy);
    };

    return (
        <button onClick={() => copyToClipboard(text)} className={className}>
            {children || (
                <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                </>
            )}
        </button>
    );
}
