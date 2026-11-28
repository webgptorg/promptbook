import { serializeError } from '@promptbook-local/utils';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { assertsError } from '../../../../../../../src/errors/assertsError';
import { assertSafeUrl } from '../../../../utils/assertSafeUrl';
import {
    resolveCitationLabelTargetUrl,
    resolveCitationSourceLabel,
    type CitationSourceLabelPayload,
} from '../../../../utils/chat/resolveCitationSourceLabel';
import { getCurrentUser } from '../../../../utils/getCurrentUser';

/**
 * Maximum accepted citation field length in the label resolver endpoint.
 *
 * @private API route constant
 */
const MAX_CITATION_LABEL_FIELD_LENGTH = 2_000;

/**
 * Raw request body accepted by citation label resolver endpoint.
 *
 * @private API route type
 */
type CitationLabelRequestBody = {
    /**
     * Raw citation source.
     */
    readonly source?: unknown;

    /**
     * Optional source URL.
     */
    readonly url?: unknown;

    /**
     * Optional source title.
     */
    readonly title?: unknown;
};

/**
 * Resolves nicer labels for chat source citations.
 *
 * Requires authentication because the endpoint fetches user-provided URLs.
 *
 * @route POST /api/chat/citation-label
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json()) as CitationLabelRequestBody;
        const citation = parseCitationLabelRequestBody(body);
        const targetUrl = resolveCitationLabelTargetUrl(citation);

        if (targetUrl) {
            try {
                assertSafeUrl(targetUrl);
            } catch (error) {
                assertsError(error);
                return NextResponse.json({ error: error.message, label: null }, { status: 400 });
            }
        }

        const label = await resolveCitationSourceLabel(citation);

        return NextResponse.json({ label });
    } catch (error) {
        assertsError(error);
        const status = error.name === 'SyntaxError' || error.message.startsWith('Invalid ') ? 400 : 500;

        return NextResponse.json(
            {
                error: status === 400 ? error.message : serializeError(error),
                label: null,
            },
            { status },
        );
    }
}

/**
 * Parses and validates one label resolver request body.
 *
 * @param body - Raw request body.
 * @returns Validated citation payload.
 *
 * @private API route helper
 */
function parseCitationLabelRequestBody(body: CitationLabelRequestBody): CitationSourceLabelPayload {
    const source = parseOptionalString(body.source, 'source');
    if (!source) {
        throw new Error('Invalid source: expected a non-empty string.');
    }

    return {
        source,
        url: parseOptionalString(body.url, 'url'),
        title: parseOptionalString(body.title, 'title'),
    };
}

/**
 * Parses an optional request body string field.
 *
 * @param value - Raw field value.
 * @param fieldName - Field name used in validation messages.
 * @returns Trimmed string or undefined.
 *
 * @private API route helper
 */
function parseOptionalString(value: unknown, fieldName: string): string | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    if (typeof value !== 'string') {
        throw new Error(`Invalid ${fieldName}: expected a string.`);
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length > MAX_CITATION_LABEL_FIELD_LENGTH) {
        throw new Error(`Invalid ${fieldName}: value is too long.`);
    }

    return trimmedValue || undefined;
}

// Note: [🟢] Code for Agents Server citation label API route should never be published into packages that could be imported into browser environment
