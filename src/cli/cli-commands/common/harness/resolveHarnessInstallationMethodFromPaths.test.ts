import { getHarnessDefinition } from './HarnessDefinition';
import { resolveHarnessInstallationMethodFromPaths } from './resolveHarnessInstallationMethodFromPaths';

describe('resolveHarnessInstallationMethodFromPaths', () => {
    const codexDefinition = getHarnessDefinition('openai-codex');
    const claudeCodeDefinition = getHarnessDefinition('claude-code');

    it('recognizes a command inside the global npm prefix', () => {
        expect(
            resolveHarnessInstallationMethodFromPaths({
                definition: codexDefinition,
                commandPath: '/home/promptbook/.nvm/versions/node/v22.14.0/bin/codex',
                npmGlobalPrefixPath: '/home/promptbook/.nvm/versions/node/v22.14.0',
            }),
        ).toBe('npm-global');
    });

    it('recognizes a Windows command inside the global npm prefix', () => {
        expect(
            resolveHarnessInstallationMethodFromPaths({
                definition: codexDefinition,
                commandPath: 'C:\\Users\\Promptbook\\AppData\\Roaming\\npm\\codex.cmd',
                npmGlobalPrefixPath: 'C:\\Users\\Promptbook\\AppData\\Roaming\\npm',
            }),
        ).toBe('npm-global');
    });

    it('recognizes a command inside the npm package directory even when npm cannot be asked', () => {
        expect(
            resolveHarnessInstallationMethodFromPaths({
                definition: codexDefinition,
                commandPath: '/usr/local/lib/node_modules/@openai/codex/bin/codex.js',
                npmGlobalPrefixPath: null,
            }),
        ).toBe('npm-global');
    });

    it('recognizes the standalone installation of OpenAI Codex', () => {
        expect(
            resolveHarnessInstallationMethodFromPaths({
                definition: codexDefinition,
                commandPath: '/home/promptbook/.codex/packages/standalone/current/bin/codex',
                npmGlobalPrefixPath: '/home/promptbook/.nvm/versions/node/v22.14.0',
            }),
        ).toBe('standalone');
    });

    it('recognizes a Homebrew installation even when npm installs globally into the same prefix', () => {
        expect(
            resolveHarnessInstallationMethodFromPaths({
                definition: codexDefinition,
                commandPath: '/opt/homebrew/Cellar/codex/0.149.1/bin/codex',
                npmGlobalPrefixPath: '/opt/homebrew',
            }),
        ).toBe('homebrew');
    });

    it('recognizes a Homebrew formula which bundles the npm package of the harness', () => {
        expect(
            resolveHarnessInstallationMethodFromPaths({
                definition: codexDefinition,
                commandPath: '/opt/homebrew/Cellar/codex/0.149.1/libexec/lib/node_modules/@openai/codex/bin/codex.js',
                npmGlobalPrefixPath: '/opt/homebrew',
            }),
        ).toBe('homebrew');
    });

    it('recognizes a global npm installation inside the prefix of a Homebrew-installed Node', () => {
        expect(
            resolveHarnessInstallationMethodFromPaths({
                definition: codexDefinition,
                commandPath: '/opt/homebrew/lib/node_modules/@openai/codex/bin/codex.js',
                npmGlobalPrefixPath: '/opt/homebrew',
            }),
        ).toBe('npm-global');
    });

    it('does not guess the installation method of a command somewhere else', () => {
        expect(
            resolveHarnessInstallationMethodFromPaths({
                definition: codexDefinition,
                commandPath: '/usr/local/bin/codex',
                npmGlobalPrefixPath: '/home/promptbook/.nvm/versions/node/v22.14.0',
            }),
        ).toBe('unknown');
    });

    it('does not treat the standalone directory of one harness as a standalone installation of another one', () => {
        expect(
            resolveHarnessInstallationMethodFromPaths({
                definition: claudeCodeDefinition,
                commandPath: '/home/promptbook/.codex/packages/standalone/current/bin/claude',
                npmGlobalPrefixPath: null,
            }),
        ).toBe('unknown');
    });
});

// Note: [🟡] Code for CLI harness installation method detection tests [resolveHarnessInstallationMethodFromPaths.test](src/cli/cli-commands/common/harness/resolveHarnessInstallationMethodFromPaths.test.ts) should never be published outside of `@promptbook/cli`
