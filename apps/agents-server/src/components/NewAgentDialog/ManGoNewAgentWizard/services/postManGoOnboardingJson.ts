import { NotAllowed } from '../../../../../../../src/errors/NotAllowed';
import { spaceTrim } from 'spacetrim';

/**
 * JSON headers shared by manGo onboarding service calls.
 *
 * @private internal constant of manGo onboarding services
 */
const MAN_GO_ONBOARDING_JSON_HEADERS = {
    'Content-Type': 'application/json',
};

/**
 * Error payload returned by manGo onboarding API routes.
 *
 * @private internal type of manGo onboarding services
 */
type ManGoOnboardingApiErrorPayload = {
    readonly error?: {
        readonly message?: unknown;
    };
};

/**
 * Posts JSON to one manGo onboarding API route and returns the typed response payload.
 *
 * @param path - API route path.
 * @param body - JSON-serializable request body.
 * @returns Parsed response payload.
 *
 * @private internal utility of manGo onboarding services
 */
export async function postManGoOnboardingJson<ResponsePayload>(
    path: string,
    body: unknown,
): Promise<ResponsePayload> {
    const response = await fetch(path, {
        method: 'POST',
        headers: MAN_GO_ONBOARDING_JSON_HEADERS,
        body: JSON.stringify(body),
    });
    const payload = await readManGoOnboardingJson(response);

    if (!response.ok) {
        throw new NotAllowed(resolveManGoOnboardingErrorMessage(payload, response.status));
    }

    return payload as ResponsePayload;
}

/**
 * Reads a JSON response body and wraps parse failures in a branded error.
 *
 * @param response - Fetch response.
 * @returns Parsed JSON payload.
 *
 * @private internal utility of manGo onboarding services
 */
async function readManGoOnboardingJson(response: Response): Promise<unknown> {
    try {
        return await response.json();
    } catch {
        throw new NotAllowed(
            spaceTrim(`
                The manGo onboarding API returned an invalid JSON response.

                Endpoint status: \`${response.status}\`
            `),
        );
    }
}

/**
 * Resolves a human-readable error message from the stable API error payload.
 *
 * @param payload - Parsed response payload.
 * @param status - HTTP status code.
 * @returns Error message for the UI.
 *
 * @private internal utility of manGo onboarding services
 */
function resolveManGoOnboardingErrorMessage(payload: unknown, status: number): string {
    if (isManGoOnboardingApiErrorPayload(payload) && typeof payload.error?.message === 'string') {
        return payload.error.message;
    }

    return spaceTrim(`
        The manGo onboarding API request failed.

        Endpoint status: \`${status}\`
    `);
}

/**
 * Checks whether a parsed JSON value matches the API error payload shape.
 *
 * @param payload - Parsed JSON payload.
 * @returns Whether the payload contains an error object.
 *
 * @private internal utility of manGo onboarding services
 */
function isManGoOnboardingApiErrorPayload(payload: unknown): payload is ManGoOnboardingApiErrorPayload {
    return typeof payload === 'object' && payload !== null && 'error' in payload;
}
