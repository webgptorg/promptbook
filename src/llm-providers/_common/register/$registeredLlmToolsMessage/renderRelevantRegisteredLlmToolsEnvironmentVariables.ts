import type { AvailableEnvironmentVariables, RegisteredLlmToolStatus } from './RegisteredLlmToolsMessageContext';

/**
 * Renders the list of environment variables used by at least one registered provider.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
export function renderRelevantRegisteredLlmToolsEnvironmentVariables(
    env: AvailableEnvironmentVariables,
    llmToolStatuses: ReadonlyArray<RegisteredLlmToolStatus>,
): string {
    return listRelevantRegisteredLlmToolsEnvironmentVariables(env, llmToolStatuses)
        .map((envVariableName) => `- \`${envVariableName}\``)
        .join('\n');
}

/**
 * Lists environment variables that are both present and used by at least one provider.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
function listRelevantRegisteredLlmToolsEnvironmentVariables(
    env: AvailableEnvironmentVariables,
    llmToolStatuses: ReadonlyArray<RegisteredLlmToolStatus>,
): Array<string> {
    return Object.keys(env).filter((envVariableName) =>
        llmToolStatuses.some(({ envVariables }) => envVariables?.includes(envVariableName)),
    );
}
