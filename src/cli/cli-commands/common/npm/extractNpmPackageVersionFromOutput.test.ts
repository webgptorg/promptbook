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
                "GitHub Copilot CLI 1.0.61.\nRun 'copilot update' to check for updates.",
            ),
        ).toBe('1.0.61');
    });

    it('skips warning lines without a version', () => {
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

    it('can prefer the last version when an npm warning contains another version first', () => {
        expect(
            extractNpmPackageVersionFromOutput('npm 10.9.1 warning\n0.114.0-9', { isLastMatchPreferred: true }),
        ).toBe('0.114.0-9');
    });

    it('parses prerelease and build versions', () => {
        expect(extractNpmPackageVersionFromOutput('1.2.3-beta.4')).toBe('1.2.3-beta.4');
        expect(extractNpmPackageVersionFromOutput('1.2.3+build.5')).toBe('1.2.3+build.5');
    });

    it('tolerates Windows line endings', () => {
        expect(extractNpmPackageVersionFromOutput('some banner\r\n1.2.3\r\n')).toBe('1.2.3');
    });

    it('returns null for output without a version', () => {
        expect(extractNpmPackageVersionFromOutput('bash: claude: command not found')).toBeNull();
        expect(extractNpmPackageVersionFromOutput('')).toBeNull();
    });
});
