import { spaceTrim } from 'spacetrim';
import { UnexpectedError } from '../../../../errors/UnexpectedError';
import type { PromptRunnerHarnessName } from '../promptRunnerCliOptions';

/**
 * Description of a standalone *(self-managed)* installation of one CLI coding harness.
 *
 * Some harnesses are also distributed by their own installer which puts the harness outside of npm and
 * updates it in place. Such an installation must never be updated with `npm install -g`, because that
 * installs a second copy of the harness instead of updating the one which is really used.
 *
 * @private internal utility of `promptbookCli`
 */
export type HarnessStandaloneInstallation = {
    /**
     * Directory names which appear in the resolved path of a standalone installation of the harness,
     * for example `.codex` in `~/.codex/packages/standalone/current/bin/codex`.
     */
    readonly directoryNames: ReadonlyArray<string>;

    /**
     * Command which updates the standalone installation in place.
     */
    readonly updateCommand: string;
};

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

    /**
     * How a standalone installation of this harness is recognized and updated.
     *
     * Harnesses which are distributed only through npm leave this undefined.
     */
    readonly standaloneInstallation?: HarnessStandaloneInstallation;
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
        // Note: The official standalone installer keeps its package in `~/.codex` and links it onto the `PATH`
        standaloneInstallation: {
            directoryNames: ['.codex'],
            updateCommand: 'codex update',
        },
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
    'qwen-code': {
        harnessName: 'qwen-code',
        label: 'Qwen Code',
        commandName: 'qwen',
        npmPackageName: '@qwen-code/qwen-code',
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
