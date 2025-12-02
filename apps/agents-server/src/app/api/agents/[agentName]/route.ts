// DELETE /api/agents/[agentName]
import { NextResponse } from 'next/server';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { TODO_any } from '@promptbook-local/types';

export async function DELETE(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    const { agentName } = await params;
    const collection = await $provideAgentCollectionForServer();

    try {
        await collection.deleteAgent(agentName);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: (error as TODO_any)?.message || 'Failed to delete agent' }, { status: 500 });
    }
}
