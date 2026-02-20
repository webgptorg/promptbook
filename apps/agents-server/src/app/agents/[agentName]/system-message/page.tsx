'use server';

import { BackToAgentButton } from '@/src/components/BackToAgentButton/BackToAgentButton';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideServer } from '@/src/tools/$provideServer';
import { getWellKnownAgentUrl } from '@/src/utils/getWellKnownAgentUrl';
import { resolveInheritedAgentSource } from '@/src/utils/resolveInheritedAgentSource';
import { CodePreview } from '@common/components/CodePreview/CodePreview';
import { BookEditor } from '@promptbook-local/components';
import { createAgentModelRequirements } from '@promptbook-local/core';
import { TODO_any } from '@promptbook-local/types';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { consumeAgentReferenceResolutionIssues } from '@/src/utils/agentReferenceResolver/AgentReferenceResolutionIssue';
import { createInlineKnowledgeSourceUploader } from '@/src/utils/knowledge/createInlineKnowledgeSourceUploader';
import { FileTextIcon } from 'lucide-react';
import { headers } from 'next/headers';
import { resolveAgentAvatarImageUrl } from '../../../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { keepUnused } from '../../../../../../../src/utils/organization/keepUnused';
import { getAgentName, getAgentProfile } from '../_utils';
import { generateAgentMetadata } from '../generateAgentMetadata';

export const generateMetadata = generateAgentMetadata;

export default async function AgentSystemMessagePage({ params }: { params: Promise<{ agentName: string }> }) {
    $sideEffect(headers());

    const { publicUrl } = await $provideServer();
    const agentName = await getAgentName(params);

    const collection = await $provideAgentCollectionForServer();
    const agentSource = await collection.getAgentSource(agentName);
    const agentReferenceResolver = await $provideAgentReferenceResolver();
    const effectiveAgentSource = await resolveInheritedAgentSource(agentSource, {
        adamAgentUrl: await getWellKnownAgentUrl('ADAM'),
        agentReferenceResolver,
    });
    const modelRequirements = await createAgentModelRequirements(
        effectiveAgentSource,
        undefined,
        undefined,
        undefined,
        {
            agentReferenceResolver,
            inlineKnowledgeSourceUploader: createInlineKnowledgeSourceUploader(),
        },
    );
    const unresolvedAgentReferences = consumeAgentReferenceResolutionIssues(agentReferenceResolver);
    if (unresolvedAgentReferences.length > 0) {
        console.warn('[AgentSystemMessagePage] Unresolved agent references detected:', unresolvedAgentReferences);
    }
    const { _metadata, ...sanitizedModelRequirements } = modelRequirements;

    keepUnused(_metadata);

    const agentProfile = await getAgentProfile(agentName);
    const { systemMessage, ...modelRequirementsRest } = sanitizedModelRequirements;

    return (
        <div className="min-h-screen p-6 md:p-12 flex flex-col items-center bg-gray-50">
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={
                            resolveAgentAvatarImageUrl({ agent: agentProfile, baseUrl: publicUrl.href }) ||
                            `/agents/${encodeURIComponent(
                                agentProfile.permanentId || agentName,
                            )}/images/default-avatar.png`
                        }
                        alt={agentProfile.meta.fullname || agentName}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    />
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900">{agentProfile.meta.fullname || agentName}</h1>
                        <p className="text-gray-500 flex items-center gap-2">
                            <FileTextIcon className="w-4 h-4" />
                            Generated paraemeters for model and AI tools
                        </p>
                    </div>
                    <BackToAgentButton agentName={agentName} />
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
