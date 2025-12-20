'use server';

import { $provideServer } from '@/src/tools/$provideServer';
import { generatePlaceholderAgentProfileImageUrl, PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { ArrowLeftIcon, CodeIcon, HomeIcon, LinkIcon, ShareIcon } from 'lucide-react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Color } from '../../../../../../../src/utils/color/Color';
import { withAlpha } from '../../../../../../../src/utils/color/operators/withAlpha';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { getAgentName, getAgentProfile } from '../_utils';
import { getAgentExternalLinks, getAgentLinks } from '../agentLinks';
import { CopyField } from '../CopyField';
import { generateAgentMetadata } from '../generateAgentMetadata';
import { NEXT_PUBLIC_SITE_URL } from '@/config';

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
                            src={agentProfile.meta.image || agentProfile.permanentId || generatePlaceholderAgentProfileImageUrl(agentName, NEXT_PUBLIC_SITE_URL)}
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
                                <CopyField label="Endpoint URL" value={`${baseUrl}/api/openai/v1/chat/completions`} />
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
                            {getAgentLinks(agentProfile.permanentId || agentName)
                                .filter((link) =>
                                    ['Chat with Agent', 'History & Feedback', 'Integration'].includes(link.title),
                                )
                                .map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all group bg-white"
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 rounded-lg bg-gray-50 text-gray-600 group-hover:bg-gray-100 transition-colors">
                                                <link.icon className="w-5 h-5" />
                                            </div>
                                            <span className="font-medium text-gray-900">{link.title}</span>
                                        </div>
                                        <p className="text-sm text-gray-500">{link.description}</p>
                                    </Link>
                                ))}
                        </div>
                    </div>

                    {/* Ecosystem */}
                    <div className="p-6 bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <ShareIcon className="w-5 h-5 text-gray-500" />
                            Promptbook Ecosystem
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            {getAgentExternalLinks().map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    target={link.target}
                                    rel={link.rel}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200 hover:border-gray-300 transition-colors"
                                >
                                    <link.icon className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <div className="font-medium text-gray-900">{link.title}</div>
                                        <div className="text-xs text-gray-500">{link.description}</div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
