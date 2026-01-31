import { NextResponse } from 'next/server';
import { $getTableName } from '../../../../database/$getTableName';
import { $provideSupabaseForServer } from '../../../../database/$provideSupabaseForServer';
import { buildFolderTree, collectDescendantFolderIds } from '../../../../utils/agentOrganization/folderTree';
import { getCurrentUser } from '../../../../utils/getCurrentUser';

/**
 * Renames an existing folder.
 *
 * @param request - Incoming request with updated folder name.
 * @param params - Route params containing the folder id.
 * @returns JSON response with the updated folder.
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

    let payload: { name?: string };
    try {
        payload = await request.json();
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const name = (payload.name || '').trim();
    if (!name) {
        return NextResponse.json({ success: false, error: 'Folder name is required.' }, { status: 400 });
    }

    if (name.includes('/')) {
        return NextResponse.json({ success: false, error: 'Folder name cannot include "/".' }, { status: 400 });
    }

    const supabase = $provideSupabaseForServer();
    const folderTable = await $getTableName('AgentFolder');

    const updateResult = await supabase
        .from(folderTable)
        .update({ name, updatedAt: new Date().toISOString() })
        .eq('id', numericFolderId)
        .is('deletedAt', null)
        .select('id, name, parentId, sortOrder')
        .single();

    if (updateResult.error || !updateResult.data) {
        return NextResponse.json(
            { success: false, error: updateResult.error?.message || 'Failed to rename folder.' },
            { status: 500 },
        );
    }

    return NextResponse.json({ success: true, folder: updateResult.data });
}

/**
 * Deletes a folder and moves its contents to the recycle bin.
 *
 * @param request - Incoming request.
 * @param params - Route params containing the folder id.
 * @returns JSON response confirming deletion.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ folderId: string }> }) {
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

    const { childrenByParentId } = buildFolderTree(folderResult.data || []);
    const descendantFolderIds = collectDescendantFolderIds(numericFolderId, childrenByParentId);
    const deletionTimestamp = new Date().toISOString();

    const folderUpdateResult = await supabase
        .from(folderTable)
        .update({ deletedAt: deletionTimestamp })
        .in('id', descendantFolderIds)
        .is('deletedAt', null);

    if (folderUpdateResult.error) {
        return NextResponse.json({ success: false, error: folderUpdateResult.error.message }, { status: 500 });
    }

    const agentUpdateResult = await supabase
        .from(agentTable)
        .update({ deletedAt: deletionTimestamp })
        .in('folderId', descendantFolderIds)
        .is('deletedAt', null);

    if (agentUpdateResult.error) {
        return NextResponse.json({ success: false, error: agentUpdateResult.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
