import { readTextIfExists } from '../../../common/fs.js';
import { baseInspection, helpText, homePath, withAuthentication } from '../../shared.js';
import type { HarnessContext, HarnessInspection, HarnessInvocation, HarnessPlugin, HarnessRunRequest } from '../../types.js';

/**
 * Reads Copilot's JSON-with-comments configuration.
 */
async function readCopilotConfig(): Promise<Record<string, unknown> | undefined> {
    const text = await readTextIfExists(homePath('.copilot', 'config.json'));
    if (!text) return undefined;
    try {
        return JSON.parse(text.replace(/^\s*\/\/.*$/gm, '')) as Record<string, unknown>;
    } catch {
        return undefined;
    }
}

/**
 * Inspects installation and the stored GitHub login.
 */
async function inspect(context: HarnessContext): Promise<HarnessInspection> {
    const { inspection, executablePath } = await baseInspection(plugin, context);
    if (!executablePath) return inspection;
    if (context.env.COPILOT_GITHUB_TOKEN || context.env.GH_TOKEN || context.env.GITHUB_TOKEN) return withAuthentication(inspection, true, 'api', plugin.loginHint);
    const configuration = await readCopilotConfig();
    const users = configuration?.logged_in_users ?? configuration?.loggedInUsers;
    if ((Array.isArray(users) && users.length) || configuration?.last_logged_in_user) return withAuthentication(inspection, true, 'account', plugin.loginHint);
    return withAuthentication(inspection, false, 'none', plugin.loginHint);
}

/**
 * Builds `copilot -p` with all tools allowed (prompt passed through a file reference).
 */
async function buildInvocation(request: HarnessRunRequest): Promise<HarnessInvocation> {
    const help = await helpText({ projectRoot: request.projectRoot, env: request.env }, 'copilot', ['--help']);
    const args = ['-p', `Read the complete task instructions in the file ${request.promptFile} and follow them exactly.`, '--allow-all-tools'];
    if (help.includes('--no-color')) args.push('--no-color');
    if (request.model) args.push('--model', request.model);
    if (request.mcp && help.includes('--additional-mcp-config')) {
        args.push('--additional-mcp-config', JSON.stringify({ mcpServers: { ptbk: { type: 'local', command: request.mcp.command, args: request.mcp.args, env: request.mcp.env, tools: ['*'] } } }));
    }
    for (const directory of request.readableDirectories) if (help.includes('--add-dir')) args.push('--add-dir', directory);
    return { args, env: request.env };
}

/**
 * GitHub Copilot CLI integration.
 *
 * @private harness plugin
 */
export const plugin: HarnessPlugin = {
    id: 'github-copilot',
    variant: 'GITHUB_COPILOT',
    displayName: 'GitHub Copilot',
    featured: false,
    executable: 'copilot',
    npmPackage: '@github/copilot',
    homepage: 'https://docs.github.com/copilot/how-tos/use-copilot-agents/use-copilot-cli',
    thinkingLevels: [],
    capabilities: { mcp: true, readOnly: false },
    loginHint: 'Start `copilot` once and run /login, or provide COPILOT_GITHUB_TOKEN.',
    inspect,
    buildInvocation,
    parseLine: () => [],
    finalMessageFromOutput: (stdout) => stdout.replace(/\n\s*Total usage est[\s\S]*$/i, '').trim(),
};
