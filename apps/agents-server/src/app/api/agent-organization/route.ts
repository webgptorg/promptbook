import { NextResponse } from 'next/server';
import { $getTableName } from '../../../database/$getTableName';
import { $provideSupabaseForServer } from '../../../database/$provideSupabaseForServer';
import type { AgentOrganizationUpdatePayload } from '../../../utils/agentOrganization/types';
import { loadAgentOrganizationState } from '../../../utils/agentOrganization/loadAgentOrganizationState';
import { getCurrentUser } from '../../../utils/getCurrentUser';
import { buildAgentNameOrIdFilter } from '@/src/utils/agentIdentifier';

/**
 * Returns the current active agent/folder organization snapshot for directory synchronization.
 *
 * @returns JSON payload with active agents and folders for the current user scope.
 */
export async function GET() {
    try {
        const { agents, folders } = await loadAgentOrganizationState({ status: 'ACTIVE' });

        return NextResponse.json(
            {
                success: true,
                agents,
                folders,
                syncedAt: new Date().toISOString(),
            },
            {
                headers: {
                    'Cache-Control': 'no-store, max-age=0',
                },
            },
        );
    } catch (error) {
        console.error('Failed to load agent organization snapshot', error);
        return NextResponse.json({ success: false, error: 'Failed to load organization snapshot.' }, { status: 500 });
    }
}

/**
 * Applies batch updates for agent and folder organization ordering.
 *
 * @param request - Incoming request with organization updates.
 * @returns JSON response confirming updates.
 */
export async function POST(request: Request) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    let payload: AgentOrganizationUpdatePayload;
    try {
        payload = await request.json();
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
    }
    if (!payload || typeof payload !== 'object') {
        return NextResponse.json({ success: false, error: 'Invalid update payload.' }, { status: 400 });
    }

    const supabase = $provideSupabaseForServer();
    const agentTable = await $getTableName('Agent');
    const folderTable = await $getTableName('AgentFolder');
    const updatedAt = new Date().toISOString();

    const folderUpdatesPayload = Array.isArray(payload.folders) ? payload.folders : [];
    if (folderUpdatesPayload.length) {
        const folderUpdates = folderUpdatesPayload.map(async (folder) => {
            const result = await supabase
                .from(folderTable)
                .update({ parentId: folder.parentId, sortOrder: folder.sortOrder, updatedAt })
                .eq('id', folder.id)
                .is('deletedAt', null);
            return result.error;
        });

        const errors = (await Promise.all(folderUpdates)).filter(Boolean);
        if (errors.length > 0) {
            return NextResponse.json({ success: false, error: errors[0]?.message || 'Failed to update folders.' }, { status: 500 });
        }
    }

    const agentUpdatesPayload = Array.isArray(payload.agents) ? payload.agents : [];
    if (agentUpdatesPayload.length) {
        const agentUpdates = agentUpdatesPayload.map(async (agent) => {
            const result = await supabase
                .from(agentTable)
                .update({ folderId: agent.folderId, sortOrder: agent.sortOrder })
                .or(buildAgentNameOrIdFilter(agent.identifier))
                .is('deletedAt', null);
            return result.error;
        });

        const errors = (await Promise.all(agentUpdates)).filter(Boolean);
        if (errors.length > 0) {
            return NextResponse.json({ success: false, error: errors[0]?.message || 'Failed to update agents.' }, { status: 500 });
        }
    }

    return NextResponse.json({ success: true });
}
