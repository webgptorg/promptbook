import { getHarnessDefinition } from './HarnessDefinition';
import type { HarnessInstallationOrigin } from './HarnessInstallationOrigin';
import type { HarnessInstallationStatus } from './HarnessInstallationStatus';
import { formatHarnessManualUpdateInstruction } from './formatHarnessManualUpdateInstruction';
import { resolveHarnessUpdatePlan } from './resolveHarnessUpdatePlan';

/**
 * Builds the status of an outdated OpenAI Codex installed in the given place.
 */
function createOutdatedCodexStatus(installationOrigin: HarnessInstallationOrigin): HarnessInstallationStatus {
    return {
        definition: getHarnessDefinition('openai-codex'),
        installationState: 'outdated',
        installedVersion: '0.149.1',
        latestVersion: '0.152.0',
        installationOrigin,
    };
}

describe('formatHarnessManualUpdateInstruction', () => {
    it('names the command which updates a Homebrew installation', () => {
        const status = createOutdatedCodexStatus({
            commandPath: '/opt/homebrew/Cellar/codex/0.149.1/bin/codex',
            installationMethod: 'homebrew',
        });

        const instruction = formatHarnessManualUpdateInstruction(
            status,
            resolveHarnessUpdatePlan(status.definition, status.installationOrigin.installationMethod),
        );

        expect(instruction).toContain('/opt/homebrew/Cellar/codex/0.149.1/bin/codex');
        expect(instruction).toContain('brew upgrade codex');
        expect(instruction).not.toContain('npm install');
    });

    it('warns that npm would install a second copy of an installation it does not understand', () => {
        const status = createOutdatedCodexStatus({
            commandPath: '/usr/local/bin/codex',
            installationMethod: 'unknown',
        });

        const instruction = formatHarnessManualUpdateInstruction(
            status,
            resolveHarnessUpdatePlan(status.definition, status.installationOrigin.installationMethod),
        );

        expect(instruction).toContain('/usr/local/bin/codex');
        expect(instruction).toContain('is not inside the global npm prefix');
        expect(instruction).toContain('would install a **second** copy');
    });

    it('does not pretend to know where a command which could not be located lives', () => {
        const status = createOutdatedCodexStatus({ commandPath: null, installationMethod: 'unknown' });

        const instruction = formatHarnessManualUpdateInstruction(
            status,
            resolveHarnessUpdatePlan(status.definition, status.installationOrigin.installationMethod),
        );

        expect(instruction).toContain('could not be located');
        expect(instruction).not.toContain('global npm prefix');
    });
});

// Note: [🟡] Code for CLI harness manual update instruction tests [formatHarnessManualUpdateInstruction.test](src/cli/cli-commands/common/harness/formatHarnessManualUpdateInstruction.test.ts) should never be published outside of `@promptbook/cli`
