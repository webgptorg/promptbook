import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { NotAllowed } from '../errors/NotAllowed';
import { resolvePromptbookTemporaryPath } from '../utils/filesystem/promptbookTemporaryPath';
import { $execCommand } from '../utils/execCommand/$execCommand';
import type { BookNodeAgentSourceOptions, ResolvedBookNodeAgentSource } from './BookNodeAgentSource';
import { resolveBookNodeAgentSource } from './BookNodeAgentSource';

/**
 * CLI harness names supported by `ptbk agent exec`.
 *
 * @public exported from `@promptbook/node`
 */
export type CliAgentHarness = 'openai-codex' | 'github-copilot' | 'cline' | 'claude-code' | 'opencode' | 'gemini';

/**
 * Thinking levels supported by CLI coding harnesses.
 *
 * @public exported from `@promptbook/node`
 */
export type CliAgentThinkingLevel = 'low' | 'medium' | 'high' | 'xhigh';

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
    readonly model?: string;
    readonly noUi?: boolean;
    readonly thinkingLevel?: CliAgentThinkingLevel;
};

/**
 * Constructor options for `CliAgent`.
 *
 * @public exported from `@promptbook/node`
 */
export type CliAgentOptions = BookNodeAgentSourceOptions &
    CliAgentRunOptions & {
        /**
         * Executable used for the wrapper command.
         *
         * @default ptbk
         */
        readonly command?: string;
    };

/**
 * Default executable used by `CliAgent`.
 *
 * @private internal constant of `CliAgent`
 */
const DEFAULT_CLI_AGENT_COMMAND = 'ptbk';

/**
 * Default non-interactive mode used by `CliAgent`.
 *
 * @private internal constant of `CliAgent`
 */
const DEFAULT_CLI_AGENT_IS_NO_UI = true;

/**
 * Lightweight JavaScript wrapper around `ptbk agent exec`.
 *
 * It uses the same CLI harnesses as Promptbook's agent command, making it the most faithful
 * way to run a local Book agent from Node.js when you want the CLI execution flow.
 *
 * @public exported from `@promptbook/node`
 */
export class CliAgent {
    private temporaryAgentPath: string | null = null;

    public constructor(private readonly options: CliAgentOptions) {}

    /**
     * Runs one non-interactive agent turn through `ptbk agent exec`.
     *
     * @param message - User message sent to the agent.
     * @param options - Optional per-run CLI overrides.
     * @returns Raw stdout emitted by the CLI command.
     */
    public async run(message: string, options: CliAgentRunOptions = {}): Promise<string> {
        const normalizedMessage = message.trim();

        if (!normalizedMessage) {
            throw new NotAllowed('Pass a non-empty message to `CliAgent.run(...)`.');
        }

        const resolvedSource = await resolveBookNodeAgentSource(this.options);
        const agentPath = await this.resolveExecutableAgentPath(resolvedSource);
        const mergedOptions = mergeCliAgentRunOptions(this.options, options);

        return $execCommand({
            command: this.options.command || DEFAULT_CLI_AGENT_COMMAND,
            args: createCliAgentExecArguments({
                agentPath,
                allowCredits: mergedOptions.allowCredits ?? false,
                context: mergedOptions.context,
                harness: mergedOptions.harness,
                message: normalizedMessage,
                model: mergedOptions.model,
                noUi: mergedOptions.noUi ?? DEFAULT_CLI_AGENT_IS_NO_UI,
                thinkingLevel: mergedOptions.thinkingLevel,
            }),
            cwd: resolvedSource.currentWorkingDirectory,
            crashOnError: true,
            timeout: Infinity,
            isVerbose: false,
        });
    }

    /**
     * Resolves the agent path passed to the CLI, materializing one temporary `.book` file when needed.
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
 * Merges constructor defaults with per-run CLI overrides.
 *
 * @private internal utility of `CliAgent`
 */
function mergeCliAgentRunOptions(defaults: CliAgentRunOptions, overrides: CliAgentRunOptions): CliAgentRunOptions {
    return {
        allowCredits: overrides.allowCredits ?? defaults.allowCredits,
        context: overrides.context ?? defaults.context,
        harness: overrides.harness ?? defaults.harness,
        model: overrides.model ?? defaults.model,
        noUi: overrides.noUi ?? defaults.noUi,
        thinkingLevel: overrides.thinkingLevel ?? defaults.thinkingLevel,
    };
}

/**
 * Builds CLI arguments for `ptbk agent exec`.
 *
 * @private internal utility of `CliAgent`
 */
function createCliAgentExecArguments(options: {
    readonly agentPath: string;
    readonly allowCredits: boolean;
    readonly context?: string;
    readonly harness?: CliAgentHarness;
    readonly message: string;
    readonly model?: string;
    readonly noUi: boolean;
    readonly thinkingLevel?: CliAgentThinkingLevel;
}): Array<string> {
    const argumentsList = ['agent', 'exec', '--agent', options.agentPath, '--message', options.message];

    if (options.harness) {
        argumentsList.push('--harness', options.harness);
    }

    if (options.model) {
        argumentsList.push('--model', options.model);
    }

    if (options.noUi) {
        argumentsList.push('--no-ui');
    }

    if (options.thinkingLevel) {
        argumentsList.push('--thinking-level', options.thinkingLevel);
    }

    if (options.allowCredits) {
        argumentsList.push('--allow-credits');
    }

    if (options.context?.trim()) {
        argumentsList.push('--context', options.context.trim());
    }

    return argumentsList;
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
 * Keeps in-memory Book source readable when persisted for the CLI wrapper.
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
