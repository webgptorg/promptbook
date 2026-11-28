import { HARNESS_DEFAULT_MODELS } from '@promptbook-source/cli/cli-commands/common/harness/HARNESS_DEFAULT_MODELS';

/**
 * Identifier of one supported harness, matching the `--harness` CLI option of `ptbk coder`.
 */
export type HarnessName = keyof typeof HARNESS_DEFAULT_MODELS;

/**
 * One coding-agent harness which `ptbk coder` can drive.
 */
export type HarnessDefinition = {
    /**
     * CLI identifier passed to `--harness`
     */
    readonly harnessName: HarnessName;

    /**
     * Human-readable product name shown on the card
     */
    readonly displayName: string;

    /**
     * Vendor of the harness
     */
    readonly vendorName: string;

    /**
     * Short description of the harness for a developer who may not know it
     */
    readonly description: string;

    /**
     * Current flagship selected when `--model` and `PTBK_MODEL` are omitted
     */
    readonly defaultModel: string;

    /**
     * Example values for the `--model` option
     */
    readonly modelExamples: ReadonlyArray<string>;

    /**
     * Canonical shell sample shown on the card
     */
    readonly sampleCommand: string;

    /**
     * Accent color of the card and logo, roughly matching the vendor branding
     */
    readonly accentColor: string;
};

/**
 * All thinking levels accepted by `--thinking-level` for supported harnesses.
 */
export const THINKING_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;

/**
 * Catalog of all harnesses supported by `ptbk coder`.
 *
 * Note: This mirrors the harness list of the `ptbk coder` CLI
 *       and is specified in [`specs/content/harness-catalog.md`](../../specs/content/harness-catalog.md)
 */
export const HARNESS_CATALOG: ReadonlyArray<HarnessDefinition> = [
    {
        harnessName: 'claude-code',
        displayName: 'Claude Code',
        vendorName: 'Anthropic',
        description:
            'The agentic CLI by Anthropic. ptbk coder drives it through your whole prompt queue, with thinking levels up to max.',
        defaultModel: HARNESS_DEFAULT_MODELS['claude-code'],
        modelExamples: [HARNESS_DEFAULT_MODELS['claude-code'], 'opus', 'sonnet', 'haiku'],
        sampleCommand: 'ptbk coder run --harness claude-code --thinking-level max',
        accentColor: '#D97757',
    },
    {
        harnessName: 'openai-codex',
        displayName: 'OpenAI Codex',
        vendorName: 'OpenAI',
        description:
            'The OpenAI Codex CLI. Automatically uses the current flagship. Use --model default to keep your Codex configuration, and --allow-credits to opt into spending beyond your rate limits.',
        defaultModel: HARNESS_DEFAULT_MODELS['openai-codex'],
        modelExamples: [HARNESS_DEFAULT_MODELS['openai-codex'], 'default'],
        sampleCommand: 'ptbk coder run --harness openai-codex',
        accentColor: '#FFFFFF',
    },
    {
        harnessName: 'github-copilot',
        displayName: 'GitHub Copilot CLI',
        vendorName: 'GitHub',
        description:
            'GitHub Copilot in your terminal. Works out of the box with your Copilot subscription and supports thinking levels.',
        defaultModel: HARNESS_DEFAULT_MODELS['github-copilot'],
        modelExamples: [HARNESS_DEFAULT_MODELS['github-copilot'], 'default'],
        sampleCommand: 'ptbk coder run --harness github-copilot --thinking-level xhigh',
        accentColor: '#8957E5',
    },
    {
        harnessName: 'gemini',
        displayName: 'Gemini CLI',
        vendorName: 'Google',
        description: 'The Google Gemini CLI. Automatically selects the latest Gemini model for coding and agent tasks.',
        defaultModel: HARNESS_DEFAULT_MODELS.gemini,
        modelExamples: [HARNESS_DEFAULT_MODELS.gemini, 'default'],
        sampleCommand: 'ptbk coder run --harness gemini',
        accentColor: '#4E82EE',
    },
    {
        harnessName: 'qwen-code',
        displayName: 'Qwen Code',
        vendorName: 'Alibaba',
        description:
            'The Qwen Code CLI. Defaults to the current Qwen Max model and signs in with a Qwen account or an OpenAI-compatible API key.',
        defaultModel: HARNESS_DEFAULT_MODELS['qwen-code'],
        modelExamples: [HARNESS_DEFAULT_MODELS['qwen-code'], 'default'],
        sampleCommand: 'ptbk coder run --harness qwen-code',
        accentColor: '#615CED',
    },
    {
        harnessName: 'opencode',
        displayName: 'opencode',
        vendorName: 'opencode',
        description:
            'The open-source terminal coding agent. Defaults to the OpenAI flagship through your configured OpenAI provider. Use --model default to keep your own provider and model.',
        defaultModel: HARNESS_DEFAULT_MODELS.opencode,
        modelExamples: [HARNESS_DEFAULT_MODELS.opencode, 'default'],
        sampleCommand: 'ptbk coder run --harness opencode',
        accentColor: '#F0F0F0',
    },
    {
        harnessName: 'cline',
        displayName: 'Cline',
        vendorName: 'Cline Bot Inc.',
        description: 'The Cline CLI agent. The Google provider integration defaults to the latest Gemini coding model.',
        defaultModel: HARNESS_DEFAULT_MODELS.cline,
        modelExamples: [HARNESS_DEFAULT_MODELS.cline, 'default'],
        sampleCommand: 'ptbk coder run --harness cline',
        accentColor: '#9038FF',
    },
];
