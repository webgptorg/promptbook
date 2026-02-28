import { NextRequest, NextResponse } from 'next/server';
import {
    CustomStylesheetValidationError,
    deleteCustomStylesheetFile,
    listCustomStylesheets,
    MAX_CUSTOM_STYLESHEET_LENGTH,
    saveCustomStylesheetFile,
} from '../../../database/customStylesheet';
import { isUserAdmin } from '../../../utils/isUserAdmin';

/**
 * Serialized custom stylesheet file returned by the API.
 */
type CustomStylesheetFilePayload = {
    id: number;
    scope: string;
    css: string;
    createdAt: string;
    updatedAt: string | null;
};

/**
 * API payload returned by `GET /api/custom-css`.
 */
type CustomCssReadResponse = {
    files: CustomStylesheetFilePayload[];
    maxLength: number;
    error?: string;
};

/**
 * API payload returned by `POST`/`PUT /api/custom-css`.
 */
type CustomCssSaveResponse = {
    file: CustomStylesheetFilePayload;
    maxLength: number;
    error?: string;
};

/**
 * API payload returned by `DELETE /api/custom-css`.
 */
type CustomCssDeleteResponse = {
    success: true;
    error?: string;
};

/**
 * Lists saved stylesheets.
 */
export async function GET() {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const files = await listCustomStylesheets();
        return NextResponse.json<CustomCssReadResponse>({
            files,
            maxLength: MAX_CUSTOM_STYLESHEET_LENGTH,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to load custom stylesheet',
            },
            { status: 500 },
        );
    }
}

/**
 * Creates a new stylesheet file.
 */
export async function POST(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json()) as { scope?: unknown; css?: unknown };
        const scope = typeof body.scope === 'string' ? body.scope : '';
        const css = typeof body.css === 'string' ? body.css : '';

        const savedFile = await saveCustomStylesheetFile({ scope, css });

        return NextResponse.json<CustomCssSaveResponse>({
            file: savedFile,
            maxLength: MAX_CUSTOM_STYLESHEET_LENGTH,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save custom stylesheet';
        const status = error instanceof CustomStylesheetValidationError ? 400 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

/**
 * Updates an existing stylesheet file.
 */
export async function PUT(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json()) as { id?: unknown; scope?: unknown; css?: unknown };
        const rawId = typeof body.id === 'number' ? body.id : typeof body.id === 'string' ? Number(body.id) : undefined;
        const id = Number.isFinite(rawId) ? rawId : undefined;
        const scope = typeof body.scope === 'string' ? body.scope : '';
        const css = typeof body.css === 'string' ? body.css : '';

        if (!id) {
            return NextResponse.json({ error: 'File ID is required for updates.' }, { status: 400 });
        }

        const savedFile = await saveCustomStylesheetFile({ id, scope, css });

        return NextResponse.json<CustomCssSaveResponse>({
            file: savedFile,
            maxLength: MAX_CUSTOM_STYLESHEET_LENGTH,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save custom stylesheet';
        const status = error instanceof CustomStylesheetValidationError ? 400 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

/**
 * Deletes a stylesheet file.
 */
export async function DELETE(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json()) as { id?: unknown };
        const rawId = typeof body.id === 'number' ? body.id : typeof body.id === 'string' ? Number(body.id) : undefined;
        const id = Number.isFinite(rawId) ? rawId : undefined;

        if (!id) {
            return NextResponse.json({ error: 'File ID is required for deletion.' }, { status: 400 });
        }

        await deleteCustomStylesheetFile(id);

        return NextResponse.json<CustomCssDeleteResponse>({ success: true });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to delete custom stylesheet',
            },
            { status: 500 },
        );
    }
}
