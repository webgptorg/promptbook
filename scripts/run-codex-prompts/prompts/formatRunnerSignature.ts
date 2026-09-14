import type { ThinkingLevel } from '../../../src/cli/cli-commands/coder/ThinkingLevel';
import type { PromptRunnerMetadata } from '../common/PromptRunnerMetadata';

/**
 * Everything one runner signature can name, as far as it is known when the signature is formatted.
 */
export type FormatRunnerSignatureOptions = Partial<PromptRunnerMetadata> & {
    /**
     * Reasoning effort the harness runs the prompt with.
     */
    readonly thinkingLevel?: ThinkingLevel;
};

/**
 * Formats runner details for prompt status lines.
 *
 * Produces `` OpenAI Codex `gpt-5.6-luna` thinking `max` `` for a plain run and
 * `` Developer on OpenAI Codex `gpt-5.6-luna` thinking `max` `` for a run personalized with `--agent`.
 */
export function formatRunnerSignature(options: FormatRunnerSignatureOptions): string {
    const normalizedAgentName = options.agentName?.trim();
    const harnessSignature = formatHarnessSignature(options);

    if (!normalizedAgentName) {
        return harnessSignature;
    }

    return `${normalizedAgentName} on ${harnessSignature}`;
}

/**
 * Formats the harness part of one runner signature, which names the harness, its model and its thinking level.
 */
function formatHarnessSignature(options: FormatRunnerSignatureOptions): string {
    const normalizedRunner = options.runnerName?.trim();
    const normalizedModel = options.modelName?.trim();
    const thinkingLevelSuffix = options.thinkingLevel ? ` thinking \`${options.thinkingLevel}\`` : '';

    if (!normalizedRunner && !normalizedModel) {
        return 'unknown';
    }

    const runnerLabel = normalizedRunner || 'unknown';

    if (!normalizedModel) {
        return `${runnerLabel}${thinkingLevelSuffix}`;
    }

    return `${runnerLabel} \`${normalizedModel}\`${thinkingLevelSuffix}`;
}
