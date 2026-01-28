import type { Usage } from '../../../../src/execution/Usage';
import { uncertainNumber } from '../../../../src/execution/utils/uncertainNumber';
import { UNCERTAIN_USAGE } from '../../../../src/execution/utils/usage-constants';
import { OPENAI_MODELS } from '../../../../src/llm-providers/openai/openai-models';

const CODEX_TOKENS_VALUE_MATCHER = /(?<count>\d[\d,]*)/;
const CODEX_FALLBACK_PRICING_MODEL = 'gpt-5.1';

/**
 * Builds usage stats from Codex CLI output.
 */
export function buildCodexUsageFromOutput(output: string, modelName: string): Usage {
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
        if (!/^\s*tokens used\b/i.test(line)) {
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
