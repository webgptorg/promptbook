'use server';

import { NEXT_PUBLIC_SITE_URL } from '@/config';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { generatePlaceholderAgentProfileImageUrl } from '@promptbook-local/core';
import { ArrowLeftIcon, FileTextIcon } from 'lucide-react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { getAgentName, getAgentProfile } from '../_utils';
import { generateAgentMetadata } from '../generateAgentMetadata';

export const generateMetadata = generateAgentMetadata;

export default async function AgentSystemMessagePage({ params }: { params: Promise<{ agentName: string }> }) {
    $sideEffect(headers());
    const agentName = await getAgentName(params);

    let agentProfile;
    let agentSource;
    try {
        agentProfile = await getAgentProfile(agentName);
        const collection = await $provideAgentCollectionForServer();
        agentSource = await collection.getAgentSource(agentName);
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

    // For now, we'll display the agent source as the system message
    // TODO: [🧠] This might need to be the actual generated system message from the Agent class
    const systemMessage = agentSource || 'No system message available';

    return (
        <div className="min-h-screen p-6 md:p-12 flex flex-col items-center bg-gray-50">
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center gap-4">
                    {agentProfile.meta.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={
                                agentProfile.meta.image ||
                                generatePlaceholderAgentProfileImageUrl(
                                    agentProfile.permanentId || agentName,
                                    NEXT_PUBLIC_SITE_URL,
                                )
                            }
                            alt={agentProfile.meta.fullname || agentName}
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                        />
                    )}
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900">{agentProfile.meta.fullname || agentName}</h1>
                        <p className="text-gray-500 flex items-center gap-2">
                            <FileTextIcon className="w-4 h-4" />
                            System Message
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

                <div className="p-6">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-3">Generated System Message</h2>
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-white p-4 rounded border border-gray-200 overflow-x-auto">
                            {systemMessage}
                        </pre>
                    </div>

                    <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <h3 className="text-md font-semibold text-blue-900 mb-2">Model Requirements</h3>
                        <div className="text-sm text-blue-800">
                            <p>
                                <strong>Model Variant:</strong> CHAT
                            </p>
                            {/* TODO: [🧠] Add more model requirements if available */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
