import { NextResponse } from 'next/server';
import { $getTableName } from '../../../../../database/$getTableName';
import { $provideSupabaseForServer } from '../../../../../database/$provideSupabaseForServer';
import {
    buildFolderTree,
    collectDescendantFolderIds,
} from '../../../../../utils/agentOrganization/folderTree';
import { isAgentVisibility } from '../../../../../utils/agentVisibility';
import { getCurrentUser } from '../../../../../utils/getCurrentUser';

/**
 * Updates visibility for all active agents inside a folder subtree.
 *
 * @param request - Incoming request containing target visibility.
 * @param params - Route params containing folder id.
 * @returns JSON response confirming updated visibility.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ folderId: string }> }) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const { folderId } = await params;
    const numericFolderId = Number(folderId);
    if (Number.isNaN(numericFolderId)) {
        return NextResponse.json({ success: false, error: 'Invalid folder id.' }, { status: 400 });
    }

    let payload: { visibility?: unknown };
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const visibility = payload?.visibility;
    if (!isAgentVisibility(visibility)) {
        return NextResponse.json(
            { success: false, error: 'Invalid visibility value. Must be PRIVATE, UNLISTED, or PUBLIC.' },
            { status: 400 },
        );
    }

    const supabase = $provideSupabaseForServer();
    const folderTable = await $getTableName('AgentFolder');
    const agentTable = await $getTableName('Agent');

    const folderResult = await supabase.from(folderTable).select('id, parentId, deletedAt');
    if (folderResult.error) {
        return NextResponse.json({ success: false, error: folderResult.error.message }, { status: 500 });
    }

    const folderRows = folderResult.data || [];
    const targetFolder = folderRows.find((folder) => folder.id === numericFolderId && folder.deletedAt === null);
    if (!targetFolder) {
        return NextResponse.json({ success: false, error: 'Folder not found.' }, { status: 404 });
    }

    const { childrenByParentId } = buildFolderTree(folderRows);
    const descendantFolderIds = collectDescendantFolderIds(numericFolderId, childrenByParentId);

    const updateResult = await supabase
        .from(agentTable)
        .update({ visibility })
        .in('folderId', descendantFolderIds)
        .is('deletedAt', null);

    if (updateResult.error) {
        return NextResponse.json({ success: false, error: updateResult.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
