import { spaceTrim } from 'spacetrim';

/**
 * Base Google Calendar API URL.
 *
 * @private constant of callGoogleCalendarApi
 */
const GOOGLE_CALENDAR_API_BASE_URL = 'https://www.googleapis.com/calendar/v3';

/**
 * Options for one Google Calendar API call.
 *
 * @private type of callGoogleCalendarApi
 */
type CallGoogleCalendarApiOptions = {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    path: string;
    query?: Record<string, string>;
    body?: Record<string, unknown>;
    allowNotFound?: boolean;
};

/**
 * Runs one Google Calendar API request and parses JSON response payload.
 *
 * @private function of UseCalendarCommitmentDefinition
 */
export async function callGoogleCalendarApi<TResponse = unknown>(
    accessToken: string,
    options: CallGoogleCalendarApiOptions,
): Promise<TResponse | null> {
    const url = new URL(options.path, GOOGLE_CALENDAR_API_BASE_URL);
    if (options.query) {
        for (const [key, value] of Object.entries(options.query)) {
            if (value && value.trim()) {
                url.searchParams.set(key, value);
            }
        }
    }

    const response = await fetch(url.toString(), {
        method: options.method,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const textPayload = await response.text();
    const parsedPayload = tryParseJson(textPayload);

    if (options.allowNotFound && response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error(
            spaceTrim(`
                Google Calendar API request failed (${response.status} ${response.statusText}):
                ${extractGoogleCalendarApiErrorMessage(parsedPayload, textPayload)}
            `),
        );
    }

    return parsedPayload as TResponse;
}

/**
 * Parses raw text into JSON when possible.
 *
 * @private function of callGoogleCalendarApi
 */
function tryParseJson(rawText: string): unknown {
    if (!rawText.trim()) {
        return {};
    }

    try {
        return JSON.parse(rawText);
    } catch {
        return rawText;
    }
}

/**
 * Extracts a user-friendly Google Calendar API error message.
 *
 * @private function of callGoogleCalendarApi
 */
function extractGoogleCalendarApiErrorMessage(parsedPayload: unknown, fallbackText: string): string {
    if (parsedPayload && typeof parsedPayload === 'object') {
        const payload = parsedPayload as { error?: unknown };
        const errorPayload = payload.error;
        if (errorPayload && typeof errorPayload === 'object') {
            const normalizedErrorPayload = errorPayload as {
                message?: unknown;
                errors?: unknown;
            };
            const message = typeof normalizedErrorPayload.message === 'string' ? normalizedErrorPayload.message : '';
            const errors = Array.isArray(normalizedErrorPayload.errors) ? normalizedErrorPayload.errors : [];
            const flattenedErrors = errors
                .map((errorEntry) => {
                    if (!errorEntry || typeof errorEntry !== 'object') {
                        return '';
                    }

                    const normalizedErrorEntry = errorEntry as { message?: unknown; reason?: unknown };
                    const detailMessage =
                        typeof normalizedErrorEntry.message === 'string' ? normalizedErrorEntry.message : '';
                    const reason = typeof normalizedErrorEntry.reason === 'string' ? normalizedErrorEntry.reason : '';
                    return [detailMessage, reason].filter(Boolean).join(' | ');
                })
                .filter(Boolean);

            if (message || flattenedErrors.length > 0) {
                return [message, ...flattenedErrors].filter(Boolean).join(' | ');
            }
        }
    }

    return fallbackText || 'Unknown Google Calendar API error';
}
