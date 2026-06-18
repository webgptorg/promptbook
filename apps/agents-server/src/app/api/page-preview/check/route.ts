import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { assertsError } from '../../../../../../../src/errors/assertsError';
import { checkIfUrlCanBeEmbedded } from '../../../../utils/iframe/checkIfUrlCanBeEmbedded';

/**
 * Checks whether a given URL can be embedded in an iframe by inspecting
 * `X-Frame-Options` and `Content-Security-Policy` `frame-ancestors` headers.
 *
 * Query parameters:
 * - `url` — the fully-qualified HTTP(S) URL to check
 *
 * Returns `{ canEmbed: boolean }`.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing required query parameter: url' }, { status: 400 });
    }

    try {
        const canEmbed = await checkIfUrlCanBeEmbedded(url);
        return NextResponse.json({ canEmbed });
    } catch (error) {
        assertsError(error);
        console.warn('Failed to check if URL can be embedded:', error.message);
        // When the check fails, allow the iframe to try — the browser will handle it
        return NextResponse.json({ canEmbed: true });
    }
}
