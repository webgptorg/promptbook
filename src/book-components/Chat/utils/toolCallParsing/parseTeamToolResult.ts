import type { TODO_any } from '../../../../utils/organization/TODO_any';
import type { TeamToolResult } from './TeamToolResult';

/**
 * Parses TEAM tool result payload and validates teammate metadata presence.
 *
 * @param resultRaw - Decoded tool result payload.
 * @returns TEAM payload or `null` when shape does not match.
 * @private function of toolCallParsing
 */
export function parseTeamToolResult(resultRaw: TODO_any): TeamToolResult | null {
    if (!resultRaw || typeof resultRaw !== 'object') {
        return null;
    }

    const teammate = (resultRaw as TeamToolResult).teammate;
    if (!teammate || typeof teammate !== 'object') {
        return null;
    }

    return resultRaw as TeamToolResult;
}

