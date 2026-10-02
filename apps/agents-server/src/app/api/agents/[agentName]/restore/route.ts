// POST /api/agents/[agentName]/restore - restore deleted agent
import { restoreAgentAndFolders } from '@/src/utils/agentOrganization/restoreAgentAndFolders';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { TODO_any } from '@promptbook-local/types';
import { NextResponse } from 'next/server';

/**
 * Restores a deleted agent and any missing parent folders.
 *
 * @param request - Incoming request.
 * @param params - Route params containing the agent name or permanent id.
 * @returns JSON response confirming restoration.
 */
export async function POST(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }
    const { agentName } = await params;

    try {
        await restoreAgentAndFolders(agentName);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as TODO_any)?.message || 'Failed to restore agent' },
            { status: 500 },
        );
    }
}
