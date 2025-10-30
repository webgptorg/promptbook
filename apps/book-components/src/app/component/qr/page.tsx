'use client';

import { BrandedQrCode, GenericQrCode, PromptbookQrCode } from '@promptbook-local/components';
import { useState } from 'react';

export default function QrCodePage() {
    const [value, setValue] = useState('https://promptbook.webgpt.com');

    return (
        <div>
            <h1>QR Code</h1>
            <p>Here are the QR code components available in Promptbook.</p>

            <div>
                <label htmlFor="qr-value">QR Code Value:</label>
                <input
                    id="qr-value"
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    style={{ width: '100%', padding: '8px', marginBottom: '16px' }}
                />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
                <div>
                    <h2>Generic QR Code</h2>
                    <GenericQrCode value={value} />
                </div>
                <div>
                    <h2>Branded QR Code</h2>
                    <BrandedQrCode value={value} logoSrc="/promptbook-logo.svg" />
                </div>
                <div>
                    <h2>Promptbook QR Code</h2>
                    <PromptbookQrCode value={value} />
                </div>
            </div>
        </div>
    );
}
