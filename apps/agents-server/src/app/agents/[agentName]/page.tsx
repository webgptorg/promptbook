'use server';

// import { BookEditor } from '@promptbook-local/components';
import { $provideServer } from '@/src/tools/$provideServer';
import { Columns2Icon, MessagesSquareIcon, NotebookPenIcon } from 'lucide-react';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { Color } from '../../../../../../src/utils/color/Color';
import { withAlpha } from '../../../../../../src/utils/color/operators/withAlpha';
import { $sideEffect } from '../../../../../../src/utils/organization/$sideEffect';
import { AgentChatWrapper } from './AgentChatWrapper';
import { AgentQrCode } from './AgentQrCode';
import { AGENT_ACTIONS, getAgentName, getAgentProfile } from './_utils';
import { CopyField } from './CopyField';
import { generateAgentMetadata } from './generateAgentMetadata';
import { ServiceWorkerRegister } from './ServiceWorkerRegister';
// import { Agent } from '@promptbook-local/core';
// import { RemoteLlmExecutionTools } from '@promptbook-local/remote-client';
// import { OpenAiAssistantExecutionTools } from '@promptbook-local/openai';

export const generateMetadata = generateAgentMetadata;

export default async function AgentPage({ params }: { params: Promise<{ agentName: string }> }) {
    // const [apiKey, setApiKey] = useStateInLocalStorage<string>('openai-apiKey', () => '');
    // const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
    // const [isApiKeySectionCollapsed, setIsApiKeySectionCollapsed] = useState(!!apiKey);

    $sideEffect(headers());

    const agentName = await getAgentName(params);

    let agentProfile;
    try {
        agentProfile = await getAgentProfile(agentName);
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

    const { publicUrl } = await $provideServer();

    // Build agent page URL for QR and copy
    const agentUrl = `${publicUrl.href}${encodeURIComponent(agentName)}`;
    // <- TODO: [🐱‍🚀] Better

    const agentEmail = `${agentName}@${publicUrl.hostname}`;

    console.log('[🐱‍🚀]', { pageUrl: agentUrl });

    // Extract brand color from meta
    const brandColor = Color.from(agentProfile.meta.color || '#3b82f6'); // Default to blue-600

    // Mock agent actions
    const agentActions = AGENT_ACTIONS;

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-60px)] w-full overflow-hidden">
            <ServiceWorkerRegister scope={`/agents/${encodeURIComponent(agentName)}/`} />

            {/* Left sidebar: Profile info */}
            <div
                className="w-full md:w-[400px] flex flex-col gap-6 p-6 overflow-y-auto border-r bg-gray-50 flex-shrink-0"
                style={{
                    backgroundColor: brandColor.then(withAlpha(0.05)).toHex(),
                    borderColor: brandColor.then(withAlpha(0.1)).toHex(),
                }}
            >
                <div className="flex items-center gap-4">
                    {agentProfile.meta.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={agentProfile.meta.image as string}
                            alt={agentProfile.meta.fullname || agentProfile.agentName || 'Agent'}
                            width={64}
                            height={64}
                            className="rounded-full object-cover border-2 aspect-square w-16 h-16"
                            style={{ borderColor: brandColor.toHex() }}
                        />
                    )}
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-gray-900 break-words">
                            {agentProfile.meta.fullname || agentProfile.agentName}
                        </h1>
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
                                className="px-3 py-1 bg-white text-gray-700 rounded-full text-xs font-medium border border-gray-200 shadow-sm"
                            >
                                {action}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-2 mt-auto">
                    <div className="flex gap-2">
                        <a
                            href={`/agents/${encodeURIComponent(agentName)}/chat`}
                            // <- TODO: [🧠] Can I append path like this on current browser URL in href?
                            className="flex-1 inline-flex items-center justify-center whitespace-nowrap bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 rounded shadow font-semibold transition border border-gray-200"
                        >
                            <MessagesSquareIcon className="ml-2 w-4 h-4 mr-2" />
                            Chat
                        </a>
                        <a
                            href={`/agents/${encodeURIComponent(agentName)}/book+chat`}
                            // <- TODO: [🧠] Can I append path like this on current browser URL in href?
                            className="flex-1 inline-flex items-center justify-center whitespace-nowrap bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 rounded shadow font-semibold transition border border-gray-200"
                        >
                            <Columns2Icon className="ml-2 w-4 h-4 mr-2" />
                            Book + Chat
                        </a>
                        <a
                            href={`/agents/${encodeURIComponent(agentName)}/book`}
                            // <- TODO: [🧠] Can I append path like this on current browser URL in href?
                            className="flex-1 inline-flex items-center justify-center whitespace-nowrap bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 rounded shadow font-semibold transition border border-gray-200"
                        >
                            <NotebookPenIcon className="ml-2 w-4 h-4 mr-2" />
                            Edit
                        </a>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-4 pt-6 border-t border-gray-200 w-full">
                    <div className="bg-white rounded-lg p-4 flex flex-col items-center shadow-sm border border-gray-100">
                        <AgentQrCode
                            agentName={agentProfile.agentName || 'Agent'}
                            meta={agentProfile.meta}
                            personaDescription={agentProfile.personaDescription}
                            agentUrl={agentUrl}
                            agentEmail={agentEmail}
                        />
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                        <CopyField label="Agent Page URL" value={agentUrl} />
                        <CopyField label="Agent Email" value={agentEmail} />
                    </div>
                </div>
            </div>

            {/* Main content: Chat */}
            <div className="flex-1 relative h-full bg-white">
                <AgentChatWrapper agentUrl={agentUrl} />
            </div>
        </div>
    );
}

/**
 * TODO: [🐱‍🚀] Make this page look nice - 🃏
 * TODO: [🐱‍🚀] Show usage of LLM
 * TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
 * TODO: [🎣][🧠] Maybe do API / Page for transpilers, Allow to export each agent
 */
