import type { Usage } from '../../../src/execution/Usage';
import { uncertainNumber } from '../../../src/execution/utils/uncertainNumber';
import { UNCERTAIN_USAGE } from '../../../src/execution/utils/usage-constants';
import { OPENAI_MODELS } from '../../../src/llm-providers/openai/openai-models';
import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { PromptRunner, PromptRunOptions, PromptRunResult } from './_PromptRunner';
import { createCodingContext } from './createCodingContext';
import { $runGoScriptUntilMarkerIdle, toPosixPath } from './utils/$runGoScript';

const CODEX_COMPLETION_LINE = /^\s*tokens used\b/i;
const CODEX_TOKENS_VALUE_MATCHER = /(?<count>\d[\d,]*)/;
const CODEX_FALLBACK_PRICING_MODEL = 'gpt-5.1';
const CODEX_COMPLETION_IDLE_MS = 60 * 1000;

/**
 * Runs prompts via the OpenAI Codex CLI.
 */
export class OpenAiCodexRunner implements PromptRunner {
    public readonly name = 'codex';

    /**
     * Creates a new Codex runner.
     */
    public constructor(
        private readonly options: {
            codexCommand: string;
            model: string;
            sandbox: string;
            askForApproval: string;
        },
    ) {}

    /**
     * Runs the Codex prompt in a temporary script and waits for completion output.
     */
    public async runPrompt(options: PromptRunOptions): Promise<PromptRunResult> {
        const scriptContent = buildCodexScript({
            prompt: options.prompt,
            projectPath: options.projectPath,
            model: this.options.model,
            sandbox: this.options.sandbox,
            askForApproval: this.options.askForApproval,
            codexCommand: this.options.codexCommand,
        });

        const output = await $runGoScriptUntilMarkerIdle({
            scriptPath: options.scriptPath,
            scriptContent,
            completionLineMatcher: CODEX_COMPLETION_LINE,
            idleTimeoutMs: CODEX_COMPLETION_IDLE_MS,
        });

        return { usage: buildCodexUsageFromOutput(output, this.options.model) };
    }
}

/**
 * Builds usage stats from Codex CLI output.
 */
function buildCodexUsageFromOutput(output: string, modelName: string): Usage {
    const tokensUsed = parseCodexTokensUsed(output);
    if (tokensUsed === undefined) {
        return UNCERTAIN_USAGE;
    }

    const pricing = resolveCodexPricing(modelName);
    if (!pricing) {
        return UNCERTAIN_USAGE;
    }

    const estimatedPrice = tokensUsed * (pricing.prompt + pricing.output) * 0.5;

    return {
        ...UNCERTAIN_USAGE,
        price: uncertainNumber(estimatedPrice, true),
        input: {
            ...UNCERTAIN_USAGE.input,
            tokensCount: uncertainNumber(tokensUsed, true),
        },
    };
}

/**
 * Extracts total tokens used from Codex CLI output.
 */
function parseCodexTokensUsed(output: string): number | undefined {
    const lines = output.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!CODEX_COMPLETION_LINE.test(line)) {
            continue;
        }

        const inlineMatch = line.match(CODEX_TOKENS_VALUE_MATCHER);
        if (inlineMatch?.groups?.count) {
            return parseCodexTokenCount(inlineMatch.groups.count);
        }

        const nextLine = lines.slice(i + 1).find((candidate) => candidate.trim() !== '');
        if (!nextLine) {
            return undefined;
        }

        const nextMatch = nextLine.match(CODEX_TOKENS_VALUE_MATCHER);
        if (nextMatch?.groups?.count) {
            return parseCodexTokenCount(nextMatch.groups.count);
        }

        return undefined;
    }

    return undefined;
}

/**
 * Parses a token count that may include thousands separators.
 */
function parseCodexTokenCount(value: string): number | undefined {
    const normalized = value.replace(/,/g, '');
    const parsed = Number.parseInt(normalized, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Resolves a pricing model to estimate Codex cost from total tokens.
 */
function resolveCodexPricing(modelName: string): { prompt: number; output: number } | undefined {
    const exactMatch = OPENAI_MODELS.find((model) => model.modelName === modelName)?.pricing;
    if (exactMatch) {
        return exactMatch;
    }

    const prefixMatch = OPENAI_MODELS.find((model) => modelName.startsWith(model.modelName))?.pricing;
    if (prefixMatch) {
        return prefixMatch;
    }

    return OPENAI_MODELS.find((model) => model.modelName === CODEX_FALLBACK_PRICING_MODEL)?.pricing;
}

/**
 * Options for building the Codex shell script.
 */
type CodexScriptOptions = {
    prompt: string;
    projectPath: string;
    model: string;
    sandbox: string;
    askForApproval: string;
    codexCommand: string;
};

/**
 * Builds the shell script that runs Codex with the prompt and coding context.
 */
function buildCodexScript(options: CodexScriptOptions): string {
    const delimiter = 'CODEX_PROMPT';
    const projectPath = toPosixPath(options.projectPath);

    return spaceTrim(
        (block) => `
            ${options.codexCommand} \\
              --ask-for-approval ${options.askForApproval} \\
              exec --model ${options.model} \\
              --sandbox ${options.sandbox} \\
              -C ${projectPath} \\
              <<'${delimiter}'

            ${block(options.prompt)}

            ${block(createCodingContext())}

            ${delimiter}
        `,
    );
}
