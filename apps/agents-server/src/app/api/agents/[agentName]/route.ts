// DELETE /api/agents/[agentName]
// PATCH /api/agents/[agentName] - update agent visibility
// POST /api/agents/[agentName]/restore - restore deleted agent
import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { TODO_any } from '@promptbook-local/types';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    const { agentName } = await params;

    try {
        const body = await request.json();
        const { visibility }: { visibility: 'PUBLIC' | 'PRIVATE' } = body;

        if (!visibility || !['PUBLIC', 'PRIVATE'].includes(visibility)) {
            return NextResponse.json(
                { success: false, error: 'Invalid visibility value. Must be PUBLIC or PRIVATE.' },
                { status: 400 },
            );
        }

        const supabase = $provideSupabaseForServer();
        // const { tablePrefix } = await $provideServer();

        const updateResult = await supabase
            .from(await $getTableName(`Agent`))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update({ visibility } as any)
            .or(`agentName.eq.${agentName},permanentId.eq.${agentName}`)
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
