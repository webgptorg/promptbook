'use server';

import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { PromptbookQrCode } from '@promptbook-local/components';
// import { BookEditor } from '@promptbook-local/components';
import { $provideServer } from '@/src/tools/$provideServer';
import { parseAgentSource } from '@promptbook-local/core';
import { ChartAreaIcon, Edit2Icon } from 'lucide-react';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { Color } from '../../../../../../src/utils/color/Color';
import { textColor } from '../../../../../../src/utils/color/operators/furthest';
import { $sideEffect } from '../../../../../../src/utils/organization/$sideEffect';
import { AgentUrlCopy } from './AgentUrlCopy';
import { generateAgentMetadata } from './generateAgentMetadata';
// import { Agent } from '@promptbook-local/core';
// import { RemoteLlmExecutionTools } from '@promptbook-local/remote-client';
// import { OpenAiAssistantExecutionTools } from '@promptbook-local/openai';

export const generateMetadata = generateAgentMetadata;

export default async function AgentPage({ params }: { params: Promise<{ agentName: string }> }) {
    // const [apiKey, setApiKey] = useStateInLocalStorage<string>('openai-apiKey', () => '');
    // const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
    // const [isApiKeySectionCollapsed, setIsApiKeySectionCollapsed] = useState(!!apiKey);

    $sideEffect(headers());

    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    const collection = await $provideAgentCollectionForServer();
    let agentSource;
    try {
        agentSource = await collection.getAgentSource(agentName);
    } catch (error) {
        if (
            error instanceof Error &&
            // Note: This is a bit hacky, but valid way to check for specific error message
            (error.message.includes('Cannot coerce the result to a single JSON object') ||
                error.message.includes('JSON object requested, multiple (or no) results returned'))
        ) {
            notFound();
        }
        throw error;
    }
    const agentProfile = parseAgentSource(agentSource);

    const { publicUrl } = await $provideServer();

    // Build agent page URL for QR and copy
    const agentUrl = `${publicUrl.href}${encodeURIComponent(agentName)}`;
    // <- TODO: !!! Better

    console.log('!!!!', { pageUrl: agentUrl });

    // Extract brand color from meta
    const brandColor = Color.from(agentProfile.meta.color || '#3b82f6'); // Default to blue-600

    // Mock agent actions
    const agentActions = ['Emails', 'Web chat', 'Read documents', 'Browser', 'WhatsApp', '<Coding/>'];

    return (
        <div
            className="w-full h-[calc(100vh-60px)] bg-gray-50 py-10 px-4 flex items-center justify-center"
            style={{ backgroundColor: brandColor.toHex() }}
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
                                className="rounded-full object-cover border-2 aspect-square w-16 h-16"
                                style={{ borderColor: brandColor.toHex() }}
                            />
                        )}
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900">{agentProfile.agentName}</h1>
                            <span
                                className="inline-block mt-1 px-2 py-1 rounded text-xs font-semibold text-white"
                                style={{ backgroundColor: brandColor.toHex() }}
                            >
                                Agent
                            </span>
                        </div>
                    </div>
                    <p className="text-gray-700">{agentProfile.personaDescription}</p>
                    <div className="flex flex-col gap-2">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Capabilities</h2>
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
                            href={`${agentUrl}/chat`}
                            // <- TODO: [🧠] Can I append path like this on current browser URL in href?
                            className="inline-flex items-center justify-center whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow font-semibold transition"
                            style={{ backgroundColor: brandColor.toHex(), color: brandColor.then(textColor).toHex() }}
                        >
                            <ChartAreaIcon className="ml-2 w-4 h-4 mr-2" />
                            Chat
                        </a>
                        <a
                            href={`${agentUrl}/book`}
                            // <- TODO: [🧠] Can I append path like this on current browser URL in href?
                            className="inline-flex items-center justify-center whitespace-nowrap bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded shadow font-semibold transition"
                        >
                            <Edit2Icon className="ml-2 w-4 h-4 mr-2" />
                            Edit
                        </a>
                    </div>
                </div>
                {/* Right column: QR, source, copy */}
                <div className="flex flex-col items-center gap-6 min-w-[260px]">
                    <div className="bg-gray-100 rounded-lg p-4 flex flex-col items-center">
                        <PromptbookQrCode value={agentUrl} />
                        <span className="mt-2 text-xs text-gray-500">Scan to open agent</span>
                    </div>
                    <AgentUrlCopy agentUrl={agentUrl} />
                </div>
            </div>
        </div>
    );
}

/**
 * TODO: !!! Make this page look nice - 🃏
 * TODO: !!! Show usage of LLM
 * TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
 * TODO: [🎣][🧠] Maybe do API / Page for transpilers, Allow to export each agent
 */
