import { NextRequest, NextResponse } from 'next/server';
import { generateManGoBook } from '@/src/utils/manGoOnboarding/manGoOnboardingAgentRuntime';
import { createManGoOnboardingApiErrorResponse } from '@/src/utils/manGoOnboarding/manGoOnboardingApiResponses';
import { readManGoOnboardingStringProperty } from '@/src/utils/manGoOnboarding/manGoOnboardingApiRequest';

/**
 * Handles `POST /api/onboarding/book`.
 *
 * @param request - Incoming request with `agentName` and `agentBrief`.
 * @returns Generated Book-language source.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const agentName = readManGoOnboardingStringProperty(body, 'agentName');
        const agentBrief = readManGoOnboardingStringProperty(body, 'agentBrief');
        const book = await generateManGoBook({ agentName, agentBrief });

        return NextResponse.json({ book });
    } catch (error) {
        return createManGoOnboardingApiErrorResponse(error);
    }
}
