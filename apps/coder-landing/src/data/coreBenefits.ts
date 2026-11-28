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
            'Put your PRD markdown files in prompts/ and start a run. ptbk coder implements each task, runs the checks you configured, feeds every failure back to the agent, and commits before it moves to the next one.',
        illustration: 'autopilot',
    },
    {
        label: 'No vendor lock-in',
        title: 'Keep your agent portable.',
        description:
            'The behavior of the agent lives in a .book file you commit next to the code, not in one vendor prompt box. Change --harness and the same queue runs on Claude Code or OpenAI Codex. With opencode you point it at whatever provider you configured, local models included.',
        illustration: 'portable-agent',
    },
    {
        label: 'One source of truth',
        title: 'Let your PRD tell the truth.',
        description:
            'When a task passes, ptbk coder writes its [x] into the PRD and puts that line in the same commit as the code it describes. Revert the commit and the checkbox goes back to [ ] together with the code.',
        illustration: 'git-synced-prd',
    },
];
