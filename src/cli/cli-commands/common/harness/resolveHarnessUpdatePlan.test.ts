import { getHarnessDefinition } from './HarnessDefinition';
import { resolveHarnessUpdatePlan } from './resolveHarnessUpdatePlan';

describe('resolveHarnessUpdatePlan', () => {
    const codexDefinition = getHarnessDefinition('openai-codex');

    it('updates a global npm installation with npm', () => {
        expect(resolveHarnessUpdatePlan(codexDefinition, 'npm-global')).toMatchObject({
            command: 'npm install -g @openai/codex@latest',
            isRunnableByPromptbook: true,
        });
    });

    it('keeps the extra environment of a global npm installation', () => {
        expect(resolveHarnessUpdatePlan(getHarnessDefinition('github-copilot'), 'npm-global')).toMatchObject({
            environment: { npm_config_ignore_scripts: 'false' },
        });
    });

    it('updates a standalone installation with its own updater instead of npm', () => {
        expect(resolveHarnessUpdatePlan(codexDefinition, 'standalone')).toMatchObject({
            command: 'codex update',
            isRunnableByPromptbook: true,
        });
    });

    it('only suggests how to update a Homebrew installation', () => {
        expect(resolveHarnessUpdatePlan(codexDefinition, 'homebrew')).toMatchObject({
            command: 'brew upgrade codex',
            isRunnableByPromptbook: false,
        });
    });

    it('never runs npm for an installation which is not understood', () => {
        expect(resolveHarnessUpdatePlan(codexDefinition, 'unknown')).toMatchObject({
            command: null,
            isRunnableByPromptbook: false,
        });
    });

    it('never runs npm for a standalone installation of a harness which has no own updater', () => {
        expect(resolveHarnessUpdatePlan(getHarnessDefinition('claude-code'), 'standalone')).toMatchObject({
            command: null,
            isRunnableByPromptbook: false,
        });
    });
});

// Note: [🟡] Code for CLI harness update planning tests [resolveHarnessUpdatePlan.test](src/cli/cli-commands/common/harness/resolveHarnessUpdatePlan.test.ts) should never be published outside of `@promptbook/cli`
