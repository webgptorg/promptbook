import { NextRequest, NextResponse } from 'next/server';
import {
    CustomJavascriptValidationError,
    deleteCustomJavascriptFile,
    getCustomJavascriptFiles,
    saveCustomJavascriptFile,
    MAX_CUSTOM_JAVASCRIPT_LENGTH,
} from '../../../database/customJavascript';
import { isUserAdmin } from '../../../utils/isUserAdmin';

/**
 * Serialized custom JavaScript file returned by the API.
 * @private
 */
type CustomJavascriptFilePayload = {
    id: number;
    scope: string;
    javascript: string;
    createdAt: string;
    updatedAt: string | null;
};

/**
 * API payload returned by `GET /api/custom-js`.
 * @private
 */
type CustomJavascriptReadResponse = {
    files: CustomJavascriptFilePayload[];
    maxLength: number;
    error?: string;
};

/**
 * API payload returned by `POST`/`PUT /api/custom-js`.
 * @private
 */
type CustomJavascriptSaveResponse = {
    file: CustomJavascriptFilePayload;
    maxLength: number;
    error?: string;
};

/**
 * API payload returned by `DELETE /api/custom-js`.
 * @private
 */
type CustomJavascriptDeleteResponse = {
    success: true;
    error?: string;
};

/**
 * Returns currently configured global custom JavaScript files.
 * @private
 */
export async function GET() {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const files = await getCustomJavascriptFiles();

        return NextResponse.json<CustomJavascriptReadResponse>({
            files,
            maxLength: MAX_CUSTOM_JAVASCRIPT_LENGTH,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to load custom JavaScript.',
            },
            { status: 500 },
        );
    }
}

/**
 * Creates a new custom JavaScript file.
 * @private
 */
export async function POST(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json()) as { scope?: unknown; javascript?: unknown };
        const scope = typeof body.scope === 'string' ? body.scope : '';
        const javascript = typeof body.javascript === 'string' ? body.javascript : '';

        const savedFile = await saveCustomJavascriptFile({ scope, javascript });

        return NextResponse.json<CustomJavascriptSaveResponse>({
            file: savedFile,
            maxLength: MAX_CUSTOM_JAVASCRIPT_LENGTH,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save custom JavaScript.';
        const status = error instanceof CustomJavascriptValidationError ? 400 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

/**
 * Updates an existing custom JavaScript file.
 * @private
 */
export async function PUT(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json()) as { id?: unknown; scope?: unknown; javascript?: unknown };
        const rawId = typeof body.id === 'number' ? body.id : typeof body.id === 'string' ? Number(body.id) : undefined;
        const id = Number.isFinite(rawId) ? rawId : undefined;
        const scope = typeof body.scope === 'string' ? body.scope : '';
        const javascript = typeof body.javascript === 'string' ? body.javascript : '';

        if (!id) {
            return NextResponse.json({ error: 'File ID is required for updates.' }, { status: 400 });
        }

        const savedFile = await saveCustomJavascriptFile({ id, scope, javascript });

        return NextResponse.json<CustomJavascriptSaveResponse>({
            file: savedFile,
            maxLength: MAX_CUSTOM_JAVASCRIPT_LENGTH,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save custom JavaScript.';
        const status = error instanceof CustomJavascriptValidationError ? 400 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

/**
 * Deletes a saved custom JavaScript file.
 * @private
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

        await deleteCustomJavascriptFile(id);

        return NextResponse.json<CustomJavascriptDeleteResponse>({ success: true });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to delete custom JavaScript.',
            },
            { status: 500 },
        );
    }
}
