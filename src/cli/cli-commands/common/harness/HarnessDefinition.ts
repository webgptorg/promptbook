import { spaceTrim } from 'spacetrim';
import { UnexpectedError } from '../../../../errors/UnexpectedError';
import type { PromptRunnerHarnessName } from '../promptRunnerCliOptions';

/**
 * Static description of one supported CLI coding harness.
 *
 * @private internal utility of `promptbookCli`
 */
export type HarnessDefinition = {
    /**
     * Harness identifier used by the `--harness` option.
     */
    readonly harnessName: PromptRunnerHarnessName;

    /**
     * Human-readable harness name shown in the terminal.
     */
    readonly label: string;

    /**
     * Globally installed command which runs the harness.
     */
    readonly commandName: string;

    /**
     * Npm package which installs the harness command globally.
     */
    readonly npmPackageName: string;

    /**
     * Extra environment variables required by the global npm installation of this harness.
     */
    readonly npmInstallEnvironment?: Readonly<Record<string, string>>;
};

/**
 * Single source of truth about how each supported CLI coding harness is installed and detected.
 *
 * @private internal utility of `promptbookCli`
 */
export const HARNESS_DEFINITIONS: Readonly<Record<PromptRunnerHarnessName, HarnessDefinition>> = {
    'openai-codex': {
        harnessName: 'openai-codex',
        label: 'OpenAI Codex',
        commandName: 'codex',
        npmPackageName: '@openai/codex',
    },
    'github-copilot': {
        harnessName: 'github-copilot',
        label: 'GitHub Copilot',
        commandName: 'copilot',
        npmPackageName: '@github/copilot',
        // Note: The GitHub Copilot CLI downloads its native binary in a postinstall script
        npmInstallEnvironment: { npm_config_ignore_scripts: 'false' },
    },
    cline: {
        harnessName: 'cline',
        label: 'Cline',
        commandName: 'cline',
        npmPackageName: 'cline',
    },
    'claude-code': {
        harnessName: 'claude-code',
        label: 'Claude Code',
        commandName: 'claude',
        npmPackageName: '@anthropic-ai/claude-code',
    },
    opencode: {
        harnessName: 'opencode',
        label: 'Opencode',
        commandName: 'opencode',
        npmPackageName: 'opencode-ai',
    },
    gemini: {
        harnessName: 'gemini',
        label: 'Gemini CLI',
        commandName: 'gemini',
        npmPackageName: '@google/gemini-cli',
    },
};

/**
 * Looks up the definition of one supported CLI coding harness.
 *
 * @private internal utility of `promptbookCli`
 */
export function getHarnessDefinition(harnessName: PromptRunnerHarnessName): HarnessDefinition {
    const definition = HARNESS_DEFINITIONS[harnessName];

    if (definition === undefined) {
        throw new UnexpectedError(
            spaceTrim(`
                Missing harness definition for \`${harnessName}\`.

                Every harness must be described in \`HARNESS_DEFINITIONS\`.
            `),
        );
    }

    return definition;
}

// Note: [🟡] Code for CLI harness definitions [HarnessDefinition](src/cli/cli-commands/common/harness/HarnessDefinition.ts) should never be published outside of `@promptbook/cli`
