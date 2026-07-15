import { CODEX_LOGIN_METHOD_MARKER, type CodexLoginMethod } from './codexLoginMethod';

/**
 * Detects which login method Codex used from the captured CLI output.
 *
 * The generated Codex runner script prints one `CODEX_LOGIN_METHOD_MARKER` line before invoking Codex.
 * The most recent marker wins so retries within one captured output resolve to the final decision.
 *
 * @returns The resolved login method, or `unknown` when no marker is present.
 */
export function parseCodexLoginMethodFromOutput(output: string): CodexLoginMethod {
    const lines = output.split(/\r?\n/);

    for (let index = lines.length - 1; index >= 0; index--) {
        const line = lines[index];
        if (line === undefined) {
            continue;
        }

        const markerIndex = line.indexOf(CODEX_LOGIN_METHOD_MARKER);
        if (markerIndex === -1) {
            continue;
        }

        const reportedMethod = line.slice(markerIndex + CODEX_LOGIN_METHOD_MARKER.length).trim().toLowerCase();
        if (reportedMethod === 'chatgpt') {
            return 'chatgpt';
        }
        if (reportedMethod === 'api') {
            return 'api';
        }

        return 'unknown';
    }

    return 'unknown';
}
