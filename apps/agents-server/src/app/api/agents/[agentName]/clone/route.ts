import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { createAgentWithDefaultVisibility } from '@/src/utils/createAgentWithDefaultVisibility';
import { NotFoundError } from '@promptbook-local/core';
import { TODO_any } from '@promptbook-local/types';
import { NextResponse } from 'next/server';
import { string_book } from '../../../../../../../../src/book-2.0/agent-source/string_book';
import type { string_agent_name } from '../../../../../../../../src/types/typeAliases';

export async function POST(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    const { agentName } = await params;
    const collection = await $provideAgentCollectionForServer();

    try {
        const requestBody = (await request.json().catch(() => ({}))) as { name?: unknown };
        const providedName = typeof requestBody.name === 'string' ? requestBody.name.trim() : '';
        const hasCustomName = Boolean(providedName);

        const agentId = await collection.getAgentPermanentId(agentName);
        const source = await collection.getAgentSource(agentId);

        const doesAgentNameExist = async (candidate: string) => {
            try {
                await collection.getAgentPermanentId(candidate as string_agent_name);
                return true;
            } catch (error) {
                if (error instanceof NotFoundError) {
                    return false;
                }
                throw error;
            }
        };

        let newAgentName: string;
        if (hasCustomName) {
            newAgentName = providedName;
        } else {
            let counter = 1;
            newAgentName = `${agentName} (Copy)`;
            while (await doesAgentNameExist(newAgentName)) {
                counter++;
                newAgentName = `${agentName} (Copy ${counter})`;
            }
        }

        const lines = source.split(/\r?\n/);
        lines[0] = newAgentName;
        const newSource = lines.join('\n') as string_book;

        const newAgent = await createAgentWithDefaultVisibility(collection, newSource);

        return NextResponse.json(newAgent);
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as TODO_any)?.message || 'Failed to clone agent' },
            { status: 500 },
        );
    }
}
