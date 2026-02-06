'use client';

import { PromptbookQrCode } from '@promptbook-local/components';
import { AgentBasicInformation } from '@promptbook-local/types';
import { useState } from 'react';
import spaceTrim from 'spacetrim';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';

type AgentQrCodeProps = Pick<AgentBasicInformation, 'agentName' | 'personaDescription' | 'meta'> & {
    agentUrl: string;
    agentEmail: string;

    isJustVcardShown?: boolean;
};

export function AgentQrCode(props: AgentQrCodeProps) {
    const { agentName, agentUrl, agentEmail, personaDescription, meta, isJustVcardShown } = props;
    const [mode, setMode] = useState<'contact' | 'link'>('contact');
    const { formatText } = useAgentNaming();

    // TODO: [🧠] Should we include more info in VCARD?
    const vcard = spaceTrim(`
        BEGIN:VCARD
        VERSION:3.0
        FN:${meta.fullname || agentName}
        URL:${agentUrl}
        EMAIL:${agentEmail}
        NOTE:${personaDescription}
        END:VCARD
    `);

    const qrValue = mode === 'contact' ? vcard : agentUrl;
    const label = mode === 'contact' ? 'Scan to add contact' : formatText('Scan to open agent');

    if (isJustVcardShown) {
        return <PromptbookQrCode value={vcard} className="" size={250} />;
    }

    return (
        <div className="flex flex-col items-center">
            <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                <button
                    onClick={() => setMode('contact')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        mode === 'contact' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Contact
                </button>
                <button
                    onClick={() => setMode('link')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        mode === 'link' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Link
                </button>
            </div>

            <PromptbookQrCode value={qrValue} className="" size={250} />
            <span className="mt-2 text-xs text-gray-500">{label}</span>
        </div>
    );
}
