import { SERVER_COMMAND } from './commands';

/**
 * Visual tone of one line in the fake live terminal.
 */
export type LiveDemoLineTone = 'command' | 'plain' | 'success' | 'info' | 'muted' | 'accent';

/**
 * One scripted line of the fake live terminal.
 */
export type LiveDemoLine = {
    /**
     * How the line is rendered and animated:
     * - `command` lines are typed character by character after a `$ ` prompt
     * - all other tones are printed at once after their delay
     */
    readonly tone: LiveDemoLineTone;

    /**
     * Text content of the line
     */
    readonly text: string;

    /**
     * How long to wait before this line starts appearing, in milliseconds
     */
    readonly delayMs: number;
};

/**
 * Scripted `ptbk coder server` session played in the fake live terminal.
 *
 * Note: Specified in [`specs/components/live-terminal.md`](../../specs/components/live-terminal.md)
 */
export const LIVE_DEMO_SCRIPT: ReadonlyArray<LiveDemoLine> = [
    { tone: 'command', text: SERVER_COMMAND, delayMs: 600 },
    { tone: 'accent', text: '▶ Promptbook Coder', delayMs: 700 },
    { tone: 'success', text: '✔ Working tree clean', delayMs: 350 },
    { tone: 'success', text: '✔ Agent identity: Promptbook Coding Agent <coding-agent@promptbook.studio>', delayMs: 300 },
    { tone: 'success', text: '✔ Kanban UI running at http://localhost:4441', delayMs: 400 },
    { tone: 'info', text: '● Queue: 3 prompts waiting', delayMs: 500 },
    { tone: 'plain', text: '', delayMs: 200 },
    { tone: 'accent', text: '▶ prompts/add-dark-mode.md', delayMs: 700 },
    { tone: 'muted', text: '  Add a dark mode toggle to the settings page…', delayMs: 400 },
    { tone: 'muted', text: '  ⠋ claude-code (fable, thinking: max) is working…', delayMs: 1600 },
    { tone: 'plain', text: '  4 files changed (+182 −23)', delayMs: 900 },
    { tone: 'success', text: '  ✔ npm run test-for-ptbk-coder → 128 passed', delayMs: 700 },
    { tone: 'success', text: '  ✔ Committed a1b2c3d "Add dark mode toggle to settings"', delayMs: 500 },
    { tone: 'plain', text: '', delayMs: 200 },
    { tone: 'accent', text: '▶ prompts/fix-login-redirect.md', delayMs: 800 },
    { tone: 'muted', text: '  Fix the redirect loop after login on expired sessions…', delayMs: 400 },
    { tone: 'muted', text: '  ⠋ claude-code (fable, thinking: max) is working…', delayMs: 1600 },
    { tone: 'plain', text: '  2 files changed (+41 −7)', delayMs: 900 },
    { tone: 'success', text: '  ✔ npm run test-for-ptbk-coder → 128 passed', delayMs: 700 },
    { tone: 'success', text: '  ✔ Committed b4e5f6a "Fix login redirect loop"', delayMs: 500 },
    { tone: 'plain', text: '', delayMs: 200 },
    { tone: 'info', text: '● Queue: 1 prompt waiting — watching prompts/ for new files…', delayMs: 600 },
];

/**
 * How long the fake live terminal rests after the script finishes before it loops again, in milliseconds.
 */
export const LIVE_DEMO_LOOP_PAUSE_MS = 5000;

/**
 * How long the fake live terminal waits between typing two characters of a command, in milliseconds.
 */
export const LIVE_DEMO_TYPING_INTERVAL_MS = 12;
