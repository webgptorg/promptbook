import { buildGeminiScript } from './buildGeminiScript';

describe('buildGeminiScript', () => {
    it('uses the provided model in the Gemini CLI command', () => {
        const script = buildGeminiScript({
            prompt: 'Hello from test prompt',
            model: 'gemini-3.1-pro-preview',
        });

        expect(script).toContain('gemini -y -m gemini-3.1-pro-preview -p');
        expect(script).toContain('Hello from test prompt');
    });

    it('supports alternate model names', () => {
        const script = buildGeminiScript({
            prompt: 'Prompt',
            model: 'gemini-2.5-flash',
        });

        expect(script).toContain('gemini -y -m gemini-2.5-flash -p');
    });
});
