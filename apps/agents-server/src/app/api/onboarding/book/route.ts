import { NextRequest, NextResponse } from 'next/server';
import { convertManGoDraftToBook } from '@/src/utils/manGoOnboarding/manGoOnboardingAgentRuntime';
import { createManGoOnboardingApiErrorResponse } from '@/src/utils/manGoOnboarding/manGoOnboardingApiResponses';
import { readManGoOnboardingStringProperty } from '@/src/utils/manGoOnboarding/manGoOnboardingApiRequest';

/**
 * Handles `POST /api/onboarding/book`.
 *
 * @param request - Incoming request with the editable draft input.
 * @returns Canonical Book-language source and validation flag.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const input = readManGoOnboardingStringProperty(body, 'input');
        const result = await convertManGoDraftToBook({ input });

        return NextResponse.json(result);
    } catch (error) {
        return createManGoOnboardingApiErrorResponse(error);
    }
}
