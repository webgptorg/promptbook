import 'server-only';

import { access, readFile } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import type { string_book } from '@promptbook-source/book-2.0/agent-source/string_book';
import { buildCoderRunAgentVisual } from '../../../../scripts/run-codex-prompts/ui/buildCoderRunAgentVisual';
import {
    buildCoderRunUiFrame,
    type BuildCoderRunUiFrameOptions,
} from '../../../../scripts/run-codex-prompts/ui/buildCoderRunUiFrame';
import { stripAnsi } from '../../../../scripts/run-codex-prompts/ui/coderRunUiText';
import type { LiveDemoFrame } from './liveDemoScript';

/**
 * Width used by the real `ptbk coder run` dashboard in the landing preview.
 */
const LIVE_DEMO_TERMINAL_WIDTH = 60;

/**
 * Stable prompt label used in the landing preview, matching the real prompt that created this page.
 */
const LIVE_DEMO_PROMPT_LABEL = 'prompts/2026-07-0200-ptbk-coder-web.md#1';

/**
 * Fallback agent source used when the repository-local coding agent file is not available during a deployed build.
 */
const FALLBACK_LIVE_DEMO_AGENT_SOURCE = spaceTrim(`
    Promptbook Developer

    META VISUAL AsciiOctopus
`) as string_book;

/**
 * Candidate locations of the real coding agent book from the current Next.js build working directory.
 */
const LIVE_DEMO_AGENT_SOURCE_PATH_CANDIDATES = [
    join(process.cwd(), 'agents/coding/developer.book'),
    join(process.cwd(), '../../agents/coding/developer.book'),
];

/**
 * Live output lines shown in the final real-run dashboard snapshot.
 */
const LIVE_DEMO_FINAL_OUTPUT_LINES = [
    '   - Local:        http://localhost:4440',
    '   - Network:      http://172.23.224.1:4440',
    ' ✓ Starting...',
    ' ✓ Ready in 4.6s',
    '(node:33208) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.',
    '(Use `node --trace-deprecation ...` to show where the warning was created)',
    'Prerendered home page and saved to C:\\Users\\me\\work\\ai\\promptbook\\apps\\agents-server\\.next\\server\\app\\page.html',
    '🎉 All tests passed!',
];

/**
 * Builds the dashboard frames shown by the landing page live terminal.
 *
 * @returns Serialized terminal snapshots rendered through the real `ptbk coder run` UI builder.
 */
export async function createLiveDemoFrames(): Promise<ReadonlyArray<LiveDemoFrame>> {
    const agentSource = await readLiveDemoAgentSource();
    const agentVisual = await buildCoderRunAgentVisual(agentSource);
    const agentVisualFrameLines = agentVisual?.renderFrame({ animationTimeMs: 3600 }) || undefined;

    return LIVE_DEMO_FRAME_OPTIONS.map((frameOptions) => ({
        delayMs: frameOptions.delayMs,
        lines: buildCoderRunUiFrame({
            ...frameOptions.options,
            agentVisualLines: agentVisualFrameLines,
        }).map(stripAnsi),
    }));
}

/**
 * Reads the real coding agent source when the monorepo file is present.
 */
async function readLiveDemoAgentSource(): Promise<string_book> {
    for (const candidatePath of LIVE_DEMO_AGENT_SOURCE_PATH_CANDIDATES) {
        if (await isReadableFile(candidatePath)) {
            return (await readFile(candidatePath, 'utf8')) as string_book;
        }
    }

    return FALLBACK_LIVE_DEMO_AGENT_SOURCE;
}

/**
 * Checks whether a file path can be read.
 */
async function isReadableFile(filePath: string): Promise<boolean> {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Frame inputs matching representative states of a real limited `ptbk coder run`.
 */
const LIVE_DEMO_FRAME_OPTIONS: ReadonlyArray<{
    readonly delayMs: number;
    readonly options: BuildCoderRunUiFrameOptions;
}> = [
    {
        delayMs: 1800,
        options: createLiveDemoFrameOptions({
            animationFrame: 0,
            animationTimeMs: 1200,
            spinner: '⠋',
            phase: 'loading',
            statusMessage: 'Loading prompt queue and resolving the coding agent.',
            detailLines: ['Scanning prompts/ and reading shared context from AGENTS.md.'],
            agentOutputLines: ['Reading prompt files from prompts/', 'Resolved agent source agents/coding/developer.book'],
        }),
    },
    {
        delayMs: 2200,
        options: createLiveDemoFrameOptions({
            animationFrame: 1,
            animationTimeMs: 2600,
            spinner: '⠙',
            phase: 'running',
            statusMessage: 'Running claude-code for the current prompt.',
            detailLines: ['Waiting for the coding harness to finish attempt 1.'],
            agentOutputLines: [
                'Launching claude-code with model fable',
                'Applying repository instructions from AGENTS.md',
                'Editing apps/coder-landing/src/components/LiveTerminalDemo/LiveTerminalDemo.tsx',
                'Editing apps/coder-landing/src/data/liveDemoScript.ts',
            ],
        }),
    },
    {
        delayMs: 2200,
        options: createLiveDemoFrameOptions({
            animationFrame: 2,
            animationTimeMs: 4200,
            spinner: '⠹',
            phase: 'verifying',
            statusMessage: 'Running verification after attempt 1.',
            detailLines: ['Executing npm run test-for-ptbk-coder before the run can finish.'],
            agentOutputLines: [
                'Launching claude-code with model fable',
                'Editing apps/coder-landing/src/components/LiveTerminalDemo/LiveTerminalDemo.tsx',
                'Running npm run test-for-ptbk-coder',
                '   - Local:        http://localhost:4440',
                ' ✓ Starting...',
                ' ✓ Ready in 4.6s',
            ],
        }),
    },
    {
        delayMs: 3600,
        options: createLiveDemoFrameOptions({
            animationFrame: 3,
            animationTimeMs: 5800,
            spinner: '⠸',
            phase: 'done',
            statusMessage: 'Run limit reached after 1 prompt run.',
            detailLines: [],
            agentOutputLines: LIVE_DEMO_FINAL_OUTPUT_LINES,
        }),
    },
];

/**
 * Builds one complete frame input while keeping stable session metadata in one place.
 */
function createLiveDemoFrameOptions(
    overrides: Partial<BuildCoderRunUiFrameOptions>,
): BuildCoderRunUiFrameOptions {
    return {
        terminalWidth: LIVE_DEMO_TERMINAL_WIDTH,
        animationFrame: 0,
        animationTimeMs: 0,
        spinner: '⠋',
        pauseState: 'RUNNING',
        pauseTargetLabel: 'the next task',
        config: {
            agentName: 'claude-code',
            modelName: 'fable',
            thinkingLevel: 'xhigh',
            context: 'AGENTS.md',
            priority: 0,
            limit: 1,
            testCommand: 'npm run test-for-ptbk-coder',
        },
        phase: 'running',
        currentPromptLabel: LIVE_DEMO_PROMPT_LABEL,
        currentAttempt: 1,
        maxAttempts: 3,
        statusMessage: 'Running claude-code for the current prompt.',
        detailLines: [],
        pendingEnterLabel: undefined,
        agentOutputLines: [],
        errors: [],
        progress: {
            totalPrompts: 363,
            sessionDone: 0,
            sessionTotal: 7,
            sessionRemaining: 7,
            currentPromptIndex: 1,
            skippedPrompts: 0,
            toBeWrittenPrompts: 113,
            percentage: 0,
            elapsedText: '5h 34m',
            estimatedTotalText: 'estimating...',
            estimatedLabel: 'after first completion',
            isEstimatedTotalKnown: false,
        },
        ...overrides,
    };
}
