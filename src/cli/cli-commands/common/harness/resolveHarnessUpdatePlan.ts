import { buildHarnessInstallCommand } from './buildHarnessInstallCommand';
import type { HarnessDefinition } from './HarnessDefinition';
import type { HarnessInstallationMethod } from './HarnessInstallationOrigin';
import type { HarnessUpdatePlan } from './HarnessUpdatePlan';

/**
 * Decides how one outdated CLI coding harness should be updated.
 *
 * The plan follows the way the harness was installed, because `npm install -g` updates only a harness
 * which npm owns and installs a **second** copy of every other one.
 *
 * @private internal utility of `promptbookCli`
 */
export function resolveHarnessUpdatePlan(
    definition: HarnessDefinition,
    installationMethod: HarnessInstallationMethod,
): HarnessUpdatePlan {
    if (installationMethod === 'npm-global') {
        return {
            command: buildHarnessInstallCommand(definition),
            isRunnableByPromptbook: true,
            environment: definition.npmInstallEnvironment,
        };
    }

    if (installationMethod === 'standalone' && definition.standaloneInstallation !== undefined) {
        return {
            command: definition.standaloneInstallation.updateCommand,
            isRunnableByPromptbook: true,
        };
    }

    if (installationMethod === 'homebrew') {
        // Note: The formula may be named differently than the command, so the update is only suggested
        return {
            command: `brew upgrade ${definition.commandName}`,
            isRunnableByPromptbook: false,
        };
    }

    return {
        command: null,
        isRunnableByPromptbook: false,
    };
}

// Note: [🟡] Code for CLI harness update planning [resolveHarnessUpdatePlan](src/cli/cli-commands/common/harness/resolveHarnessUpdatePlan.ts) should never be published outside of `@promptbook/cli`
