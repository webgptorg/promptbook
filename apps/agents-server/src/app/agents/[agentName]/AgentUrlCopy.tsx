'use client';

import { string_agent_url } from '@promptbook-local/types';
import { useState } from 'react';
import { useAgentNaming } from '../../../components/AgentNaming/AgentNamingContext';

export function AgentUrlCopy({ agentUrl }: { agentUrl: string_agent_url }) {
    const [copied, setCopied] = useState(false);
    const { formatText } = useAgentNaming();

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(agentUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="w-full">
            <label className="block text-xs text-gray-500 font-semibold mb-1">{formatText('Agent Page URL')}</label>
            <div className="flex gap-2 items-center">
                <input
                    type="text"
                    value={agentUrl}
                    readOnly
                    className="flex-1 px-2 py-1 border rounded text-sm bg-gray-50 text-gray-700"
                    onFocus={(e) => e.target.select()}
                />
                <button
                    type="button"
                    className="px-2 py-1 text-white rounded text-xs font-semibold transition hover:opacity-90"
                    onClick={handleCopy}
                >
                    {copied ? '✓ Copied' : 'Copy'}
                </button>
            </div>
        </div>
    );
}
