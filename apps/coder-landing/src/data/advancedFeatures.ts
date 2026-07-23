import { DRY_RUN_COMMAND, VERIFY_COMMAND } from './commands';

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
        title: 'Human in the loop',
        description:
            'Confirm each prompt manually with --no-auto, press P to pause a running queue, or press X to end after the current prompt.',
        sampleCommand: 'ptbk coder run --harness claude-code --no-auto',
    },
    {
        title: 'Verify and archive',
        description:
            'Walk through completed prompts interactively, archive the finished ones to prompts/done/ and auto-append repair prompts for incomplete work.',
        sampleCommand: VERIFY_COMMAND,
    },
    {
        title: 'Pin a model or harness',
        description:
            'Require a model, harness, or whole model family for a prompt right in its [ ] line. The queue runs it only when the current model or harness matches — otherwise it is skipped.',
        sampleCommand: '[ ] use `gpt-5.5`',
    },
    {
        title: 'Cost and time, step by step',
        description:
            'Every finished prompt records what each step cost and how long it took — implementation, testing and fixing — right in its [x] line, instead of one lumped total.',
        sampleCommand: '[x] by Claude Code `claude-opus-4-8` - Implementation $8.01 6 hours; Testing 1 hour',
    },
];
