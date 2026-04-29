/**
 * One error kind emitted by the stateless agent chat API.
 */
type AgentChatApiErrorType = 'invalid_request_error' | 'agent_deleted' | 'meta_disclaimer_required' | 'forbidden';

/**
 * Builds the standardized JSON error payload returned by the stateless agent chat route.
 *
 * @private function of POST
 */
export function createAgentChatApiErrorResponse(
    message: string,
    status: number,
    type: AgentChatApiErrorType,
): Response {
    return new Response(
        JSON.stringify({
            error: {
                message,
                type,
            },
        }),
        {
            status,
            headers: { 'Content-Type': 'application/json' },
        },
    );
}
