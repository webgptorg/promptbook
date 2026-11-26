import { baseInspection, helpText, observedSessionSupport, parseStreamJson, probe, withAuthentication } from '../../shared.js';
import type { HarnessContext, HarnessInspection, HarnessInvocation, HarnessLoginMethod, HarnessPlugin, HarnessRunRequest, LoginLocation } from '../../types.js';

/**
 * Inspects installation and native login (`claude auth status --json`).
 */
async function inspect(context: HarnessContext): Promise<HarnessInspection> {
    const { inspection, executablePath } = await baseInspection(plugin, context);
    if (!executablePath) return inspection;
    if (context.tool?.authentication === 'API_KEY' && context.env.ANTHROPIC_API_KEY) return withAuthentication(inspection, true, 'api', plugin.loginHint);
    const status = await probe(context, executablePath, ['auth', 'status', '--json']);
    try {
        const json = JSON.parse(status.output.slice(status.output.indexOf('{'))) as { loggedIn?: boolean; authMethod?: string; apiKeySource?: string };
        if (json.loggedIn) {
            const api = /api/i.test(`${json.authMethod ?? ''} ${json.apiKeySource ?? ''}`);
            return withAuthentication(inspection, true, api ? 'api' : 'account', plugin.loginHint);
        }
        return withAuthentication(inspection, false, 'none', plugin.loginHint);
    } catch {
        return withAuthentication(inspection, 'unknown', 'unknown', plugin.loginHint, 'Installed; login state could not be read (older Claude Code).');
    }
}

/**
 * Model aliases documented by the installed CLI's own `--model` help.
 */
async function listModels(context: HarnessContext): Promise<string[]> {
    const help = await helpText(context, 'claude', ['--help']);
    const section = /--model <model>([\s\S]*?)(?:\n\s{2}-|\n\s*$)/.exec(help)?.[1] ?? '';
    return [...new Set([...section.matchAll(/'([a-z][a-z0-9.-]*)'/g)].map((match) => match[1]!))];
}

/** Presents only Claude's native OAuth authorization URL; arbitrary CLI links remain in the terminal. */
function returnChallenge(output: string): { url: string } | undefined {
    const targets: string[] = [];
    // OSC 8 carries the actual URL even when its visible label is only "Open browser".
    // Ignore other OSC payloads and wait for BEL or ST before accepting a streamed target.
    // eslint-disable-next-line no-control-regex -- Parse terminal escape sequences from the native PTY.
    const plain = output.replace(/\u001b\]([^\u0007\u001b]*)(\u0007|\u001b\\|$)/g, (_, payload: string, end: string) => {
        const target = /^8;[^;]*;(.+)$/.exec(payload)?.[1];
        if (end && target) targets.push(target);
        return ' ';
    }).replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
    // eslint-disable-next-line no-control-regex -- A presented URL must never contain terminal control characters.
    targets.push(...(plain.match(/https:\/\/[^\s<>"\u0000-\u001f]+(?=[\s<>"])/g) ?? []));
    for (const candidate of targets) {
        // eslint-disable-next-line no-control-regex -- URL parsing would otherwise silently discard some control bytes.
        if (candidate.length > 2048 || !/^https:\/\//.test(candidate) || /[\s<>"\\\u0000-\u001f\u007f]/.test(candidate)) continue;
        try {
            const url = new URL(candidate);
            if (['https://claude.ai', 'https://console.anthropic.com'].includes(url.origin) && url.pathname === '/oauth/authorize' && !url.username && !url.password) return { url: url.href };
        } catch { /* Native output can contain incomplete or unrelated links. */ }
    }
    return undefined;
}

/**
 * Native subscription sign-in of the installed Claude Code (`claude auth login`, never the API-billing `--console`
 * login): its link can be opened on another device, and a return code is pasted at its own terminal prompt. Versions
 * without `auth login` use the native `/login` interaction. There is no device-code flag to invent.
 */
async function loginMethods(context: HarnessContext, location: LoginLocation): Promise<HarnessLoginMethod[]> {
    const help = await helpText(context, 'claude', ['auth', 'login', '--help']);
    const remote = location === 'remote';
    const away = remote ? ' Nothing needs to open on this server: open the link Claude Code shows on your phone or computer, sign in, and if the page shows a code, paste it here at Claude Code’s prompt.' : '';
    if (!/auth login/i.test(help)) {
        return [{ id: 'native', label: 'Start Claude Code and use /login', args: [], remote, instructions: `Claude Code starts in this terminal: type /login and follow it, then leave with /exit.${away}`, terminal: 'inherit' }];
    }
    return [
        {
            id: remote ? 'url-code' : 'browser',
            label: remote ? 'Sign in on another device with Claude Code’s link and code (claude auth login)' : 'Sign in with your Claude account in the browser (claude auth login)',
            args: help.includes('--claudeai') ? ['auth', 'login', '--claudeai'] : ['auth', 'login'],
            remote: true,
            returnChallenge,
            instructions: remote ? `Claude Code signs in with your Claude subscription.${away}` : 'Claude Code opens the sign-in page in your browser; finish it there and return to this terminal (if it asks for a code, paste it here).',
            terminal: 'inherit',
        },
    ];
}

/**
 * Builds `claude -p --output-format stream-json` in bypass-permissions (or read-only) mode.
 */
async function buildInvocation(request: HarnessRunRequest): Promise<HarnessInvocation> {
    const args = ['-p', '--output-format', 'stream-json', '--verbose'];
    if (request.resumeSessionId) args.push('--resume', request.resumeSessionId);
    if (request.readOnly) {
        args.push('--permission-mode', 'dontAsk', '--tools', 'Read,Grep,Glob', '--strict-mcp-config');
        if (request.mcp) args.push('--allowedTools', 'mcp__ptbk__*');
    } else {
        args.push('--permission-mode', 'bypassPermissions');
    }
    for (const directory of request.readableDirectories) args.push('--add-dir', directory);
    if (request.model) args.push('--model', request.model);
    if (request.thinkingLevel) args.push('--effort', request.thinkingLevel);
    if (request.mcp) {
        const configuration = { mcpServers: { ptbk: { type: 'stdio', command: request.mcp.command, args: request.mcp.args, env: request.mcp.env } } };
        args.push('--mcp-config', JSON.stringify(configuration));
    }
    if (request.localRoute) {
        // Credential-free local connection of this invocation: the runtime's Anthropic-compatible endpoint with its
        // non-secret compatibility token; the subscription login and any ambient key are never sent there.
        const env: NodeJS.ProcessEnv = { ...request.env, ANTHROPIC_BASE_URL: request.localRoute.protocolUrl, ANTHROPIC_AUTH_TOKEN: request.localRoute.compatibilityToken, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' };
        for (const name of ['ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN']) delete env[name];
        return { args, input: request.prompt, env };
    }
    return { args, input: request.prompt, env: request.baseUrl ? { ...request.env, ANTHROPIC_BASE_URL: request.baseUrl } : request.env };
}

/**
 * Claude Code integration.
 *
 * @private harness plugin
 */
export const plugin: HarnessPlugin = {
    id: 'claude-code',
    variant: 'CLAUDE_CODE',
    apiKeyVariable: 'ANTHROPIC_API_KEY',
    setupApiKey: {
        reference: 'PTBK_ANTHROPIC_API_KEY', label: 'Anthropic API key', url: 'https://console.anthropic.com/settings/keys',
        profile: { home: 'CLAUDE_CONFIG_DIR', omit: ['CLAUDE_SECURESTORAGE_CONFIG_DIR'] },
    },
    // Keys, bearer tokens, endpoint overrides and the Bedrock/Vertex/Foundry selectors all choose another billing route.
    ambientApiKeyVariables: ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL', 'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX', 'CLAUDE_CODE_USE_FOUNDRY', 'ANTHROPIC_BEDROCK_BASE_URL', 'ANTHROPIC_VERTEX_BASE_URL', 'ANTHROPIC_FOUNDRY_API_KEY', 'ANTHROPIC_FOUNDRY_BASE_URL'],
    // A long-lived subscription token is the native account context: kept for NATIVE only.
    nativeCredentialVariables: ['CLAUDE_CODE_OAUTH_TOKEN'],
    accountHomeVariable: 'CLAUDE_CONFIG_DIR',
    displayName: 'Claude Code',
    featured: true,
    executable: 'claude',
    npmPackage: '@anthropic-ai/claude-code',
    homepage: 'https://code.claude.com/docs/en/cli-reference',
    thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
    thinkingLabel: 'effort (--effort)',
    defaultModel: 'sonnet',
    defaultThinkingLevel: 'medium',
    modelCatalog: 'partial',
    endpoints: { official: 'https://api.anthropic.com', custom: true, localConnection: { protocol: 'anthropic', runtimes: { OLLAMA: '0.14.0' } } },
    capabilities: { mcp: true, readOnly: true },
    priceList: { providers: [{ catalog: 'anthropic' }] },
    loginArgs: ['auth', 'login'],
    loginHint: 'Run `claude auth login` (or start `claude` once and use /login); on a server, open its link on another device and paste the code it shows.',
    // Anthropic's terms reserve Claude.ai account sign-in for its own flow. A separate Promptbook sign-in UI is
    // technically possible, but would intermediate that flow. Forward the unmodified CLI's terminal instead.
    // https://code.claude.com/docs/en/legal-and-compliance#authentication-and-credential-use
    loginMethods,
    selfUpdateArgs: ['update'],
    inspect,
    listModels,
    buildInvocation,
    parseLine: parseStreamJson,
    sessions: observedSessionSupport({
        executable: 'claude',
        help: ['--help'],
        continueFlag: '--resume',
        client: { help: ['--help'], flag: '--resume', args: (providerId) => ['--resume', providerId], returnHint: 'Leave with /exit or Ctrl+D in Claude Code: that closes only the client, and this session stays resumable.' },
    }),
};
