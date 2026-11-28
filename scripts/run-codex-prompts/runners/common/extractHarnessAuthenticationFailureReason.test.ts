import { extractHarnessAuthenticationFailureReason } from './extractHarnessAuthenticationFailureReason';

/**
 * Shortened but otherwise real `stream-json` output of a Claude Code session whose OAuth login has expired.
 */
const EXPIRED_CLAUDE_CODE_OUTPUT = [
    '{"type":"system","subtype":"init","cwd":"/project","session_id":"f48b319e","tools":["Task","Bash","Read"],"slash_commands":["login","logout","model","config"],"apiKeySource":"none","permissionMode":"default"}',
    '{"type":"system","subtype":"status","status":"requesting","session_id":"f48b319e"}',
    '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Failed to authenticate: OAuth session expired and could not be refreshed"}]},"error":"authentication_failed","is_api_error_message":true}',
    '{"is_error":true,"num_turns":1,"subtype":"success","result":"Failed to authenticate: OAuth session expired and could not be refreshed","type":"result"}',
].join('\n');

/**
 * Shortened but otherwise real output of a GitHub Copilot session which was never signed in.
 */
const UNAUTHENTICATED_GITHUB_COPILOT_OUTPUT = [
    'Error: No authentication information found.',
    '',
    'Copilot can be authenticated with GitHub using an OAuth Token or a Fine-Grained Personal Access Token.',
    '',
    'To authenticate, you can use any of the following methods:',
    "  • Start 'copilot' and run the '/login' command",
    '  • Set the COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN environment variable',
].join('\n');

describe('extractHarnessAuthenticationFailureReason', () => {
    it('reads the reason reported by a Claude Code session with an expired login', () => {
        expect(extractHarnessAuthenticationFailureReason(EXPIRED_CLAUDE_CODE_OUTPUT)).toBe(
            'Failed to authenticate: OAuth session expired and could not be refreshed',
        );
    });

    it('reads the reason reported by a GitHub Copilot session which is not signed in', () => {
        expect(extractHarnessAuthenticationFailureReason(UNAUTHENTICATED_GITHUB_COPILOT_OUTPUT)).toBe(
            'Error: No authentication information found.',
        );
    });

    it('ignores the `/login` command a signed-in harness offers among its own commands', () => {
        const output = [
            '{"type":"system","subtype":"init","slash_commands":["login","logout"],"apiKeySource":"none"}',
            '{"is_error":true,"result":"Command \\"npm test\\" exited with code 1","type":"result"}',
        ].join('\n');

        expect(extractHarnessAuthenticationFailureReason(output)).toBeUndefined();
    });

    it('reports no reason for a failure which has nothing to do with authentication', () => {
        expect(
            extractHarnessAuthenticationFailureReason('Command "bash script.sh" exited with code 1\nsyntax error'),
        ).toBeUndefined();
    });

    it('shortens a reason which is too long for the terminal', () => {
        const reason = extractHarnessAuthenticationFailureReason(
            `Authentication failed. ${'Detail. '.repeat(200)}`,
        );

        expect(reason).toContain('Authentication failed.');
        expect(reason?.endsWith('...')).toBe(true);
        expect(reason!.length).toBeLessThanOrEqual(303);
    });

    it('collapses a multiline reason into one line', () => {
        expect(extractHarnessAuthenticationFailureReason('{"result":"Please log in\\n  again"}')).toBe(
            'Please log in again',
        );
    });
});
