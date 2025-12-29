'use server';

import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideServer } from '@/src/tools/$provideServer';
import { resolveInheritedAgentSource } from '@/src/utils/resolveInheritedAgentSource';
import { CodePreview } from '@common/components/CodePreview/CodePreview';
import { BookEditor } from '@promptbook-local/components';
import {
    createAgentModelRequirements,
    generatePlaceholderAgentProfileImageUrl,
    parseAgentSource,
} from '@promptbook-local/core';
import { TODO_any } from '@promptbook-local/types';
import { ArrowLeftIcon, FileTextIcon } from 'lucide-react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { getAgentName } from '../_utils';
import { generateAgentMetadata } from '../generateAgentMetadata';

export const generateMetadata = generateAgentMetadata;

export default async function AgentSystemMessagePage({ params }: { params: Promise<{ agentName: string }> }) {
    $sideEffect(headers());

    const { publicUrl } = await $provideServer();
    const agentName = await getAgentName(params);

    const collection = await $provideAgentCollectionForServer();
    const agentSource = await collection.getAgentSource(agentName);
    const effectiveAgentSource = await resolveInheritedAgentSource(agentSource);
    const modelRequirements = await createAgentModelRequirements(effectiveAgentSource);
    const agentProfile = parseAgentSource(agentSource);
    const { systemMessage, ...modelRequirementsRest } = modelRequirements;

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
                                    publicUrl,
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
                            Generated paraemeters for model and AI tools
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
                        <h2 className="text-lg font-semibold text-gray-900 mb-3">
                            {agentProfile.meta.fullname} System Message
                        </h2>
                        <BookEditor isReadonly value={systemMessage as TODO_any} />
                        {/* <- Note: The system message should not be shown in BookEditor but in its separate component, but its ok for now */}
                    </div>

                    <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <h3 className="text-md font-semibold text-blue-900 mb-2">
                            {agentProfile.meta.fullname} Model Requirements
                        </h3>
                        <div className="text-sm text-blue-800">
                            <CodePreview
                                code={(
                                    JSON.stringify(
                                        {
                                            systemMessage: `[look ☝ above]`,
                                            ...modelRequirementsRest,
                                        },
                                        null,
                                        4,
                                    ) + '\n'
                                ).replace(`"[look ☝ above]"`, `/* [look ☝ above] */`)}
                                language="json"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
