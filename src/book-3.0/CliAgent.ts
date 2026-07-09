import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { executeAgentChatTurn } from '../../scripts/run-agent-chat/executeAgentChatTurn';
import { NotAllowed } from '../errors/NotAllowed';
import { resolvePromptbookTemporaryPath } from '../utils/filesystem/promptbookTemporaryPath';
import { spaceTrim } from '../utils/organization/spaceTrim';
import type { BookNodeAgentSourceOptions, ResolvedBookNodeAgentSource } from './BookNodeAgentSource';
import { resolveBookNodeAgentSource } from './BookNodeAgentSource';
import { CLI_AGENT_HARNESS_NAMES, CLI_AGENT_THINKING_LEVEL_VALUES, PTBK_HARNESS_ENV, PTBK_MODEL_ENV, PTBK_THINKING_LEVEL_ENV } from './cliAgentEnv';

/**
 * CLI harness names supported by `ptbk agent exec`.
 *
 * @public exported from `@promptbook/node`
 */
export type CliAgentHarness = (typeof CLI_AGENT_HARNESS_NAMES)[number];

/**
 * Thinking levels supported by CLI coding harnesses.
 *
 * @public exported from `@promptbook/node`
 */
export type CliAgentThinkingLevel = (typeof CLI_AGENT_THINKING_LEVEL_VALUES)[number];

/**
 * Per-run CLI options exposed by `CliAgent`.
 *
 * `noUi` defaults to `true` so command output stays suitable for JavaScript callers.
 *
 * @public exported from `@promptbook/node`
 */
export type CliAgentRunOptions = {
    readonly allowCredits?: boolean;
    readonly context?: string;
    readonly harness?: CliAgentHarness;
    readonly isVerbose?: boolean;
    readonly model?: string;
    readonly noUi?: boolean;
    readonly thinkingLevel?: CliAgentThinkingLevel;
};

/**
 * Constructor options for `CliAgent`.
 *
 * @public exported from `@promptbook/node`
 */
export type CliAgentOptions = BookNodeAgentSourceOptions & CliAgentRunOptions;

/**
 * Default non-interactive mode used by `CliAgent`.
 *
 * @private internal constant of `CliAgent`
 */
const DEFAULT_CLI_AGENT_IS_NO_UI = true;

/**
 * Lightweight JavaScript wrapper around the Promptbook agent execution pipeline.
 *
 * It uses the same harnesses and execution path as `ptbk agent exec`, running the runner
 * in-process instead of spawning a separate CLI process.
 *
 * When no `harness` is provided in the constructor or per-run options, `CliAgent` falls back
 * to the `PTBK_HARNESS` environment variable, mirroring `ptbk agent exec` behavior.
 *
 * @public exported from `@promptbook/node`
 */
export class CliAgent {
    private temporaryAgentPath: string | null = null;

    public constructor(private readonly options: CliAgentOptions) {}

    /**
     * Runs one non-interactive agent turn through the selected harness.
     *
     * @param message - User message sent to the agent.
     * @param options - Optional per-run overrides.
     * @returns Final agent answer.
     */
    public async run(message: string, options: CliAgentRunOptions = {}): Promise<string> {
        const normalizedMessage = message.trim();

        if (!normalizedMessage) {
            throw new NotAllowed('Pass a non-empty message to `CliAgent.run(...)`.');
        }

        const resolvedSource = await resolveBookNodeAgentSource(this.options);
        const agentPath = await this.resolveExecutableAgentPath(resolvedSource);
        const mergedOptions = mergeCliAgentRunOptions(this.options, options);

        const harness = mergedOptions.harness ?? resolveCliAgentHarnessFromEnv();

        if (!harness) {
            throw new NotAllowed(
                spaceTrim(`
                    No harness specified for \`CliAgent\`. Pass \`harness\` in the constructor options or per-run options,
                    or set the \`${PTBK_HARNESS_ENV}\` environment variable.

                    Available harnesses: ${CLI_AGENT_HARNESS_NAMES.join(', ')}

                    Example: \`PTBK_HARNESS=claude-code\`
                `),
            );
        }

        const result = await executeAgentChatTurn({
            agentPath,
            messages: [{ sender: 'USER', content: normalizedMessage }],
            agentName: harness,
            model: mergedOptions.model ?? process.env[PTBK_MODEL_ENV],
            noUi: mergedOptions.noUi ?? DEFAULT_CLI_AGENT_IS_NO_UI,
            thinkingLevel: mergedOptions.thinkingLevel ?? resolveCliAgentThinkingLevelFromEnv(),
            allowCredits: mergedOptions.allowCredits ?? false,
            isVerbose: mergedOptions.isVerbose ?? false,
            context: mergedOptions.context,
            currentWorkingDirectory: resolvedSource.currentWorkingDirectory,
        });

        return result.answer;
    }

    /**
     * Resolves the agent path passed to the runner, materializing one temporary `.book` file when needed.
     *
     * @private internal utility of `CliAgent`
     */
    private async resolveExecutableAgentPath(resolvedSource: ResolvedBookNodeAgentSource): Promise<string> {
        if (resolvedSource.agentPath) {
            return resolvedSource.agentPath;
        }

        if (!this.temporaryAgentPath) {
            this.temporaryAgentPath = createCliAgentTemporaryBookPath(resolvedSource);

            await mkdir(dirname(this.temporaryAgentPath), { recursive: true });
            await writeFile(this.temporaryAgentPath, normalizeCliAgentBookSource(resolvedSource.agentSource), 'utf-8');
        }

        return this.temporaryAgentPath;
    }
}

/**
 * Merges constructor defaults with per-run overrides.
 *
 * @private internal utility of `CliAgent`
 */
function mergeCliAgentRunOptions(defaults: CliAgentRunOptions, overrides: CliAgentRunOptions): CliAgentRunOptions {
    return {
        allowCredits: overrides.allowCredits ?? defaults.allowCredits,
        context: overrides.context ?? defaults.context,
        harness: overrides.harness ?? defaults.harness,
        isVerbose: overrides.isVerbose ?? defaults.isVerbose,
        model: overrides.model ?? defaults.model,
        noUi: overrides.noUi ?? defaults.noUi,
        thinkingLevel: overrides.thinkingLevel ?? defaults.thinkingLevel,
    };
}

/**
 * Reads and validates the harness name from the `PTBK_HARNESS` environment variable.
 *
 * @private internal utility of `CliAgent`
 */
function resolveCliAgentHarnessFromEnv(): CliAgentHarness | undefined {
    const envValue = process.env[PTBK_HARNESS_ENV];

    if (!envValue) {
        return undefined;
    }

    if (!(CLI_AGENT_HARNESS_NAMES as ReadonlyArray<string>).includes(envValue)) {
        throw new NotAllowed(
            spaceTrim(`
                Invalid value for \`${PTBK_HARNESS_ENV}\` environment variable: \`${envValue}\`

                Must be one of: ${CLI_AGENT_HARNESS_NAMES.join(', ')}
            `),
        );
    }

    return envValue as CliAgentHarness;
}

/**
 * Reads and validates the thinking level from the `PTBK_THINKING_LEVEL` environment variable.
 *
 * @private internal utility of `CliAgent`
 */
function resolveCliAgentThinkingLevelFromEnv(): CliAgentThinkingLevel | undefined {
    const envValue = process.env[PTBK_THINKING_LEVEL_ENV];

    if (!envValue) {
        return undefined;
    }

    if (!(CLI_AGENT_THINKING_LEVEL_VALUES as ReadonlyArray<string>).includes(envValue)) {
        throw new NotAllowed(
            spaceTrim(`
                Invalid value for \`${PTBK_THINKING_LEVEL_ENV}\` environment variable: \`${envValue}\`

                Must be one of: ${CLI_AGENT_THINKING_LEVEL_VALUES.join(', ')}
            `),
        );
    }

    return envValue as CliAgentThinkingLevel;
}

/**
 * Creates the stable temporary path used when `CliAgent` is initialized from in-memory Book source.
 *
 * @private internal utility of `CliAgent`
 */
function createCliAgentTemporaryBookPath(resolvedSource: ResolvedBookNodeAgentSource): string {
    const safeAgentName = normalizeCliAgentFileSegment(resolvedSource.agentName);
    const uniqueSuffix = `${Date.now().toString(36)}-${process.pid.toString(36)}`;

    return resolvePromptbookTemporaryPath(
        resolvedSource.currentWorkingDirectory,
        'book-3.0',
        'cli-agent',
        `${safeAgentName || 'agent'}-${uniqueSuffix}.book`,
    );
}

/**
 * Keeps in-memory Book source readable when persisted for the runner.
 *
 * @private internal utility of `CliAgent`
 */
function normalizeCliAgentBookSource(agentSource: string): string {
    return agentSource.endsWith('\n') ? agentSource : `${agentSource}\n`;
}

/**
 * Normalizes one filename segment used in temporary agent-book paths.
 *
 * @private internal utility of `CliAgent`
 */
function normalizeCliAgentFileSegment(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/gu, '-')
        .replace(/^[._-]+|[._-]+$/gu, '');
}
