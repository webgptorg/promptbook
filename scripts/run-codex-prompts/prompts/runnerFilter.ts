import { normalizeToKebabCase } from '../../../src/utils/normalization/normalize-to-kebab-case';
import type { PromptSection } from './types/PromptSection';

/**
 * Model and harness that `ptbk coder` is currently running with.
 *
 * Used to decide whether a prompt that requires a specific model or harness may run in this session.
 * Both fields are optional because some runners do not expose a concrete model name.
 */
export type RunnerFilter = {
    /**
     * Effective model name used for the run (for example `gpt-5.5`), when known.
     */
    readonly model?: string;

    /**
     * Harness name used for the run (for example `github-copilot`), when known.
     */
    readonly harness?: string;
};

/**
 * Checks whether a prompt section is allowed to run with the given model and harness.
 *
 * A prompt without any required model or harness token always matches. When the runner is unknown
 * (no `runnerFilter`, for example during dry runs or verification) no filtering is applied. Otherwise
 * the prompt matches when at least one of its tokens matches either the model or the harness.
 */
export function isPromptInRunnerFilter(section: PromptSection, runnerFilter?: RunnerFilter): boolean {
    if (section.requiredModelOrHarnessTokens.length === 0) {
        return true;
    }

    if (runnerFilter === undefined) {
        return true;
    }

    return section.requiredModelOrHarnessTokens.some((token) =>
        isModelOrHarnessTokenMatchingRunner(token, runnerFilter),
    );
}

/**
 * Checks whether one required token matches the running model or harness by normalized name.
 */
function isModelOrHarnessTokenMatchingRunner(token: string, runnerFilter: RunnerFilter): boolean {
    const normalizedToken = normalizeToKebabCase(token);
    if (normalizedToken === '') {
        return false;
    }

    return (
        isNormalizedTokenWithinName(normalizedToken, runnerFilter.model) ||
        isNormalizedTokenWithinName(normalizedToken, runnerFilter.harness)
    );
}

/**
 * Checks whether a normalized token appears as a whole dash-delimited segment run inside the
 * normalized model or harness name.
 *
 * Matching whole segments (instead of a plain substring) lets a family token such as `gpt` match
 * `gpt-5-5` and `opus` match `claude-opus-4-8`, while keeping `claude-opus` from matching `gpt-5-5`
 * and preventing partial-segment false positives such as `op` matching `claude-opus-4-8`.
 */
function isNormalizedTokenWithinName(normalizedToken: string, name: string | undefined): boolean {
    if (name === undefined || name === '') {
        return false;
    }

    const normalizedName = normalizeToKebabCase(name);
    if (normalizedName === '') {
        return false;
    }

    return `-${normalizedName}-`.includes(`-${normalizedToken}-`);
}

// Note: [🟡] Code for runner filtering [runnerFilter](scripts/run-codex-prompts/prompts/runnerFilter.ts) should never be published outside of `@promptbook/cli`
