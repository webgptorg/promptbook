// PromptbookQrCodePreview.tsx
'use client';

import { BrandedQrCode, GenericQrCode, PromptbookQrCode } from '@promptbook-local/components';
import { useState } from 'react';

/**
 * Renders a preview of <PromptbookQrCode /> component.
 */
export default function PromptbookQrCodePreview() {
    const [value, setValue] = useState('https://ptbk.io');

    return (
        <div className="w-full space-y-4">
            <div className="container font-medium w-full">
                Value:
                <textarea
                    className="w-full border border-gray-300 rounded px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Enter QR code value"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PromptbookQrCode className="w-full flex justify-center" value={value} />
                <BrandedQrCode className="w-full flex justify-center" value={value} logoSrc="" />
                <GenericQrCode className="w-full flex justify-center" value={value} />
            </div>
        </div>
    );
}
