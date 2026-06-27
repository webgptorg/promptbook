import { AuthenticationError, DatabaseError, ParseError, UnexpectedError } from '@promptbook-local/core';
import { NextResponse } from 'next/server';
import {
    importAgentsFromFiles,
    type AgentsImportConflictResolution,
    type AgentsImportFile,
} from '../../../../utils/agentsTransfer/importAgentsFromFiles';
import { isUserAdmin } from '../../../../utils/isUserAdmin';

/**
 * This route is always dynamic because it depends on live DB state and auth.
 */
export const dynamic = 'force-dynamic';

/**
 * ZIP parsing and database writes require the Node.js runtime.
 */
export const runtime = 'nodejs';

/**
 * Form field containing uploaded book or ZIP files.
 */
const FILES_FORM_FIELD = 'files';

/**
 * Form field containing the optional target folder id.
 */
const TARGET_FOLDER_ID_FORM_FIELD = 'targetFolderId';

/**
 * Form field containing duplicate conflict handling.
 */
const CONFLICT_RESOLUTION_FORM_FIELD = 'conflictResolution';

/**
 * Default duplicate conflict handling.
 */
const DEFAULT_CONFLICT_RESOLUTION: AgentsImportConflictResolution = 'ASK';

/**
 * Imports `.book` files and ZIP archives into the current Agents Server.
 *
 * @param request - Multipart request containing one or more files.
 * @returns Import summary or duplicate-conflict response.
 */
export async function POST(request: Request) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const files = await readImportFilesFromFormData(formData);
        const result = await importAgentsFromFiles({
            files,
            targetFolderId: parseImportTargetFolderId(formData.get(TARGET_FOLDER_ID_FORM_FIELD)),
            conflictResolution: parseImportConflictResolution(formData.get(CONFLICT_RESOLUTION_FORM_FIELD)),
        });

        if (result.conflicts.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    code: 'agent_import_conflicts',
                    message: 'Some dropped books have the same agent name as existing agents but different book source.',
                    ...result,
                },
                { status: 409 },
            );
        }

        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        return createAgentsImportErrorResponse(error);
    }
}

/**
 * Reads uploaded files from multipart form data.
 *
 * @param formData - Parsed multipart form data.
 * @returns Import files with binary content.
 */
async function readImportFilesFromFormData(formData: FormData): Promise<Array<AgentsImportFile>> {
    const files = formData.getAll(FILES_FORM_FIELD).filter(isUploadedFileLike);

    if (files.length === 0) {
        throw new ParseError('No files were uploaded.');
    }

    return Promise.all(
        files.map(async (file) => ({
            name: file.name,
            content: await file.arrayBuffer(),
        })),
    );
}

/**
 * Checks whether a form value behaves like an uploaded file.
 *
 * @param value - Form data value.
 * @returns `true` when the value has a file name and content reader.
 */
function isUploadedFileLike(value: FormDataEntryValue): value is File {
    return typeof value !== 'string' && typeof value.name === 'string' && typeof value.arrayBuffer === 'function';
}

/**
 * Parses the optional target folder form field.
 *
 * @param value - Raw form field value.
 * @returns Target folder id or `null` for root.
 */
function parseImportTargetFolderId(value: FormDataEntryValue | null): number | null {
    if (value === null || value === '' || value === 'null') {
        return null;
    }

    if (typeof value !== 'string') {
        throw new ParseError('Invalid target folder id.');
    }

    const parsedValue = Number(value);
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        throw new ParseError('Invalid target folder id.');
    }

    return parsedValue;
}

/**
 * Parses duplicate conflict handling from the import form.
 *
 * @param value - Raw form field value.
 * @returns Conflict resolution mode.
 */
function parseImportConflictResolution(value: FormDataEntryValue | null): AgentsImportConflictResolution {
    if (value === 'SKIP' || value === 'DUPLICATE' || value === 'ASK') {
        return value;
    }

    return DEFAULT_CONFLICT_RESOLUTION;
}

/**
 * Maps branded import errors into HTTP JSON responses.
 *
 * @param error - Unknown thrown error.
 * @returns JSON error response.
 */
function createAgentsImportErrorResponse(error: unknown): NextResponse {
    if (error instanceof AuthenticationError) {
        return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    if (error instanceof ParseError) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    if (error instanceof DatabaseError || error instanceof UnexpectedError) {
        console.error('Agents import error:', error);
        return NextResponse.json({ success: false, error: 'Failed to import agents.' }, { status: 500 });
    }

    console.error('Agents import error:', error);
    return NextResponse.json({ success: false, error: 'Failed to import agents.' }, { status: 500 });
}
