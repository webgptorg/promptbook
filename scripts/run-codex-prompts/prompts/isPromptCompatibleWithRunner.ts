import { normalizeToKebabCase } from '../../../src/utils/normalization/normalize-to-kebab-case';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';

/**
 * Names of the harness and model currently selected for a coder run.
 */
export type PromptRunnerIdentity = {
    /**
     * Stable harness identifier, for example `github-copilot`.
     */
    readonly harnessName?: string;
    /**
     * Effective model identifier, for example `gpt-5.5`.
     */
    readonly modelName?: string;
};

/**
 * Checks whether a prompt is unrestricted or matches the selected harness/model.
 *
 * A prompt status line can contain one or more backtick-delimited model or harness
 * names. Matching is intentionally based on normalized substrings so a token such as
 * `gpt` selects any `gpt-*` model and `opus` selects a `claude-opus-*` model.
 */
export function isPromptCompatibleWithRunner(
    file: PromptFile,
    section: PromptSection,
    promptRunnerIdentity?: PromptRunnerIdentity,
): boolean {
    if (promptRunnerIdentity === undefined) {
        return true;
    }

    const statusLine = section.statusLineIndex === undefined ? undefined : file.lines[section.statusLineIndex];
    const requiredRunnerTokens = statusLine === undefined ? [] : extractPromptRunnerTokens(statusLine);

    if (requiredRunnerTokens.length === 0) {
        return true;
    }

    const normalizedRunnerNames = [promptRunnerIdentity.harnessName, promptRunnerIdentity.modelName]
        .filter((name): name is string => name !== undefined && name.trim() !== '')
        .map((name) => normalizeToKebabCase(name))
        .filter((name) => name !== '');

    return requiredRunnerTokens.some((requiredRunnerToken) => {
        const normalizedRequiredRunnerToken = normalizeToKebabCase(requiredRunnerToken);

        return (
            normalizedRequiredRunnerToken !== '' &&
            normalizedRunnerNames.some((normalizedRunnerName) =>
                normalizedRunnerName.includes(normalizedRequiredRunnerToken),
            )
        );
    });
}

/**
 * Extracts model and harness tokens from a prompt status line.
 */
export function extractPromptRunnerTokens(statusLine: string): string[] {
    return Array.from(statusLine.matchAll(/`([^`]+)`/gu))
        .map((match) => match[1]?.trim() ?? '')
        .filter((token) => token !== '');
}
