import { buildCodexScript } from './buildCodexScript';

describe('buildCodexScript', () => {
    it('defaults Codex reasoning effort to xhigh', () => {
        const script = buildCodexScript({
            prompt: 'Hello from test prompt',
            projectPath: '/project/path',
            model: 'gpt-5.4',
            sandbox: 'danger-full-access',
            askForApproval: 'never',
            allowCredits: false,
            codexCommand: 'codex',
        });

        expect(script).toContain('-c model_reasoning_effort="xhigh"');
        expect(script).toContain('--model gpt-5.4');
    });

    it('uses the provided thinking level override', () => {
        const script = buildCodexScript({
            prompt: 'Hello from test prompt',
            projectPath: '/project/path',
            model: 'gpt-5.4',
            thinkingLevel: 'high',
            sandbox: 'danger-full-access',
            askForApproval: 'never',
            allowCredits: false,
            codexCommand: 'codex',
        });

        expect(script).toContain('-c model_reasoning_effort="high"');
        expect(script).not.toContain('-c model_reasoning_effort="xhigh"');
    });
});
