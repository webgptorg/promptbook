// DELETE /api/agents/[agentName]
import { NextResponse } from 'next/server';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';

export async function DELETE(request: Request, { params }: { params: { agentName: string } }) {
    const { agentName } = params;
    const collection = await $provideAgentCollectionForServer();

    try {
        await collection.deleteAgent(agentName);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: (error as any)?.message || 'Failed to delete agent' }, { status: 500 });
    }
}
