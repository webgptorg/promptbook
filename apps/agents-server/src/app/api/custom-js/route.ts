import { NextRequest, NextResponse } from 'next/server';
import {
    getCurrentCustomJavascriptRow,
    MAX_CUSTOM_JAVASCRIPT_LENGTH,
    saveCustomJavascriptText,
} from '../../../database/customJavascript';
import { isUserAdmin } from '../../../utils/isUserAdmin';

/**
 * API payload returned by `GET /api/custom-js`.
 * @private
 */
type CustomJavascriptReadResponse = {
    javascript: string;
    exists: boolean;
    updatedAt: string | null;
    maxLength: number;
    error?: string;
};

/**
 * API payload returned by `PUT /api/custom-js`.
 * @private
 */
type CustomJavascriptWriteResponse = {
    javascript: string;
    updatedAt: string;
    maxLength: number;
    error?: string;
};

/**
 * Returns currently configured global custom JavaScript.
 * @private
 */
export async function GET() {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const javascriptRow = await getCurrentCustomJavascriptRow();

        return NextResponse.json({
            javascript: javascriptRow?.javascript ?? '',
            exists: javascriptRow !== null,
            updatedAt: javascriptRow?.updatedAt ?? null,
            maxLength: MAX_CUSTOM_JAVASCRIPT_LENGTH,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to load custom JavaScript',
            },
            { status: 500 },
        );
    }
}

/**
 * Saves currently configured global custom JavaScript.
 * @private
 */
export async function PUT(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json()) as { javascript?: unknown };
        const javascript = typeof body.javascript === 'string' ? body.javascript : '';

        if (javascript.length > MAX_CUSTOM_JAVASCRIPT_LENGTH) {
            return NextResponse.json(
                {
                    error: `Custom JavaScript exceeds maximum length of ${MAX_CUSTOM_JAVASCRIPT_LENGTH} characters.`,
                },
                { status: 400 },
            );
        }

        const savedRow = await saveCustomJavascriptText(javascript);

        return NextResponse.json({
            javascript: savedRow.javascript,
            updatedAt: savedRow.updatedAt,
            maxLength: MAX_CUSTOM_JAVASCRIPT_LENGTH,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to save custom JavaScript',
            },
            { status: 500 },
        );
    }
}
