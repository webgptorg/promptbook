import colors from 'colors';
import type { BuildCoderRunUiFrameOptions } from './buildCoderRunUiFrame';
import { buildVisibleOutputLines, renderBox } from './buildRunUiFrameShared';
import { sanitizeTerminalText, wrapTerminalText } from './coderRunUiText';

/** Matches the maximum width of the shared Coder dashboard. */
const MAX_CHECK_REPAIR_FRAME_WIDTH = 96;

/** Renders a finite check/repair job without queue statistics, priority scope, or next-task controls. */
export function buildCoderCheckRepairUiFrame(options: BuildCoderRunUiFrameOptions): string[] {
    const width = Math.max(6, Math.min(MAX_CHECK_REPAIR_FRAME_WIDTH, options.terminalWidth - 1));
    const bodyWidth = Math.max(1, width - 4);
    const jobLines = [
        `Check: ${options.config.checkCommand ?? ''}`,
        `Job: ${options.currentPromptLabel || 'Project checks'}`,
        `Status: ${options.statusMessage}`,
        'Exit after check/repair; ordinary PRDs are left alone.',
    ].flatMap((line) => wrapTerminalText(line, bodyWidth));
    return [
        ...renderBox('Promptbook Coder fix', jobLines, width, colors.cyan.bold),
        ...renderBox(
            'Check / repair output',
            buildVisibleOutputLines(options.agentOutputLines.map(sanitizeTerminalText)),
            width,
            colors.gray,
        ),
        ...renderBox('Controls', ['Ctrl+C  Cancel check/repair and preserve work'], width, colors.white.bold),
    ];
}
