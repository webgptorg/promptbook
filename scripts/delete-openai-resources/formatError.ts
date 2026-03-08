/**
 * Formats unknown errors into a readable message.
 * @private function of DeleteOpenAiResources
 */
export function formatError(error: unknown): string {
    if (error instanceof Error) {
        return error.stack || error.message;
    }

    return String(error);
}

