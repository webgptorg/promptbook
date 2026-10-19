import { baseInspection, helpText, parseJsonLine, probe, summarizeToolInput, withAuthentication } from '../../shared.js';
import type { HarnessContext, HarnessEvent, HarnessInspection, HarnessInvocation, HarnessPlugin, HarnessRunRequest, ParserState } from '../../types.js';

/**
 * Provider environment variables OpenCode can use without stored credentials.
 */
const PROVIDER_VARIABLES = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'OPENROUTER_API_KEY', 'GROQ_API_KEY', 'XAI_API_KEY', 'DEEPSEEK_API_KEY'];

/**
 * Inspects installation and stored credentials (`opencode auth list`).
 */
async function inspect(context: HarnessContext): Promise<HarnessInspection> {
    const { inspection, executablePath } = await baseInspection(plugin, context);
    if (!executablePath) return inspection;
    const listing = await probe(context, executablePath, ['auth', 'list']);
    const plain = listing.output.replace(/\x1b\[[0-9;]*m/g, '');
    const count = Number(/(\d+)\s+credentials?/i.exec(plain)?.[1] ?? 'NaN');
    if (count > 0) return withAuthentication(inspection, true, 'account', plugin.loginHint);
    if (PROVIDER_VARIABLES.some((name) => context.env[name])) return withAuthentication(inspection, true, 'api', plugin.loginHint);
    if (count === 0) return withAuthentication(inspection, false, 'none', plugin.loginHint, 'Installed, but no provider credentials are stored.');
    return withAuthentication(inspection, 'unknown', 'unknown', plugin.loginHint);
}

/**
 * Model catalog from `opencode models`.
 */
async function listModels(context: HarnessContext): Promise<string[]> {
    const result = await probe(context, 'opencode', ['models']);
    if (!result.ok) return [];
    return result.output
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => /^[\w.-]+\/[\w.:/-]+$/.test(line));
}

/**
 * Builds `opencode run --format json` with automatic permission approval.
 */
async function buildInvocation(request: HarnessRunRequest): Promise<HarnessInvocation> {
    const help = await helpText({ projectRoot: request.projectRoot, env: request.env }, 'opencode', ['run', '--help']);
    const args = ['run', '--format', 'json'];
    if (help.includes('--auto') && !request.readOnly) args.push('--auto');
    if (request.model) args.push('--model', request.model);
    if (request.thinkingLevel && help.includes('--variant')) args.push('--variant', request.thinkingLevel);
    args.push(`Read the complete task instructions in the file ${request.promptFile} and follow them exactly.`);
    const configuration: Record<string, unknown> = {};
    if (!request.readOnly) configuration.permission = { edit: 'allow', bash: 'allow', webfetch: 'allow' };
    if (request.mcp) configuration.mcp = { ptbk: { type: 'local', command: [request.mcp.command, ...request.mcp.args], environment: request.mcp.env, enabled: true } };
    return { args, env: { ...request.env, OPENCODE_CONFIG_CONTENT: JSON.stringify(configuration) } };
}

/**
 * Parses `opencode run --format json` events.
 */
function parseLine(line: string, state: ParserState): HarnessEvent[] {
    const event = parseJsonLine(line);
    if (!event) return [];
    void state;
    const part = (event.part ?? {}) as Record<string, unknown>;
    switch (event.type) {
        case 'text':
            return typeof part.text === 'string' && part.text.trim() ? [{ type: 'message', text: part.text }] : [];
        case 'reasoning':
            return typeof part.text === 'string' ? [{ type: 'reasoning', text: part.text }] : [];
        case 'tool_use': {
            const toolState = (part.state ?? {}) as Record<string, unknown>;
            return [{ type: 'activity', text: `${String(part.tool ?? 'tool')} ${summarizeToolInput(toolState.input)}`.trim() }];
        }
        case 'step_finish': {
            const tokens = (part.tokens ?? {}) as Record<string, unknown>;
            const usage = Object.fromEntries(Object.entries(tokens).filter(([, value]) => typeof value === 'number')) as Record<string, number>;
            return [{ type: 'usage', usage, costUsd: typeof part.cost === 'number' ? part.cost : undefined }];
        }
        case 'error': {
            const error = (event.error ?? {}) as Record<string, unknown>;
            const data = (error.data ?? {}) as Record<string, unknown>;
            return [{ type: 'turn-failed', text: String(data.message ?? error.message ?? error.name ?? 'OpenCode reported an error.') }];
        }
        default:
            return [];
    }
}

/**
 * OpenCode integration.
 *
 * @private harness plugin
 */
export const plugin: HarnessPlugin = {
    id: 'opencode',
    displayName: 'OpenCode',
    featured: false,
    executable: 'opencode',
    npmPackage: 'opencode-ai',
    homepage: 'https://opencode.ai/docs/cli/',
    thinkingLevels: ['low', 'medium', 'high', 'max'],
    thinkingLabel: 'variant (--variant)',
    capabilities: { mcp: true, readOnly: false },
    loginArgs: ['auth', 'login'],
    loginHint: 'Run `opencode auth login` to store provider credentials.',
    selfUpdateArgs: ['upgrade'],
    inspect,
    listModels,
    buildInvocation,
    parseLine,
};
