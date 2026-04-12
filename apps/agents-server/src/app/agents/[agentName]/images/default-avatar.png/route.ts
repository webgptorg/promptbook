import { createHash } from 'crypto';
import { getSingleLlmExecutionTools } from '@promptbook-local/core';
import { serializeError } from '@promptbook-local/utils';
import { NextRequest, NextResponse } from 'next/server';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideExecutionToolsForServer } from '@/src/tools/$provideExecutionToolsForServer';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { resolveServerAgentContext } from '@/src/utils/resolveServerAgentContext';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import { ensureAgentDefaultAvatarParameters } from '../../../../../utils/agentDefaultAvatar/ensureAgentDefaultAvatarParameters';
import {
    computeAgentDefaultAvatarFingerprint,
    generateAgentDefaultAvatarParameters,
} from '../../../../../utils/agentDefaultAvatar/generateAgentDefaultAvatarParameters';
import { renderAgentDefaultAvatarPng } from '../../../../../utils/agentDefaultAvatar/renderAgentDefaultAvatarPng';

/**
 * Handles get.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ agentName: string }> }) {
    try {
        let { agentName } = await params;
        agentName = decodeURIComponent(agentName);

        if (!agentName) {
            return NextResponse.json({ error: 'Agent name is required' }, { status: 400 });
        }

        const collection = await $provideAgentCollectionForServer();
        const baseAgentReferenceResolver = await $provideAgentReferenceResolver();
        const resolvedAgentContext = await resolveServerAgentContext({
            collection,
            agentIdentifier: agentName,
            localServerUrl: new URL(request.url).origin,
            fallbackResolver: baseAgentReferenceResolver,
        });
        const agentProfile = resolvedAgentContext.resolvedAgentProfile;
        const agentSource = resolvedAgentContext.resolvedAgentSource;
        const agentFingerprint = computeAgentDefaultAvatarFingerprint(agentSource);
        const executionTools = await $provideExecutionToolsForServer();
        const llmTools = getSingleLlmExecutionTools(executionTools.llm);

        const parametersRecord = await ensureAgentDefaultAvatarParameters({
            agent: agentProfile,
            agentFingerprint,
            createParameters: async () =>
                generateAgentDefaultAvatarParameters({
                    llmTools,
                    agent: agentProfile,
                    agentSource,
                    agentFingerprint,
                }),
        });
        const avatarPng = renderAgentDefaultAvatarPng(parametersRecord.parameters);
        const entityTag = `"${createHash('sha256').update(avatarPng).digest('hex')}"`;

        if (request.headers.get('if-none-match') === entityTag) {
            return new NextResponse(null, {
                status: 304,
                headers: {
                    ETag: entityTag,
                    'Cache-Control': 'public, max-age=0, must-revalidate',
                },
            });
        }

        return new NextResponse(avatarPng, {
            status: 200,
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=0, must-revalidate',
                ETag: entityTag,
            },
        });
    } catch (error) {
        assertsError(error);
        console.error('Error serving default avatar:', error);
        return new Response(JSON.stringify(serializeError(error), null, 4), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
