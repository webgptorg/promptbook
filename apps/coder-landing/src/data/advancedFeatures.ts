import {
    DRY_RUN_COMMAND,
    GENERATE_BOILERPLATES_COMMAND,
    INIT_GIT_SYNC_COMMAND,
    MODEL_FILTER_COMMAND,
    PING_COMMAND,
    PING_PERIOD_COMMAND,
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
            'Run any test command after each prompt. When it fails, ptbk coder hands the output back to the agent, which retries until the tests pass.',
        sampleCommand: 'ptbk coder run --harness claude-code --test npm test',
    },
    {
        title: 'Test before coding',
        description:
            'Run the tests before the first coding prompt. Stop on failures that were already there, or let one repair prompt fix them before the backlog starts.',
        sampleCommand: TEST_BEFORE_FIX_COMMAND,
    },
    {
        title: 'Commits with its own identity',
        description:
            'Every successful round lands under a git identity that belongs to the agent, GPG-signed if you set that up. You can always tell which commits it wrote.',
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
            'ptbk coder init, add, generate-boilerplates and verify all take the same --commit, --auto-push and --auto-pull switches. Setting up a project, queueing prompts and archiving finished ones leave no uncommitted work behind. Verify pulls and pushes around every single verification.',
        sampleCommand: INIT_GIT_SYNC_COMMAND,
    },
    {
        title: 'Isolated worktrees',
        description:
            'Implement every prompt in its own temporary git worktree with its own environment. Verified work lands back on your branch as one commit. If a task will not merge, ptbk coder marks it failed and keeps its worktree so you can look at it. Deeply nested repositories work on Windows too.',
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
            'Route a prompt to a model family or harness with a backtick token on its [ ] status line, such as [ ] use model `gpt-5.5`. Other runners skip it.',
        sampleCommand: MODEL_FILTER_COMMAND,
    },
    {
        title: 'Pacing and retries',
        description:
            'Wait a fixed wall-clock duration between prompts. The clock keeps running through a pause and through sleep, and errors retry after a cool-down. Whenever S is offered it skips whatever the coder waits for right now, down to the harness session limit that would otherwise hold the run for hours.',
        sampleCommand: 'ptbk coder run --harness claude-code --wait-between-prompts 30m --wait-after-error 10m',
    },
    {
        title: 'Dry run first',
        description: 'Preview which prompts would run. No files touched, no tokens spent.',
        sampleCommand: DRY_RUN_COMMAND,
    },
    {
        title: 'Ping before you queue',
        description:
            'ptbk coder ping sends one tiny dummy prompt to a harness and model and reports the answer, the response time and the usage. Use it to check that a harness, model and login work before you queue anything. It also opens the hourly or weekly quota window early, so the quota is already refreshing by the time you need it. It touches nothing in your project.',
        sampleCommand: PING_COMMAND,
    },
    {
        title: 'Keep the 5-hour window rolling',
        description:
            'Add --period and the ping repeats until you stop it with CTRL+C. One ping every 5h holds the Claude Code 5-hour limit window open, so a queue you start at any hour already has a refreshing window waiting for it. That costs a handful of tokens per ping instead of a run you have to babysit.',
        sampleCommand: PING_PERIOD_COMMAND,
    },
    {
        title: 'Human in the loop',
        description:
            'Confirm each prompt yourself with --no-auto. Press P to pause a running queue, or X to end it after the current prompt. Every press is answered in the Controls panel on the next frame, so you can tell that the key landed even when it changed nothing.',
        sampleCommand: 'ptbk coder run --harness claude-code --no-auto',
    },
    {
        title: 'Live status in the prompt file',
        description:
            'A prompt turns from [ ] into [^] the moment the agent picks it up, and the line names the step that is running. It only becomes [x] after the work is implemented, verified and committed. ptbk coder never reverts a [^], so if the queue is killed or crashes you can see which task was left half-done.',
        sampleCommand: '[^] by OpenAI Codex `gpt-5.6-luna` - Implementation in progress',
    },
    {
        title: 'Verify and archive',
        description:
            'Every successful round writes the harness, model and thinking level into the prompt status line. Walk through completed prompts one by one, archive the finished ones to prompts/done/, and get a repair prompt appended for anything left incomplete. Pick the order with --order from-earliest, from-latest or random.',
        sampleCommand: VERIFY_COMMAND,
    },
    {
        title: 'Many prompts per file',
        description:
            'ptbk coder generate-boilerplates writes one prompt per file by default (--count 5*1). Use --count N*M to pack a whole backlog into fewer files: N files with M prompts each. A --- line separates the sections, every file carries one fresh emoji tag, and each section still runs as its own task.',
        sampleCommand: GENERATE_BOILERPLATES_COMMAND,
    },
];
