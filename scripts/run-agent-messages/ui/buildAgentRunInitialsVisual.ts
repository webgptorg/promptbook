import colors from 'colors';
import { centerAnsiText, fitPlainText, padAnsiText } from '../../run-codex-prompts/ui/coderRunUiText';

/**
 * Maximum inner width used by the compact agent-name banner.
 */
const MAX_BANNER_INNER_WIDTH = 42;

/**
 * Minimum inner width used by the compact agent-name banner.
 */
const MIN_BANNER_INNER_WIDTH = 24;

/**
 * Builds a compact centered banner that shows the local agent name.
 */
export function buildAgentRunInitialsVisual(agentName: string, totalWidth: number): readonly string[] {
    const normalizedAgentName = normalizeAgentBannerName(agentName);
    const innerWidth = Math.max(
        MIN_BANNER_INNER_WIDTH,
        Math.min(MAX_BANNER_INNER_WIDTH, Math.max(normalizedAgentName.length, MIN_BANNER_INNER_WIDTH)),
    );
    const fittedAgentName = fitPlainText(normalizedAgentName, innerWidth);

    return [
        centerAnsiText(colors.gray(`╭${'─'.repeat(innerWidth + 2)}╮`), totalWidth),
        centerAnsiText(
            `${colors.gray('│ ')}${padAnsiText(colors.cyan.bold(fittedAgentName), innerWidth)}${colors.gray(' │')}`,
            totalWidth,
        ),
        centerAnsiText(colors.gray(`╰${'─'.repeat(innerWidth + 2)}╯`), totalWidth),
    ];
}

/**
 * Normalizes one agent name into a stable single-line banner label.
 */
function normalizeAgentBannerName(agentName: string): string {
    const normalizedAgentName = agentName.replace(/\s+/gu, ' ').trim();
    return normalizedAgentName || 'Local Agent';
}
