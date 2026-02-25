import { NextRequest, NextResponse } from 'next/server';
import {
    getCurrentCustomStylesheetRow,
    MAX_CUSTOM_STYLESHEET_LENGTH,
    saveCustomStylesheetCss,
} from '../../../database/customStylesheet';
import { isUserAdmin } from '../../../utils/isUserAdmin';

/**
 * Returns currently configured global custom CSS.
 */
export async function GET() {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const stylesheetRow = await getCurrentCustomStylesheetRow();

        return NextResponse.json({
            css: stylesheetRow?.css ?? '',
            exists: stylesheetRow !== null,
            updatedAt: stylesheetRow?.updatedAt ?? null,
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
 * Saves currently configured global custom CSS.
 */
export async function PUT(request: NextRequest) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json()) as { css?: unknown };
        const css = typeof body.css === 'string' ? body.css : '';

        if (css.length > MAX_CUSTOM_STYLESHEET_LENGTH) {
            return NextResponse.json(
                {
                    error: `Custom CSS exceeds maximum length of ${MAX_CUSTOM_STYLESHEET_LENGTH} characters.`,
                },
                { status: 400 },
            );
        }

        const savedRow = await saveCustomStylesheetCss(css);

        return NextResponse.json({
            css: savedRow.css,
            updatedAt: savedRow.updatedAt,
            maxLength: MAX_CUSTOM_STYLESHEET_LENGTH,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to save custom stylesheet',
            },
            { status: 500 },
        );
    }
}
