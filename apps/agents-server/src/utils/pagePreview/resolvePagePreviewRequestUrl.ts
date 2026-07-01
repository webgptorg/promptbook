import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { assertsError } from '../../../../../src/errors/assertsError';
import { assertSafeUrl } from '../assertSafeUrl';
import { getCurrentUser } from '../getCurrentUser';

/**
 * Query parameter used by page-preview API endpoints.
 */
const PAGE_PREVIEW_URL_QUERY_PARAMETER = 'url';

/**
 * Successful page-preview request URL resolution.
 */
type PagePreviewRequestUrlSuccess = {
    readonly url: string;
    readonly errorResponse: null;
};

/**
 * Failed page-preview request URL resolution.
 */
type PagePreviewRequestUrlFailure = {
    readonly url: null;
    readonly errorResponse: NextResponse;
};

/**
 * Result of authenticating and validating a page-preview request URL.
 */
export type PagePreviewRequestUrlResolution = PagePreviewRequestUrlSuccess | PagePreviewRequestUrlFailure;

/**
 * Authenticates a page-preview request and validates its target URL against SSRF-sensitive destinations.
 *
 * @param request - Incoming Next.js request.
 * @returns Valid target URL or a ready-made error response.
 */
export async function resolvePagePreviewRequestUrl(request: NextRequest): Promise<PagePreviewRequestUrlResolution> {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return {
            url: null,
            errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }

    const url = request.nextUrl.searchParams.get(PAGE_PREVIEW_URL_QUERY_PARAMETER);

    if (!url) {
        return {
            url: null,
            errorResponse: NextResponse.json(
                { error: `Missing required query parameter: ${PAGE_PREVIEW_URL_QUERY_PARAMETER}` },
                { status: 400 },
            ),
        };
    }

    try {
        assertSafeUrl(url);
    } catch (error) {
        assertsError(error);
        return {
            url: null,
            errorResponse: NextResponse.json({ error: error.message }, { status: 400 }),
        };
    }

    return {
        url,
        errorResponse: null,
    };
}
