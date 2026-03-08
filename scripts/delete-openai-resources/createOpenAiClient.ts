import OpenAI from 'openai';

/**
 * Creates an authenticated OpenAI API client for this script.
 * @private function of DeleteOpenAiResources
 */
export function createOpenAiClient(): OpenAI {
    return new OpenAI({ apiKey: getOpenAiApiKey() });
}

/**
 * Reads the OpenAI API key from the environment.
 * @private function of DeleteOpenAiResources
 */
function getOpenAiApiKey(): string {
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not defined in the environment.');
    }

    return apiKey;
}

