import { NextResponse } from 'next/server';
import { $getTableName } from '../../../../../database/$getTableName';
import { $provideSupabaseForServer } from '../../../../../database/$provideSupabaseForServer';
import {
    buildFolderTree,
    collectAncestorFolderIds,
    collectDescendantFolderIds,
} from '../../../../../utils/agentOrganization/folderTree';
import { getCurrentUser } from '../../../../../utils/getCurrentUser';

/**
 * Restores a deleted folder and its contents from the recycle bin.
 *
 * @param request - Incoming request.
 * @param params - Route params containing the folder id.
 * @returns JSON response confirming restoration.
 */
export async function POST(request: Request, { params }: { params: Promise<{ folderId: string }> }) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const { folderId } = await params;
    const numericFolderId = Number(folderId);
    if (Number.isNaN(numericFolderId)) {
        return NextResponse.json({ success: false, error: 'Invalid folder id.' }, { status: 400 });
    }

    const supabase = $provideSupabaseForServer();
    const folderTable = await $getTableName('AgentFolder');
    const agentTable = await $getTableName('Agent');

    const folderResult = await supabase.from(folderTable).select('id, parentId, deletedAt');
    if (folderResult.error) {
        return NextResponse.json({ success: false, error: folderResult.error.message }, { status: 500 });
    }

    const { folderById, childrenByParentId } = buildFolderTree(folderResult.data || []);
    const descendantIds = collectDescendantFolderIds(numericFolderId, childrenByParentId);
    const ancestorIds = collectAncestorFolderIds(numericFolderId, folderById);
    const folderIdsToRestore = Array.from(new Set([...descendantIds, ...ancestorIds]));

    const folderRestoreResult = await supabase
        .from(folderTable)
        .update({ deletedAt: null })
        .in('id', folderIdsToRestore)
        .not('deletedAt', 'is', null);

    if (folderRestoreResult.error) {
        return NextResponse.json({ success: false, error: folderRestoreResult.error.message }, { status: 500 });
    }

    const agentRestoreResult = await supabase
        .from(agentTable)
        .update({ deletedAt: null })
        .in('folderId', descendantIds)
        .not('deletedAt', 'is', null);

    if (agentRestoreResult.error) {
        return NextResponse.json({ success: false, error: agentRestoreResult.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
