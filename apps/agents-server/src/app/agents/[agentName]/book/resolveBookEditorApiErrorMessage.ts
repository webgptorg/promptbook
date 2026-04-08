/**
 * Minimal API error payload used by Book-related endpoints.
 *
 * @private function of useBookEditorWrapper
 */
type ApiErrorPayload = {
    message?: string;
    error?: string;
};

/**
 * Extracts a human-readable API error from a failed HTTP response.
 *
 * @param response - Failed API response.
 * @param fallbackMessage - Fallback message used when the payload cannot be parsed.
 * @returns Friendly error message for UI.
 * @private function of useBookEditorWrapper
 */
export async function resolveBookEditorApiErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
    const fallback = `${fallbackMessage}: ${response.status} ${response.statusText}`.trim();

    try {
        const payload = (await response.json()) as ApiErrorPayload;
        const payloadMessage = payload?.message || payload?.error;
        if (payloadMessage && payloadMessage.trim().length > 0) {
            return payloadMessage.trim();
        }
    } catch {
        // Ignore JSON parsing failures and fall back to status-based message.
    }

    return fallback;
}
