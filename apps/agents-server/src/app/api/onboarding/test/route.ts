import { NextRequest, NextResponse } from 'next/server';
import { runManGoAgentTest } from '@/src/utils/manGoOnboarding/manGoOnboardingAgentRuntime';
import { createManGoOnboardingApiErrorResponse } from '@/src/utils/manGoOnboarding/manGoOnboardingApiResponses';
import {
    readManGoOnboardingStringArrayProperty,
    readManGoOnboardingStringProperty,
    readManGoOnboardingTestMessages,
} from '@/src/utils/manGoOnboarding/manGoOnboardingApiRequest';

/**
 * Handles `POST /api/onboarding/test`.
 *
 * @param request - Incoming request with source, knowledge URLs, and test messages.
 * @returns Live agent reply for the test step.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = await runManGoAgentTest({
            bookSource: readManGoOnboardingStringProperty(body, 'bookSource'),
            knowledge: readManGoOnboardingStringArrayProperty(body, 'knowledge'),
            messages: readManGoOnboardingTestMessages(body),
        });

        return NextResponse.json(result);
    } catch (error) {
        return createManGoOnboardingApiErrorResponse(error);
    }
}
