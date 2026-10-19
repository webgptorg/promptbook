import { baseInspection, helpText, parseStreamJson, probe, withAuthentication } from '../../shared.js';
import type { HarnessContext, HarnessInspection, HarnessInvocation, HarnessPlugin, HarnessRunRequest } from '../../types.js';

/**
 * Inspects installation and native login (`claude auth status --json`).
 */
async function inspect(context: HarnessContext): Promise<HarnessInspection> {
    const { inspection, executablePath } = await baseInspection(plugin, context);
    if (!executablePath) return inspection;
    const status = await probe(context, executablePath, ['auth', 'status', '--json']);
    try {
        const json = JSON.parse(status.output.slice(status.output.indexOf('{'))) as { loggedIn?: boolean; authMethod?: string; apiKeySource?: string };
        if (json.loggedIn) {
            const api = /api/i.test(`${json.authMethod ?? ''} ${json.apiKeySource ?? ''}`);
            return withAuthentication(inspection, true, api ? 'api' : 'account', plugin.loginHint);
        }
        return withAuthentication(inspection, false, 'none', plugin.loginHint);
    } catch {
        if (context.env.ANTHROPIC_API_KEY) return withAuthentication(inspection, true, 'api', plugin.loginHint);
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

/**
 * Builds `claude -p --output-format stream-json` in bypass-permissions (or read-only) mode.
 */
async function buildInvocation(request: HarnessRunRequest): Promise<HarnessInvocation> {
    const args = ['-p', '--output-format', 'stream-json', '--verbose'];
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
    return { args, input: request.prompt, env: request.env };
}

/**
 * Claude Code integration.
 *
 * @private harness plugin
 */
export const plugin: HarnessPlugin = {
    id: 'claude-code',
    displayName: 'Claude Code',
    featured: true,
    executable: 'claude',
    npmPackage: '@anthropic-ai/claude-code',
    homepage: 'https://code.claude.com/docs/en/cli-reference',
    thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
    thinkingLabel: 'effort (--effort)',
    capabilities: { mcp: true, readOnly: true },
    loginArgs: ['auth', 'login'],
    loginHint: 'Run `claude auth login` (or start `claude` once and use /login).',
    selfUpdateArgs: ['update'],
    inspect,
    listModels,
    buildInvocation,
    parseLine: parseStreamJson,
};
