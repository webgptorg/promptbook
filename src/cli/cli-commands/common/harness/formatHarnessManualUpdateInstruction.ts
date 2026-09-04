import { spaceTrim } from 'spacetrim';
import { buildHarnessInstallCommand } from './buildHarnessInstallCommand';
import type { HarnessInstallationStatus } from './HarnessInstallationStatus';
import type { HarnessUpdatePlan } from './HarnessUpdatePlan';

/**
 * Formats the instruction shown when an outdated harness must be updated by the user.
 *
 * @private internal utility of `promptbookCli`
 */
export function formatHarnessManualUpdateInstruction(
    status: HarnessInstallationStatus,
    updatePlan: HarnessUpdatePlan,
): string {
    const { definition, installationOrigin } = status;

    const commandLocation =
        installationOrigin.commandPath === null
            ? `The \`${definition.commandName}\` command`
            : `The \`${definition.commandName}\` command at \`${installationOrigin.commandPath}\``;

    if (updatePlan.command !== null) {
        return spaceTrim(`
            ${commandLocation} is not managed by npm, so Promptbook leaves it alone.

            Update it manually with \`${updatePlan.command}\`.
        `);
    }

    const unknownInstallationReason =
        installationOrigin.commandPath === null ? 'could not be located' : 'is not inside the global npm prefix';
    const npmInstallCommand = buildHarnessInstallCommand(definition);

    return spaceTrim(`
        ${commandLocation} ${unknownInstallationReason}, so Promptbook cannot tell how it was installed.

        Update it the same way it was installed - \`${npmInstallCommand}\` would install a **second** copy of ${definition.label} instead of updating the one which is really used.
    `);
}

// Note: [🟡] Code for CLI harness manual update instruction [formatHarnessManualUpdateInstruction](src/cli/cli-commands/common/harness/formatHarnessManualUpdateInstruction.ts) should never be published outside of `@promptbook/cli`
