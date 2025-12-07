'use server';

import { $provideServer } from '@/src/tools/$provideServer';
import { PROMPTBOOK_COLOR } from '@promptbook-local/core';
import {
    ArrowLeftIcon,
    BookOpenIcon,
    CodeIcon,
    HistoryIcon,
    HomeIcon,
    LinkIcon,
    MessageSquareIcon,
    ShareIcon,
} from 'lucide-react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Color } from '../../../../../../../src/utils/color/Color';
import { withAlpha } from '../../../../../../../src/utils/color/operators/withAlpha';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { CopyField } from '../CopyField';
import { getAgentName, getAgentProfile } from '../_utils';
import { generateAgentMetadata } from '../generateAgentMetadata';

export const generateMetadata = generateAgentMetadata;

export default async function AgentLinksPage({ params }: { params: Promise<{ agentName: string }> }) {
    $sideEffect(headers());
    const agentName = await getAgentName(params);

    let agentProfile;
    try {
        agentProfile = await getAgentProfile(agentName);
    } catch (error) {
        if (
            error instanceof Error &&
            (error.message.includes('Cannot coerce the result to a single JSON object') ||
                error.message.includes('JSON object requested, multiple (or no) results returned'))
        ) {
            notFound();
        }
        throw error;
    }

    const { publicUrl } = await $provideServer();
    const baseUrl = `${publicUrl.href}agents/${encodeURIComponent(agentName)}`;

    // Extract brand color from meta
    const brandColor = Color.from(agentProfile.meta.color || PROMPTBOOK_COLOR);
    const backgroundColor = (await brandColor.then(withAlpha(0.05))).toHex();
    const borderColor = (await brandColor.then(withAlpha(0.1))).toHex();
    const primaryColor = (await brandColor).toHex();

    return (
        <div
            className="min-h-screen p-6 md:p-12 flex flex-col items-center"
            style={{
                backgroundColor,
            }}
        >
            <div className="w-full max-w-3xl bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b flex items-center gap-4" style={{ borderColor }}>
                    {agentProfile.meta.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={agentProfile.meta.image as string}
                            alt={agentProfile.meta.fullname || agentName}
                            className="w-16 h-16 rounded-full object-cover border-2"
                            style={{ borderColor: primaryColor }}
                        />
                    )}
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900">{agentProfile.meta.fullname || agentName}</h1>
                        <p className="text-gray-500 flex items-center gap-2">
                            <LinkIcon className="w-4 h-4" />
                            Signpost & Links
                        </p>
                    </div>
                    <Link
                        href={`/agents/${encodeURIComponent(agentName)}`}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                        title="Back to Agent"
                    >
                        <ArrowLeftIcon className="w-6 h-6" />
                    </Link>
                </div>

                <div className="divide-y divide-gray-100">
                    {/* API Endpoints */}
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <CodeIcon className="w-5 h-5 text-gray-500" />
                            API Endpoints
                        </h2>
                        <div className="grid gap-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-1">
                                    OpenAI Compatible Chat Completion
                                </h3>
                                <p className="text-xs text-gray-500 mb-2">
                                    Standard OpenAI API endpoint for chat completions.
                                </p>
                                <CopyField label="Endpoint URL" value={`${baseUrl}/api/openai/chat/completions`} />
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-1">OpenRouter Compatible</h3>
                                <p className="text-xs text-gray-500 mb-2">
                                    Endpoint compatible with OpenRouter API format.
                                </p>
                                <CopyField label="Endpoint URL" value={`${baseUrl}/api/openrouter/chat/completions`} />
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-1">Model Context Protocol (MCP)</h3>
                                <p className="text-xs text-gray-500 mb-2">
                                    Endpoint for Model Context Protocol integration.
                                </p>
                                <CopyField label="Endpoint URL" value={`${baseUrl}/api/mcp`} />
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-1">Model Requirements</h3>
                                <p className="text-xs text-gray-500 mb-2">
                                    Get requirements and capabilities of the model.
                                </p>
                                <CopyField label="Endpoint URL" value={`${baseUrl}/api/modelRequirements`} />
                            </div>
                        </div>
                    </div>

                    {/* Agent Resources */}
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <HomeIcon className="w-5 h-5 text-gray-500" />
                            Agent Resources
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <Link
                                href={`/agents/${encodeURIComponent(agentName)}`}
                                className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all group bg-white"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                                        <MessageSquareIcon className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium text-gray-900">Chat with Agent</span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    Direct interface to converse with {agentProfile.meta.fullname || agentName}.
                                </p>
                            </Link>

                            <Link
                                href={`/agents/${encodeURIComponent(agentName)}/history`}
                                className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all group bg-white"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                                        <HistoryIcon className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium text-gray-900">History & Feedback</span>
                                </div>
                                <p className="text-sm text-gray-500">View past conversations and provide feedback.</p>
                            </Link>

                            <Link
                                href={`/agents/${encodeURIComponent(agentName)}/integration`}
                                className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all group bg-white"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-lg bg-green-50 text-green-600 group-hover:bg-green-100 transition-colors">
                                        <CodeIcon className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium text-gray-900">Integration Options</span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    Learn how to integrate this agent into your applications.
                                </p>
                            </Link>
                        </div>
                    </div>

                    {/* Ecosystem */}
                    <div className="p-6 bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <ShareIcon className="w-5 h-5 text-gray-500" />
                            Promptbook Ecosystem
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <a
                                href="https://promptbook.studio"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200 hover:border-gray-300 transition-colors"
                            >
                                <BookOpenIcon className="w-5 h-5 text-gray-400" />
                                <div>
                                    <div className="font-medium text-gray-900">Promptbook Studio</div>
                                    <div className="text-xs text-gray-500">Create and manage your own agents</div>
                                </div>
                            </a>

                            <a
                                href="https://github.com/webgptorg/promptbook"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200 hover:border-gray-300 transition-colors"
                            >
                                <CodeIcon className="w-5 h-5 text-gray-400" />
                                <div>
                                    <div className="font-medium text-gray-900">GitHub Repository</div>
                                    <div className="text-xs text-gray-500">Star us and contribute to the project</div>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
