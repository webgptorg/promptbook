import {
    DRY_RUN_COMMAND,
    GENERATE_BOILERPLATES_COMMAND,
    INIT_GIT_SYNC_COMMAND,
    MODEL_FILTER_COMMAND,
    PING_COMMAND,
    TEST_BEFORE_FIX_COMMAND,
    VERIFY_COMMAND,
} from './commands';

/**
 * One advanced feature of `ptbk coder` presented as a card with a terminal snippet.
 */
export type AdvancedFeatureDefinition = {
    /**
     * Short title of the feature
     */
    readonly title: string;

    /**
     * One- or two-sentence description of the feature
     */
    readonly description: string;

    /**
     * Terminal snippet demonstrating the feature
     */
    readonly sampleCommand: string;
};

/**
 * Advanced features of `ptbk coder` shown in the features grid, from everyday to power-user.
 *
 * Note: Specified in [`specs/sections/advanced-features.md`](../../specs/sections/advanced-features.md)
 */
export const ADVANCED_FEATURES: ReadonlyArray<AdvancedFeatureDefinition> = [
    {
        title: 'Verified by your tests',
        description:
            'Run any test command after each prompt. Failures are fed back to the agent, which retries until the tests pass.',
        sampleCommand: 'ptbk coder run --harness claude-code --test npm test',
    },
    {
        title: 'Test before coding',
        description:
            'Run tests before the first coding prompt. Stop on pre-existing failures, or let one repair prompt fix them before the backlog starts.',
        sampleCommand: TEST_BEFORE_FIX_COMMAND,
    },
    {
        title: 'Commits with its own identity',
        description:
            'Every successful round is staged and committed under a dedicated agent git identity — optionally GPG-signed — so agent work is always attributable.',
        sampleCommand: 'CODING_AGENT_GIT_NAME="Promptbook Coding Agent"',
    },
    {
        title: 'Autopilot git',
        description:
            'Pull before prompts and push after commits, so a long-running queue stays in sync with your remote.',
        sampleCommand: 'ptbk coder run --harness claude-code --auto-pull --auto-push',
    },
    {
        title: 'Git-synced housekeeping',
        description:
            'ptbk coder init, add, generate-boilerplates and verify take the same --commit, --auto-push and --auto-pull switches, so bootstrapping a project, queueing prompts and archiving verified ones never leaves uncommitted work behind. Verify synchronizes around every single verification.',
        sampleCommand: INIT_GIT_SYNC_COMMAND,
    },
    {
        title: 'Isolated worktrees',
        description:
            'Implement every prompt in its own temporary git worktree with its own environment. Verified work is merged back into your branch as one commit; an unmergeable task is marked as failed and its worktree is kept for you. Deeply nested repositories are handled on Windows too.',
        sampleCommand: 'ptbk coder run --harness claude-code --isolate',
    },
    {
        title: 'Kanban web UI',
        description:
            'ptbk coder server keeps running after the queue is empty, watches for new prompt files and serves a Trello-style board where you can edit prompts in the browser.',
        sampleCommand: 'ptbk coder server --port 4441 --harness claude-code',
    },
    {
        title: 'Prompt priorities',
        description: 'Give prompts a priority and process only the range you want in the current run.',
        sampleCommand: 'ptbk coder run --harness claude-code --min-priority 1 --max-priority 5',
    },
    {
        title: 'Model-specific prompts',
        description:
            'Route a prompt to a model family or harness with a backtick token on its [ ] status line, such as [ ] use model `gpt-5.5`. Other runners skip it automatically.',
        sampleCommand: MODEL_FILTER_COMMAND,
    },
    {
        title: 'Pacing and retries',
        description:
            'Pace the queue with wall-clock wait durations that keep elapsing through pause and sleep, skip the active wait with S, and retry errors after a cool-down.',
        sampleCommand: 'ptbk coder run --harness claude-code --wait-between-prompts 30m --wait-after-error 10m',
    },
    {
        title: 'Dry run first',
        description: 'Preview which prompts would run — without touching your code or spending a single token.',
        sampleCommand: DRY_RUN_COMMAND,
    },
    {
        title: 'Ping before you queue',
        description:
            'ptbk coder ping sends one tiny dummy prompt to a harness and model and reports the answer, the response time and the usage. Use it to check that a harness, model and login really work, and to start the hourly or weekly quota window early so it is already refreshing by the time you need it. Your project is left exactly as it was.',
        sampleCommand: PING_COMMAND,
    },
    {
        title: 'Human in the loop',
        description:
            'Confirm each prompt manually with --no-auto, press P to pause a running queue, or press X to end after the current prompt.',
        sampleCommand: 'ptbk coder run --harness claude-code --no-auto',
    },
    {
        title: 'Verify and archive',
        description:
            'Successful coding rounds record the harness, model and selected thinking level in the prompt status line. Walk through completed prompts interactively, archive the finished ones to prompts/done/ and auto-append repair prompts for incomplete work.',
        sampleCommand: VERIFY_COMMAND,
    },
    {
        title: 'Many prompts per file',
        description:
            'ptbk coder generate-boilerplates writes one prompt per file by default (--count 5*1). Power users can batch a whole backlog into fewer files with the advanced --count N*M notation: N files with M prompts each, every prompt separated by a --- line, tagged with its own fresh emoji and run as its own task.',
        sampleCommand: GENERATE_BOILERPLATES_COMMAND,
    },
];
