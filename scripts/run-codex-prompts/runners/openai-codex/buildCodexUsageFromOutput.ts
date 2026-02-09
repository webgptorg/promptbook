import type { Usage } from '../../../../src/execution/Usage';
import { uncertainNumber } from '../../../../src/execution/utils/uncertainNumber';
import { UNCERTAIN_USAGE } from '../../../../src/execution/utils/usage-constants';
import { OPENAI_MODELS } from '../../../../src/llm-providers/openai/openai-models';

const CODEX_TOKENS_VALUE_MATCHER = /(?<count>\d[\d,]*)/;
const CODEX_FALLBACK_PRICING_MODEL = 'gpt-5.1';

/**
 * Heuristic share of the total tokens that are expected to come from completion tokens
 * when Codex only reports a single total value.
 */
export const DEFAULT_CODEX_COMPLETION_SHARE = 0.1;

type CodexTokenBreakdown = {
    total?: number;
    prompt?: number;
    completion?: number;
    cached?: number;
};

type CodexTokenCounts = {
    readonly totalTokens: number;
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly usedFallbackShare: boolean;
};

/**
 * Builds usage stats from Codex CLI output.
 */
export function buildCodexUsageFromOutput(output: string, modelName: string): Usage {
    const breakdown = parseCodexTokenBreakdown(output);
    const counts = resolveCodexTokenCounts(breakdown);
    if (!counts) {
        return UNCERTAIN_USAGE;
    }

    const pricing = resolveCodexPricing(modelName);
    if (!pricing) {
        return UNCERTAIN_USAGE;
    }

    const estimatedPrice = counts.promptTokens * pricing.prompt + counts.completionTokens * pricing.output;

    return {
        ...UNCERTAIN_USAGE,
        price: uncertainNumber(estimatedPrice, counts.usedFallbackShare),
        input: {
            ...UNCERTAIN_USAGE.input,
            tokensCount: uncertainNumber(counts.totalTokens),
        },
        output: {
            ...UNCERTAIN_USAGE.output,
            tokensCount: uncertainNumber(counts.completionTokens, counts.usedFallbackShare),
        },
    };
}

/**
 * Extracts a structured summary of tokens reported by Codex CLI.
 */
function parseCodexTokenBreakdown(output: string): CodexTokenBreakdown {
    const lines = output.split(/\r?\n/);
    const startIndex = lines.findIndex((line) => /^\s*tokens used\b/i.test(line));
    if (startIndex === -1) {
        return {};
    }

    const breakdown: CodexTokenBreakdown = {};
    let hasCapturedValue = false;

    for (let i = startIndex; i < lines.length; i++) {
        const rawLine = lines[i];
        if (rawLine === undefined) {
            continue;
        }
        const trimmed = rawLine.trim();

        if (trimmed === '') {
            if (hasCapturedValue) {
                break;
            }
            continue;
        }

        const match = trimmed.match(CODEX_TOKENS_VALUE_MATCHER);
        if (!match?.groups?.count) {
            continue;
        }

        const parsed = parseCodexTokenCount(match.groups.count);
        if (parsed === undefined) {
            continue;
        }

        hasCapturedValue = true;
        const normalized = trimmed.toLowerCase();
        if (assignCodexTokenValue(breakdown, normalized, parsed, i === startIndex)) {
            continue;
        }

        if (breakdown.total === undefined) {
            breakdown.total = parsed;
        }
    }

    return breakdown;
}

/**
 * Converts the breakdown from the CLI into deterministic prompt/completion counts.
 */
function resolveCodexTokenCounts(breakdown: CodexTokenBreakdown): CodexTokenCounts | undefined {
    const totalTokens =
        breakdown.total ??
        (breakdown.prompt !== undefined && breakdown.completion !== undefined
            ? breakdown.prompt + breakdown.completion
            : undefined);

    if (totalTokens === undefined) {
        return undefined;
    }

    let promptTokens = breakdown.prompt;
    let completionTokens = breakdown.completion;
    let usedFallbackShare = false;

    if (promptTokens === undefined && completionTokens !== undefined) {
        promptTokens = totalTokens - completionTokens;
    }

    if (completionTokens === undefined && promptTokens !== undefined) {
        completionTokens = totalTokens - promptTokens;
    }

    if (promptTokens === undefined || completionTokens === undefined) {
        usedFallbackShare = true;
        const fallbackCompletion = Math.round(totalTokens * DEFAULT_CODEX_COMPLETION_SHARE);
        completionTokens = fallbackCompletion;
        promptTokens = totalTokens - fallbackCompletion;
    }

    promptTokens = Math.max(promptTokens ?? 0, 0);
    completionTokens = Math.max(completionTokens ?? 0, 0);

    return {
        totalTokens,
        promptTokens,
        completionTokens,
        usedFallbackShare,
    };
}

/**
 * Assigns the parsed number to the appropriate bucket based on the line content.
 */
function assignCodexTokenValue(
    breakdown: CodexTokenBreakdown,
    normalizedLine: string,
    value: number,
    isTokensLine: boolean,
): boolean {
    if (normalizedLine.includes('cache')) {
        breakdown.cached = value;
        return true;
    }

    if (normalizedLine.includes('prompt') || (normalizedLine.includes('input') && !normalizedLine.includes('completion'))) {
        breakdown.prompt = value;
        return true;
    }

    if (normalizedLine.includes('completion') || normalizedLine.includes('output')) {
        breakdown.completion = value;
        return true;
    }

    if (normalizedLine.includes('total') || normalizedLine.includes('tokens used') || isTokensLine) {
        breakdown.total = breakdown.total ?? value;
        return true;
    }

    return false;
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
