/**
 * Illustration shown for one core `ptbk coder` benefit.
 */
export type CoreBenefitIllustration = 'autopilot' | 'portable-agent' | 'git-synced-prd';

/**
 * One of the three core product benefits presented near the top of the landing page.
 */
export type CoreBenefitDefinition = {
    /**
     * Short label above the benefit title.
     */
    readonly label: string;

    /**
     * Headline of the benefit.
     */
    readonly title: string;

    /**
     * Concise explanation of the benefit.
     */
    readonly description: string;

    /**
     * Illustration which makes the benefit recognizable at a glance.
     */
    readonly illustration: CoreBenefitIllustration;
};

/**
 * The primary benefits of `ptbk coder`, presented as a visual three-card introduction.
 */
export const CORE_BENEFITS: ReadonlyArray<CoreBenefitDefinition> = [
    {
        label: 'No babysitting',
        title: 'Start the queue. Get back to your work.',
        description:
            'Put PRD markdown files in prompts/, start a run, and step away. Coder takes every task through implementation, your configured checks, feedback retries, and a commit before it moves on.',
        illustration: 'autopilot',
    },
    {
        label: 'No vendor lock-in',
        title: 'Keep your agent portable.',
        description:
            'Your behavior is a versioned .book file, not a vendor prompt box. Change --harness to move from Claude Code to OpenAI Codex, or use opencode with the provider — including local models — that you configure.',
        illustration: 'portable-agent',
    },
    {
        label: 'One source of truth',
        title: 'Let your PRD tell the truth.',
        description:
            'A successful task records its [x] state in the PRD and commits it with the code it describes. Revert that commit and both the implementation and its done state return together.',
        illustration: 'git-synced-prd',
    },
];
