import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { createAgentWithDefaultVisibility } from '@/src/utils/createAgentWithDefaultVisibility';
import { resolveCurrentUserIdentity } from '@/src/utils/currentUserIdentity';
import { NotFoundError } from '@promptbook-local/core';
import { TODO_any } from '@promptbook-local/types';
import { NextResponse } from 'next/server';
import { string_book } from '../../../../../../../../src/book-2.0/agent-source/string_book';
import type { string_agent_name, string_agent_permanent_id } from '../../../../../../../../src/types/typeAliases';

/**
 * Agent row projection used to resolve folder placement while cloning.
 */
type AgentFolderLookupRow = {
    readonly folderId: number | null;
};

/**
 * Resolves the source agent folder so clone placement defaults to the same directory.
 *
 * If folder lookup fails, cloning continues in the root folder to preserve existing behavior.
 *
 * @param agentPermanentId - Permanent identifier of the source agent.
 * @returns Folder id of the source agent, or `null` for root.
 */
async function resolveSourceAgentFolderId(agentPermanentId: string_agent_permanent_id): Promise<number | null> {
    const supabase = $provideSupabaseForServer();
    const agentTable = await $getTableName('Agent');
    const folderResult = await supabase
        .from(agentTable)
        .select('folderId')
        .eq('permanentId', agentPermanentId)
        .is('deletedAt', null)
        .limit(1);

    if (folderResult.error) {
        console.warn('Failed to resolve source agent folder during cloning:', folderResult.error.message);
        return null;
    }

    if (!Array.isArray(folderResult.data) || folderResult.data.length === 0) {
        return null;
    }

    const row = folderResult.data[0] as AgentFolderLookupRow;
    return row.folderId ?? null;
}

/**
 * Clones an agent and creates the clone with a new name.
 *
 * The clone defaults to the same folder as the source agent.
 */
export async function POST(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    const { agentName } = await params;
    const collection = await $provideAgentCollectionForServer();
    const currentUserIdentity = await resolveCurrentUserIdentity();

    try {
        const requestBody = (await request.json().catch(() => ({}))) as { name?: unknown };
        const providedName = typeof requestBody.name === 'string' ? requestBody.name.trim() : '';
        const hasCustomName = Boolean(providedName);

        const agentId = await collection.getAgentPermanentId(agentName);
        const source = await collection.getAgentSource(agentId);
        const sourceFolderId = await resolveSourceAgentFolderId(agentId);

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

        const newAgent = await createAgentWithDefaultVisibility(collection, newSource, {
            folderId: sourceFolderId,
            userId: currentUserIdentity?.userId,
        });

        return NextResponse.json(newAgent);
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as TODO_any)?.message || 'Failed to clone agent' },
            { status: 500 },
        );
    }
}
