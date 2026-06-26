// DELETE /api/agents/[agentName]
// PATCH /api/agents/[agentName] - update agent visibility
// POST /api/agents/[agentName]/restore - restore deleted agent
import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { renameAgentSource } from '@/src/utils/renameAgentSource';
import { isAgentVisibility, type AgentVisibility } from '@/src/utils/agentVisibility';
import { TODO_any, type string_book } from '@promptbook-local/types';
import { NextResponse } from 'next/server';
import { findAgentForCallerWriteAccess } from '@/src/utils/findAgentForCallerWriteAccess';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { resolveServerAgentContext } from '@/src/utils/resolveServerAgentContext';
import { invalidateCachedActiveOrganizationSnapshots } from '@/src/utils/agentOrganization/loadAgentOrganizationState';
import type { OwnedAgentRow } from '@/src/utils/agentOwnership';

/**
 * Resolves the stable identifier used when calling the agent collection.
 *
 * @param agent - Persisted agent row.
 * @returns Permanent id when available, otherwise the legacy agent name.
 */
function getAgentCollectionIdentifier(agent: OwnedAgentRow): string {
    return agent.permanentId || agent.agentName;
}

/**
 * Handles patch.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    const { agentName } = await params;

    try {
        if (!(await getCurrentUser())) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const targetAgent = await findAgentForCallerWriteAccess(agentName);
        if (!targetAgent || targetAgent.deletedAt) {
            return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 });
        }

        const body = (await request.json()) as { visibility?: AgentVisibility; name?: string };

        if (typeof body.name === 'string') {
            const trimmedName = body.name.trim();
            if (!trimmedName) {
                return NextResponse.json({ success: false, error: 'Agent name cannot be empty.' }, { status: 400 });
            }

            const collection = await $provideAgentCollectionForServer();
            const agentId = getAgentCollectionIdentifier(targetAgent);
            const nextAgentSource = renameAgentSource(targetAgent.agentSource as string_book, trimmedName);

            await collection.updateAgentSource(agentId, nextAgentSource);
            const baseAgentReferenceResolver = await $provideAgentReferenceResolver();
            const resolvedAgentContext = await resolveServerAgentContext({
                collection,
                agentIdentifier: agentId,
                localServerUrl: new URL(request.url).origin,
                fallbackResolver: baseAgentReferenceResolver,
            });
            invalidateCachedActiveOrganizationSnapshots();

            return NextResponse.json({
                success: true,
                agent: { ...resolvedAgentContext.resolvedAgentProfile, permanentId: agentId },
            });
        }

        const { visibility } = body;

        if (!isAgentVisibility(visibility)) {
            return NextResponse.json(
                { success: false, error: 'Invalid visibility value. Must be PRIVATE, UNLISTED, or PUBLIC.' },
                { status: 400 },
            );
        }

        const supabase = $provideSupabaseForServer();

        const updateResult = await supabase
            .from(await $getTableName(`Agent`))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update({ visibility } as any)
            .eq('id', targetAgent.id)
            .is('deletedAt', null);

        if (updateResult.error) {
            return NextResponse.json({ success: false, error: updateResult.error.message }, { status: 500 });
        }

        invalidateCachedActiveOrganizationSnapshots();

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as TODO_any)?.message || 'Failed to update agent visibility' },
            { status: 500 },
        );
    }
}

/**
 * Handles delete.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    const { agentName } = await params;

    try {
        if (!(await getCurrentUser())) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const targetAgent = await findAgentForCallerWriteAccess(agentName);
        if (!targetAgent || targetAgent.deletedAt) {
            return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 });
        }

        const collection = await $provideAgentCollectionForServer();
        await collection.deleteAgent(getAgentCollectionIdentifier(targetAgent));
        invalidateCachedActiveOrganizationSnapshots();
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as TODO_any)?.message || 'Failed to delete agent' },
            { status: 500 },
        );
    }
}
