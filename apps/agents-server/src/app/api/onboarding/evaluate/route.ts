import { NextRequest, NextResponse } from 'next/server';
import { evaluateManGoAgentReply } from '@/src/utils/manGoOnboarding/manGoOnboardingAgentRuntime';
import { createManGoOnboardingApiErrorResponse } from '@/src/utils/manGoOnboarding/manGoOnboardingApiResponses';
import { readManGoOnboardingStringProperty } from '@/src/utils/manGoOnboarding/manGoOnboardingApiRequest';

/**
 * Handles `POST /api/onboarding/evaluate`.
 *
 * @param request - Incoming request with source, customer input, and generated reply.
 * @returns AI-generated reply checks.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = await evaluateManGoAgentReply({
            bookSource: readManGoOnboardingStringProperty(body, 'bookSource'),
            customerEmail: readManGoOnboardingStringProperty(body, 'customerEmail'),
            reply: readManGoOnboardingStringProperty(body, 'reply'),
        });

        return NextResponse.json(result);
    } catch (error) {
        return createManGoOnboardingApiErrorResponse(error);
    }
}
