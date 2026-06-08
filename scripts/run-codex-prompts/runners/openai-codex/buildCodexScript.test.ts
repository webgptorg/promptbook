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
        expect(script).toContain('--skip-git-repo-check');
        expect(script).toContain('CODEX_LOGIN_METHOD_ARGUMENTS=(-c forced_login_method=chatgpt)');
        expect(script).toContain('"${CODEX_LOGIN_METHOD_ARGUMENTS[@]}"');
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

    it('keeps OpenAI API key authentication only when the VPS installer enabled it', () => {
        const script = buildCodexScript({
            prompt: 'Hello from test prompt',
            projectPath: '/project/path',
            model: 'gpt-5.4',
            sandbox: 'danger-full-access',
            askForApproval: 'never',
            allowCredits: false,
            codexCommand: 'codex',
        });

        expect(script).toContain('if [ "${PTBK_OPENAI_CODEX_USE_API_KEY:-0}" = "1" ]');
        expect(script).toContain('CODEX_LOGIN_METHOD_ARGUMENTS=()');
        expect(script).toContain('if [ "${PTBK_OPENAI_CODEX_USE_API_KEY:-0}" != "1" ]');
        expect(script).toContain('unset OPENAI_API_KEY');
        expect(script).toContain('unset OPENAI_BASE_URL');
    });

    it('uses a different prompt delimiter when the prompt contains the default delimiter line', () => {
        const script = buildCodexScript({
            prompt: ['First line', 'CODEX_PROMPT', 'Last line'].join('\n'),
            projectPath: '/project/path',
            model: 'gpt-5.4',
            sandbox: 'danger-full-access',
            askForApproval: 'never',
            allowCredits: false,
            codexCommand: 'codex',
        });

        expect(script).toContain("<<'CODEX_PROMPT_1'");
        expect(script).toContain('\nCODEX_PROMPT_1');
    });
});
