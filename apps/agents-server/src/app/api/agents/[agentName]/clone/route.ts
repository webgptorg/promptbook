import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { TODO_any } from '@promptbook-local/types';
import { NextResponse } from 'next/server';
import { string_book } from '../../../../../../../../src/book-2.0/agent-source/string_book';

export async function POST(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    const { agentName } = await params;
    const collection = await $provideAgentCollectionForServer();

    try {
        const agentId = await collection.getAgentIdByName(agentName);
        const source = await collection.getAgentSource(agentId);

        // Generate new name
        // TODO: [🧠] Better naming strategy, maybe check for collisions
        let newAgentName = `${agentName} (Copy)`;
        let counter = 1;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                await collection.getAgentIdByName(newAgentName);
                // If success, it means it exists, so we try next one
                counter++;
                newAgentName = `${agentName} (Copy ${counter})`;
            } catch (error) {
                // If error, it likely means it does not exist (NotFoundError), so we can use it
                // TODO: [🧠] Check if it is really NotFoundError
                break;
            }
        }

        const lines = source.split('\n');
        lines[0] = newAgentName;
        const newSource = lines.join('\n') as string_book;

        const newAgent = await collection.createAgent(newSource);

        return NextResponse.json(newAgent);
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as TODO_any)?.message || 'Failed to clone agent' },
            { status: 500 },
        );
    }
}
