import type { AvailableEnvironmentVariables } from './RegisteredLlmToolsMessageContext';

/**
 * Reads environment variables relevant for provider configuration.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
export function getAvailableRegisteredLlmToolsEnvironmentVariables(
    isRunningInNode: boolean,
): AvailableEnvironmentVariables {
    if (isRunningInNode) {
        return process.env as AvailableEnvironmentVariables;
        // <- TODO: [⚛] Some DRY way how to get to `process.env` and pass it into functions - ACRY search for `env`
    }

    return {};
}
