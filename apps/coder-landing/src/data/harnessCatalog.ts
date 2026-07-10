/**
 * Identifier of one supported harness, matching the `--harness` CLI option of `ptbk coder`.
 */
export type HarnessName = 'claude-code' | 'openai-codex' | 'github-copilot' | 'gemini' | 'opencode' | 'cline';

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
     * Whether the `--model` option is required for this harness
     */
    readonly isModelRequired: boolean;

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
        isModelRequired: false,
        modelExamples: ['fable', 'opus', 'sonnet', 'haiku'],
        sampleCommand: 'ptbk coder run --harness claude-code --model fable --thinking-level max',
        accentColor: '#D97757',
    },
    {
        harnessName: 'openai-codex',
        displayName: 'OpenAI Codex',
        vendorName: 'OpenAI',
        description:
            'The OpenAI Codex CLI. Requires an explicit model; spending credits beyond rate limits is an explicit opt-in via --allow-credits.',
        isModelRequired: true,
        modelExamples: ['gpt-5.2-codex', 'default'],
        sampleCommand: 'ptbk coder run --harness openai-codex --model gpt-5.2-codex',
        accentColor: '#FFFFFF',
    },
    {
        harnessName: 'github-copilot',
        displayName: 'GitHub Copilot CLI',
        vendorName: 'GitHub',
        description:
            'GitHub Copilot in your terminal. Works out of the box with your Copilot subscription and supports thinking levels.',
        isModelRequired: false,
        modelExamples: ['gpt-5.4'],
        sampleCommand: 'ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh',
        accentColor: '#8957E5',
    },
    {
        harnessName: 'gemini',
        displayName: 'Gemini CLI',
        vendorName: 'Google',
        description: 'The Google Gemini CLI. Requires an explicit model such as the fast flash previews.',
        isModelRequired: true,
        modelExamples: ['gemini-3-flash-preview', 'default'],
        sampleCommand: 'ptbk coder run --harness gemini --model gemini-3-flash-preview',
        accentColor: '#4E82EE',
    },
    {
        harnessName: 'opencode',
        displayName: 'opencode',
        vendorName: 'opencode',
        description:
            'The open-source terminal coding agent. Bring any provider configured in your opencode installation.',
        isModelRequired: false,
        modelExamples: [],
        sampleCommand: 'ptbk coder run --harness opencode',
        accentColor: '#F0F0F0',
    },
    {
        harnessName: 'cline',
        displayName: 'Cline',
        vendorName: 'Cline Bot Inc.',
        description: 'The Cline CLI agent. Uses the models configured in your Cline setup.',
        isModelRequired: false,
        modelExamples: [],
        sampleCommand: 'ptbk coder run --harness cline',
        accentColor: '#9038FF',
    },
];
