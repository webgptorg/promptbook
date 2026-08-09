import { spaceTrim } from 'spacetrim';
import { extractNpmPackageVersionFromOutput } from './extractNpmPackageVersionFromOutput';

describe('extractNpmPackageVersionFromOutput', () => {
    it('parses the Claude Code version format', () => {
        expect(extractNpmPackageVersionFromOutput('2.1.199 (Claude Code)')).toBe('2.1.199');
    });

    it('parses the OpenAI Codex version format', () => {
        expect(extractNpmPackageVersionFromOutput('codex-cli 0.144.4')).toBe('0.144.4');
    });

    it('parses the GitHub Copilot version format ending with a dot', () => {
        expect(
            extractNpmPackageVersionFromOutput(
                spaceTrim(`
                    GitHub Copilot CLI 1.0.61.
                    Run 'copilot update' to check for updates.
                `),
            ),
        ).toBe('1.0.61');
    });

    it('skips deprecation warning lines printed by the Gemini CLI', () => {
        expect(
            extractNpmPackageVersionFromOutput(
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
            extractNpmPackageVersionFromOutput(
                spaceTrim(`
                    INFO  2026-07-30T10:05:14 +166ms service=models.dev file={} refreshing
                    1.1.36
                `),
            ),
        ).toBe('1.1.36');
    });

    it('prefers the last version when parsing npm output with a warning', () => {
        expect(
            extractNpmPackageVersionFromOutput(spaceTrim(`
                npm warn cli npm v10.9.1 does not support Node.js v18.4.0.
                0.114.0
            `), {
                isLastMatchPreferred: true,
            }),
        ).toBe('0.114.0');
    });

    it('parses a pre-release version', () => {
        expect(extractNpmPackageVersionFromOutput('1.2.3-beta.4')).toBe('1.2.3-beta.4');
    });

    it('tolerates Windows line endings', () => {
        expect(extractNpmPackageVersionFromOutput('some banner\r\n1.2.3\r\n')).toBe('1.2.3');
    });

    it('returns null when the command is not installed', () => {
        expect(extractNpmPackageVersionFromOutput('bash: line 1: claude: command not found')).toBeNull();
    });

    it('returns null for empty output', () => {
        expect(extractNpmPackageVersionFromOutput('')).toBeNull();
    });
});
