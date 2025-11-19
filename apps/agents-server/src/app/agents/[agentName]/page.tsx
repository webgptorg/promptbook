'use server';

import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { PromptbookQrCode } from '@promptbook-local/components';
// import { BookEditor } from '@promptbook-local/components';
import { parseAgentSource } from '@promptbook-local/core';
import { headers } from 'next/headers';
import { $sideEffect } from '../../../../../../src/utils/organization/$sideEffect';
import { AgentUrlCopy } from './AgentUrlCopy';
// import { Agent } from '@promptbook-local/core';
// import { RemoteLlmExecutionTools } from '@promptbook-local/remote-client';
// import { OpenAiAssistantExecutionTools } from '@promptbook-local/openai';

export default async function AgentPage({ params }: { params: Promise<{ agentName: string }> }) {
    // const [apiKey, setApiKey] = useStateInLocalStorage<string>('openai-apiKey', () => '');
    // const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
    // const [isApiKeySectionCollapsed, setIsApiKeySectionCollapsed] = useState(!!apiKey);

    $sideEffect(headers());

    const { agentName } = await params;
    const collection = await $provideAgentCollectionForServer();
    const agentSourceSubject = await collection.getAgentSource(decodeURIComponent(agentName));
    const agentSource = agentSourceSubject.getValue();
    const agentProfile = parseAgentSource(agentSource);

    // Build agent page URL for QR and copy
    const pageUrl = `https://s6.ptbk.io/agents/${encodeURIComponent(agentName)}`;

    // Extract brand color from meta
    const brandColor = agentProfile.meta.color || '#3b82f6'; // Default to blue-600

    // Mock agent actions
    const agentActions = ['Emails', 'Web', 'Documents', 'Browser', 'WhatsApp', 'Coding'];

    // Render agent profile fields
    const renderProfileFields = () => {
        const renderValue = (value: unknown): React.ReactNode => {
            if (value === null || value === undefined) {
                return <span className="text-gray-400 italic">Not specified</span>;
            }
            if (typeof value === 'object' && !Array.isArray(value)) {
                const objValue = value as Record<string, unknown>;
                return (
                    <div className="space-y-1 pl-3 border-l-2 border-gray-200">
                        {Object.entries(objValue).map(([subKey, subValue]) => (
                            <div key={subKey} className="flex gap-2">
                                <span className="text-xs text-gray-600 font-medium">{subKey}:</span>
                                <span className="text-sm text-gray-700">{String(subValue)}</span>
                            </div>
                        ))}
                    </div>
                );
            }
            if (Array.isArray(value)) {
                return (
                    <ul className="list-disc list-inside space-y-0.5">
                        {value.map((item, idx) => (
                            <li key={idx} className="text-sm text-gray-700">
                                {String(item)}
                            </li>
                        ))}
                    </ul>
                );
            }
            return <span className="text-base text-gray-800 break-words">{String(value)}</span>;
        };

        return (
            <div className="space-y-4">
                {Object.entries(agentProfile).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-1">
                        <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{key}</span>
                        {renderValue(value)}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div
            className="w-full min-h-screen bg-gray-50 py-10 px-4 flex items-center justify-center"
            style={{ backgroundColor: brandColor }}
        >
            <div className="max-w-5xl w-full bg-white rounded-xl shadow-lg p-8 flex flex-col md:flex-row gap-8">
                {/* Left column: Profile info */}
                <div className="flex-1 flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                        {agentProfile.meta.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={agentProfile.meta.image as string}
                                alt={agentProfile.agentName || 'Agent'}
                                width={64}
                                height={64}
                                className="rounded-full object-cover border-2"
                                style={{ borderColor: brandColor }}
                            />
                        )}
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900">{agentProfile.agentName}</h1>
                            <span
                                className="inline-block mt-1 px-2 py-1 rounded text-xs font-semibold text-white"
                                style={{ backgroundColor: brandColor }}
                            >
                                Agent
                            </span>
                        </div>
                    </div>
                    {renderProfileFields()}
                    <div className="flex flex-col gap-2">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Actions</h2>
                        <div className="flex flex-wrap gap-2">
                            {agentActions.map((action) => (
                                <span
                                    key={action}
                                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium border border-gray-200"
                                >
                                    {action}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-4 mt-6">
                        <a
                            href="#"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow font-semibold transition"
                        >
                            💬 Chat
                        </a>
                        <a
                            href="#"
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded shadow font-semibold transition"
                        >
                            ✏️ Edit Agent Book
                        </a>
                    </div>
                </div>
                {/* Right column: QR, source, copy */}
                <div className="flex flex-col items-center gap-6 min-w-[260px]">
                    <div className="bg-gray-100 rounded-lg p-4 flex flex-col items-center">
                        <PromptbookQrCode value={pageUrl} />
                        <span className="mt-2 text-xs text-gray-500">Scan to open agent page</span>
                    </div>
                    <AgentUrlCopy url={pageUrl} />
                </div>
            </div>
        </div>
    );
}

/**
 * TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
 */
