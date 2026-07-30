import { CLI_AGENT_HARNESS_NAMES } from '../../../../book-3.0/cliAgentEnv';
import { buildHarnessInstallCommand } from './buildHarnessInstallCommand';
import { getHarnessDefinition, HARNESS_DEFINITIONS } from './HarnessDefinition';

describe('HARNESS_DEFINITIONS', () => {
    it('describes every supported harness', () => {
        expect(Object.keys(HARNESS_DEFINITIONS).sort()).toEqual([...CLI_AGENT_HARNESS_NAMES].sort());
    });

    it('keys the definitions by their own harness name', () => {
        for (const [harnessName, definition] of Object.entries(HARNESS_DEFINITIONS)) {
            expect(definition.harnessName).toBe(harnessName);
        }
    });

    it('defines one non-empty command and npm package for each harness', () => {
        for (const definition of Object.values(HARNESS_DEFINITIONS)) {
            expect(definition.label).not.toBe('');
            expect(definition.commandName).not.toBe('');
            expect(definition.npmPackageName).not.toBe('');
        }
    });

    it('uses a unique command for each harness', () => {
        const commandNames = Object.values(HARNESS_DEFINITIONS).map(({ commandName }) => commandName);

        expect(new Set(commandNames).size).toBe(commandNames.length);
    });
});

describe('getHarnessDefinition', () => {
    it('resolves the definition of one harness', () => {
        expect(getHarnessDefinition('claude-code').commandName).toBe('claude');
    });
});

describe('buildHarnessInstallCommand', () => {
    it('builds the global npm installation command', () => {
        expect(buildHarnessInstallCommand(getHarnessDefinition('openai-codex'))).toBe(
            'npm install -g @openai/codex@latest',
        );
    });
});
