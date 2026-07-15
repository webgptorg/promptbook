import { parseCodexLoginMethodFromOutput } from './parseCodexLoginMethodFromOutput';

describe('parseCodexLoginMethodFromOutput', () => {
    it('detects the ChatGPT account login method', () => {
        const output = ['Booting Codex', 'ptbk-codex-login-method: chatgpt', 'tokens used: 1,234'].join('\n');

        expect(parseCodexLoginMethodFromOutput(output)).toBe('chatgpt');
    });

    it('detects the API key login method', () => {
        const output = ['Booting Codex', 'ptbk-codex-login-method: api', 'tokens used: 1,234'].join('\n');

        expect(parseCodexLoginMethodFromOutput(output)).toBe('api');
    });

    it('returns unknown when no marker is present', () => {
        expect(parseCodexLoginMethodFromOutput('tokens used: 1,234')).toBe('unknown');
    });

    it('returns unknown when the marker value is not recognized', () => {
        expect(parseCodexLoginMethodFromOutput('ptbk-codex-login-method: something-else')).toBe('unknown');
    });

    it('uses the last marker when several are present', () => {
        const output = ['ptbk-codex-login-method: api', 'ptbk-codex-login-method: chatgpt'].join('\n');

        expect(parseCodexLoginMethodFromOutput(output)).toBe('chatgpt');
    });
});
