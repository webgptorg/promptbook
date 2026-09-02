import { buildQwenCodeScript } from './buildQwenCodeScript';

describe('buildQwenCodeScript', () => {
    it('uses the provided model in the Qwen Code CLI command', () => {
        const script = buildQwenCodeScript({
            prompt: 'Hello from test prompt',
            model: 'qwen3.8-max',
        });

        expect(script).toContain('qwen -y -m qwen3.8-max -p');
        expect(script).toContain('Hello from test prompt');
    });

    it('supports alternate model names', () => {
        const script = buildQwenCodeScript({
            prompt: 'Prompt',
            model: 'qwen3-coder-plus',
        });

        expect(script).toContain('qwen -y -m qwen3-coder-plus -p');
    });

    it('passes the prompt through a heredoc so that quotes stay intact', () => {
        const script = buildQwenCodeScript({
            prompt: 'Rename "foo" to `bar`',
            model: 'qwen3.8-max',
        });

        expect(script).toContain("<<'QWEN_CODE_PROMPT'");
        expect(script).toContain('Rename "foo" to `bar`');
    });
});
