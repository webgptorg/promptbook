import { postManGoOnboardingJson } from './postManGoOnboardingJson';

/**
 * One result check shown after the step 4 test run.
 */
export type ReplyCheck = {
    readonly status: 'ok' | 'warn';
    readonly text: string;
};

/**
 * Response returned by the manGo step 4 evaluator endpoint.
 *
 * @private internal type of the manGo agent evaluation service.
 */
type EvaluateReplyResponse = {
    readonly checks: ReplyCheck[];
};

/**
 * Boundary to the manGo evaluator endpoint that judges a proposed reply against the book.
 *
 * @param input - Current Book source, customer input, and generated preview reply.
 * @returns AI-generated checks for the preview result.
 */
export async function evaluateReply(input: {
    readonly bookSource: string;
    readonly customerEmail: string;
    readonly reply: string;
}): Promise<ReplyCheck[]> {
    const response = await postManGoOnboardingJson<EvaluateReplyResponse>('/api/onboarding/evaluate', input);

    return response.checks;
}
