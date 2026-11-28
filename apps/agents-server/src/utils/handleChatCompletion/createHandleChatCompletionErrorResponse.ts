import { NextResponse } from 'next/server';

/**
 * Creates one consistent OpenAI-compatible error response.
 *
 * @private function of `handleChatCompletion`
 */
export function createHandleChatCompletionErrorResponse(message: string, type: string, status: number): NextResponse {
    return NextResponse.json(
        {
            error: {
                message,
                type,
            },
        },
        { status },
    );
}
