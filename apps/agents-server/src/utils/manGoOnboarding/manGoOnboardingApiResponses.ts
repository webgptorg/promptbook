import { NextResponse } from 'next/server';
import { assertsError } from '../../../../../src/errors/assertsError';
import { NotAllowed } from '../../../../../src/errors/NotAllowed';

/**
 * Creates a JSON response for manGo onboarding API failures.
 *
 * @param error - Error caught by the route handler.
 * @returns JSON response with a stable error shape.
 */
export function createManGoOnboardingApiErrorResponse(error: unknown): NextResponse {
    assertsError(error);

    const status = error instanceof NotAllowed ? 400 : 500;

    if (status >= 500) {
        console.error('[manGo onboarding] AI agent request failed', error);
    }

    return NextResponse.json(
        {
            error: {
                message: error.message,
            },
        },
        { status },
    );
}
