import { NextResponse } from 'next/server';
import { ConflictError } from '@promptbook-local/core';
import { $getTableName } from '../../../database/$getTableName';
import { $provideSupabaseForServer } from '../../../database/$provideSupabaseForServer';
import { getCurrentUser } from '../../../utils/getCurrentUser';
import { parseFolderColor, parseFolderIcon } from '../../../utils/agentOrganization/folderAppearance';
import { translateSupabaseUniqueConstraintError } from '../../../../../../src/utils/database/uniqueConstraint';

/**
 * Creates a new agent folder under the provided parent.
 *
 * @param request - Incoming request with folder details.
 * @returns JSON response with the created folder.
 */
export async function POST(request: Request) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    let payload: { name?: string; parentId?: number | null; icon?: unknown; color?: unknown };
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

    const parentId = payload.parentId ?? null;
    if (parentId !== null && Number.isNaN(Number(parentId))) {
        return NextResponse.json({ success: false, error: 'Invalid parent folder id.' }, { status: 400 });
    }
    const normalizedParentId = parentId === null ? null : Number(parentId);
    const parsedIcon = parseFolderIcon(payload.icon);
    if (payload.icon !== undefined && parsedIcon === undefined) {
        return NextResponse.json({ success: false, error: 'Invalid folder icon.' }, { status: 400 });
    }
    const parsedColor = parseFolderColor(payload.color);
    if (payload.color !== undefined && parsedColor === undefined) {
        return NextResponse.json({ success: false, error: 'Invalid folder color.' }, { status: 400 });
    }

    const supabase = $provideSupabaseForServer();
    const folderTable = await $getTableName('AgentFolder');

    const sortOrderQuery = supabase
        .from(folderTable)
        .select('sortOrder')
        .is('deletedAt', null)
        .order('sortOrder', { ascending: false })
        .limit(1);
    const sortOrderResult =
        normalizedParentId === null
            ? await sortOrderQuery.is('parentId', null).maybeSingle()
            : await sortOrderQuery.eq('parentId', normalizedParentId).maybeSingle();

    if (sortOrderResult.error) {
        return NextResponse.json({ success: false, error: sortOrderResult.error.message }, { status: 500 });
    }

    const nextSortOrder = (sortOrderResult.data?.sortOrder ?? 0) + 1;

    const insertResult = await supabase
        .from(folderTable)
        .insert({
            name,
            parentId: normalizedParentId,
            sortOrder: nextSortOrder,
            icon: parsedIcon ?? null,
            color: parsedColor ?? null,
            createdAt: new Date().toISOString(),
            updatedAt: null,
        })
        .select('id, name, parentId, sortOrder, icon, color')
        .single();

    if (insertResult.error || !insertResult.data) {
        const conflictError = translateSupabaseUniqueConstraintError(insertResult.error, [
            {
                suffix: 'AgentFolder_parent_name_key',
                buildError: () =>
                    new ConflictError(
                        `Folder name "${name}" already exists at this level. Pick another name and try again.`,
                    ),
            },
        ]);

        if (conflictError) {
            return NextResponse.json({ success: false, error: conflictError.message }, { status: 409 });
        }

        return NextResponse.json(
            { success: false, error: insertResult.error?.message || 'Failed to create folder.' },
            { status: 500 },
        );
    }

    return NextResponse.json({ success: true, folder: insertResult.data });
}
