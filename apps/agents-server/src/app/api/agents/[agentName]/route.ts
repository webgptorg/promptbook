// DELETE /api/agents/[agentName]
// PATCH /api/agents/[agentName] - update agent visibility
// POST /api/agents/[agentName]/restore - restore deleted agent
import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { renameAgentSource } from '@/src/utils/renameAgentSource';
import { isAgentVisibility, type AgentVisibility } from '@/src/utils/agentVisibility';
import { parseAgentSource } from '@promptbook-local/core';
import { TODO_any } from '@promptbook-local/types';
import { NextResponse } from 'next/server';
import { buildAgentNameOrIdFilter } from '@/src/utils/agentIdentifier';

export async function PATCH(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    const { agentName } = await params;

    try {
        const body = (await request.json()) as { visibility?: AgentVisibility; name?: string };

        if (typeof body.name === 'string') {
            const trimmedName = body.name.trim();
            if (!trimmedName) {
                return NextResponse.json({ success: false, error: 'Agent name cannot be empty.' }, { status: 400 });
            }

            const collection = await $provideAgentCollectionForServer();
            const agentId = await collection.getAgentPermanentId(agentName);
            const agentSource = await collection.getAgentSource(agentId);
            const nextAgentSource = renameAgentSource(agentSource, trimmedName);
            const nextAgentProfile = parseAgentSource(nextAgentSource);

            await collection.updateAgentSource(agentId, nextAgentSource);

            return NextResponse.json({
                success: true,
                agent: { ...nextAgentProfile, permanentId: agentId },
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
            .or(buildAgentNameOrIdFilter(agentName))
            .is('deletedAt', null);

        if (updateResult.error) {
            return NextResponse.json({ success: false, error: updateResult.error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as TODO_any)?.message || 'Failed to update agent visibility' },
            { status: 500 },
        );
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    const { agentName } = await params;
    const collection = await $provideAgentCollectionForServer();

    try {
        const agentId = await collection.getAgentPermanentId(agentName);
        await collection.deleteAgent(agentId);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as TODO_any)?.message || 'Failed to delete agent' },
            { status: 500 },
        );
    }
}
