import { NextRequest, NextResponse } from 'next/server';
import { createManGoOnboardingApiErrorResponse } from '@/src/utils/manGoOnboarding/manGoOnboardingApiResponses';
import { generateManGoBookDraft } from '@/src/utils/manGoOnboarding/manGoOnboardingAgentRuntime';
import { readManGoOnboardingStringProperty } from '@/src/utils/manGoOnboarding/manGoOnboardingApiRequest';

/**
 * Handles `POST /api/onboarding/draft`.
 *
 * @param request - Incoming request with `agentName` and `agentBrief`.
 * @returns Generated Book draft.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const agentName = readManGoOnboardingStringProperty(body, 'agentName');
        const agentBrief = readManGoOnboardingStringProperty(body, 'agentBrief');
        const draft = await generateManGoBookDraft({ agentName, agentBrief });

        return NextResponse.json({ draft });
    } catch (error) {
        return createManGoOnboardingApiErrorResponse(error);
    }
}
