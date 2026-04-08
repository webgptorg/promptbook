import { buildGitHubCopilotScript } from './buildGitHubCopilotScript';

describe('buildGitHubCopilotScript', () => {
    it('uses the provided model in the Copilot CLI command', () => {
        const script = buildGitHubCopilotScript({
            prompt: 'Hello from test prompt',
            projectPath: '/project/path',
            model: 'gpt-5.4',
        });

        expect(script).toContain('cd "/project/path"');
        expect(script).toContain('copilot -p "$(cat');
        expect(script).toContain('--model gpt-5.4');
        expect(script).toContain('Hello from test prompt');
    });

    it('uses the provided thinking level in the Copilot CLI command', () => {
        const script = buildGitHubCopilotScript({
            prompt: 'Hello from test prompt',
            projectPath: '/project/path',
            thinkingLevel: 'xhigh',
        });

        expect(script).toContain('--reasoning-effort xhigh');
    });

    it('omits the model flag when no model is provided', () => {
        const script = buildGitHubCopilotScript({
            prompt: 'Prompt',
            projectPath: '/project/path',
        });

        expect(script).not.toContain('--model');
        expect(script).not.toContain('--reasoning-effort');
        expect(script).toContain('--output-format json');
    });
});
