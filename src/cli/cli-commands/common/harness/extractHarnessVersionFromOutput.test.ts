import { extractHarnessVersionFromOutput } from './extractHarnessVersionFromOutput';

describe('extractHarnessVersionFromOutput', () => {
    it('parses the Claude Code version format', () => {
        expect(extractHarnessVersionFromOutput('2.1.199 (Claude Code)')).toBe('2.1.199');
    });

    it('parses the OpenAI Codex version format', () => {
        expect(extractHarnessVersionFromOutput('codex-cli 0.144.4')).toBe('0.144.4');
    });

    it('parses the GitHub Copilot version format ending with a dot', () => {
        expect(
            extractHarnessVersionFromOutput(
                'GitHub Copilot CLI 1.0.61.\nRun \'copilot update\' to check for updates.',
            ),
        ).toBe('1.0.61');
    });

    it('skips deprecation warning lines printed by the Gemini CLI', () => {
        expect(
            extractHarnessVersionFromOutput(
                [
                    '(node:48628) [DEP0040] DeprecationWarning: The `punycode` module is deprecated.',
                    '(Use `node --trace-deprecation ...` to show where the warning was created)',
                    '0.26.0',
                ].join('\n'),
            ),
        ).toBe('0.26.0');
    });

    it('skips log lines printed by the Opencode CLI', () => {
        expect(
            extractHarnessVersionFromOutput(
                'INFO  2026-07-30T10:05:14 +166ms service=models.dev file={} refreshing\n1.1.36',
            ),
        ).toBe('1.1.36');
    });

    it('parses a pre-release version', () => {
        expect(extractHarnessVersionFromOutput('1.2.3-beta.4')).toBe('1.2.3-beta.4');
    });

    it('tolerates Windows line endings', () => {
        expect(extractHarnessVersionFromOutput('some banner\r\n1.2.3\r\n')).toBe('1.2.3');
    });

    it('returns null when the harness command is not installed', () => {
        expect(extractHarnessVersionFromOutput("bash: line 1: claude: command not found")).toBeNull();
    });

    it('returns null for empty output', () => {
        expect(extractHarnessVersionFromOutput('')).toBeNull();
    });
});
