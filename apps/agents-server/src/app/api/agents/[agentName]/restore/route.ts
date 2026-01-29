// POST /api/agents/[agentName]/restore - restore deleted agent
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { TODO_any } from '@promptbook-local/types';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    const { agentName } = await params;
    const collection = await $provideAgentCollectionForServer();

    try {
        const agentId = await collection.getAgentPermanentId(agentName);
        await collection.restoreAgent(agentId);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as TODO_any)?.message || 'Failed to restore agent' },
            { status: 500 },
        );
    }
}
