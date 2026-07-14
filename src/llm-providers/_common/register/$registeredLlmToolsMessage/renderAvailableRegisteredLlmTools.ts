import colors from 'colors';
import { spaceTrim } from 'spacetrim';
import type {
    AvailableEnvironmentVariables,
    RegisteredLlmToolStatus,
} from './RegisteredLlmToolsMessageContext';
import { createRegisteredLlmToolConfigurationStatusMessage } from './createRegisteredLlmToolConfigurationStatusMessage';
import { createRegisteredLlmToolInstallationStatusMessage } from './createRegisteredLlmToolInstallationStatusMessage';

/**
 * Renders all provider lines in the status summary.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
export function renderAvailableRegisteredLlmTools(
    llmToolStatuses: ReadonlyArray<RegisteredLlmToolStatus>,
    env: AvailableEnvironmentVariables,
    isRunningInNode: boolean,
): string {
    return llmToolStatuses
        .map((llmToolStatus, index) => renderAvailableRegisteredLlmTool(llmToolStatus, index, env, isRunningInNode))
        .join('\n');
}

/**
 * Renders one provider line in the status summary.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
function renderAvailableRegisteredLlmTool(
    llmToolStatus: RegisteredLlmToolStatus,
    index: number,
    env: AvailableEnvironmentVariables,
    isRunningInNode: boolean,
): string {
    const providerMessage = createAvailableRegisteredLlmToolMessage(llmToolStatus, index, env);

    if (!isRunningInNode) {
        return providerMessage;
    }

    return colorizeAvailableRegisteredLlmToolMessage(providerMessage, llmToolStatus);
}

/**
 * Creates the plain-text provider line before optional colorization.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
function createAvailableRegisteredLlmToolMessage(
    llmToolStatus: RegisteredLlmToolStatus,
    index: number,
    env: AvailableEnvironmentVariables,
): string {
    const { title, packageName, className } = llmToolStatus;
    const providerStatusMessages = createRegisteredLlmToolStatusMessages(llmToolStatus, env);

    return spaceTrim(`
        ${index + 1}) **${title}** \`${className}\` from \`${packageName}\`
            ${providerStatusMessages.join('; ')}
    `);
}

/**
 * Creates the install and configuration fragments for one provider line.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
function createRegisteredLlmToolStatusMessages(
    llmToolStatus: RegisteredLlmToolStatus,
    env: AvailableEnvironmentVariables,
): Array<string> {
    return [
        createRegisteredLlmToolInstallationStatusMessage(llmToolStatus),
        createRegisteredLlmToolConfigurationStatusMessage(llmToolStatus, env),
    ];
}

/**
 * Applies the same terminal coloring rules as the original summary renderer.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
function colorizeAvailableRegisteredLlmToolMessage(
    providerMessage: string,
    { isInstalled, isFullyConfigured, isPartiallyConfigured }: RegisteredLlmToolStatus,
): string {
    if (isInstalled && isFullyConfigured) {
        return colors.green(providerMessage);
    }

    if (isInstalled && isPartiallyConfigured) {
        return colors.yellow(providerMessage);
    }

    return colors.gray(providerMessage);
}
