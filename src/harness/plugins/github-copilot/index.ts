import { homedir } from 'node:os';
import { join } from 'node:path';
import { readTextIfExists } from '../../../common/fs.js';
import { baseInspection, helpText, observedSessionSupport, withAuthentication } from '../../shared.js';
import type { HarnessContext, HarnessInspection, HarnessInvocation, HarnessLoginMethod, HarnessPlugin, HarnessRunRequest, LoginLocation } from '../../types.js';

/**
 * Reads Copilot's JSON-with-comments configuration.
 */
async function readCopilotConfig(env: NodeJS.ProcessEnv): Promise<Record<string, unknown> | undefined> {
    const text = await readTextIfExists(join(env.COPILOT_HOME || join(env.HOME || env.USERPROFILE || homedir(), '.copilot'), 'config.json'));
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
    const configuration = await readCopilotConfig(context.env);
    const users = configuration?.logged_in_users ?? configuration?.loggedInUsers;
    if ((Array.isArray(users) && users.length) || configuration?.last_logged_in_user) return withAuthentication(inspection, true, 'account', plugin.loginHint);
    return withAuthentication(inspection, false, 'none', plugin.loginHint);
}

/** Extracts the public device code. The provider URL is fixed even if the CLI prints an ANSI hyperlink. */
function deviceChallenge(output: string): { url: string; userCode: string } | undefined {
    const plain = output.replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b\[[0-?]*[ -/]*[@-~]/g, '');
    const code = /(?:enter (?:one[- ]time )?code|one[- ]time code:)\s*:?\s*([A-Z0-9]{4}-[A-Z0-9]{4})\b/i.exec(plain)?.[1];
    return code ? { url: 'https://github.com/login/device', userCode: code.toUpperCase() } : undefined;
}

/** Uses the official device-code flag when available. The interactive CLI remains the fallback on older versions. */
async function loginMethods(context: HarnessContext, location: LoginLocation): Promise<HarnessLoginMethod[]> {
    const help = await helpText(context, 'copilot', ['login', '--help']);
    const supportsDeviceCode = help.includes('--device-code');
    const args = /--(?:web-flow|device-code|with-token)\b/.test(help) ? ['login'] : [];
    if (supportsDeviceCode && location === 'remote') args.push('--device-code');
    const native: HarnessLoginMethod = {
        id: 'native', label: 'Sign in in the GitHub Copilot terminal', args,
        remote: true, terminal: 'inherit',
        instructions: 'Follow GitHub Copilot’s sign-in instructions. If its interactive shell opens, enter /login and exit when finished.',
    };
    if (!supportsDeviceCode) return [native];
    const device: HarnessLoginMethod = {
        id: 'device-code', label: 'Sign in with a GitHub device code', args: ['login', '--device-code'],
        remote: true, terminal: 'relay', deviceChallenge,
        instructions: 'Open GitHub’s device sign-in page and enter the one-time code displayed by Copilot.',
    };
    return location === 'remote' ? [device, native] : [native, device];
}

/**
 * Builds `copilot -p` with all tools allowed (prompt passed through a file reference).
 */
async function buildInvocation(request: HarnessRunRequest): Promise<HarnessInvocation> {
    const help = await helpText({ projectRoot: request.projectRoot, env: request.env }, 'copilot', ['--help']);
    const args = ['-p', `Read the complete task instructions in the file ${request.promptFile} and follow them exactly.`, '--allow-all-tools'];
    if (help.includes('--no-color')) args.push('--no-color');
    if (request.resumeSessionId) args.push(`--resume=${request.resumeSessionId}`);
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
    defaultModel: 'claude-sonnet-5.5',
    modelCatalog: 'partial',
    endpoints: { official: 'https://api.githubcopilot.com', custom: false },
    capabilities: { mcp: true, readOnly: false },
    loginHint: 'Run `copilot login`, or start `copilot` and run /login on older versions.',
    loginMethods,
    inspect,
    buildInvocation,
    parseLine: () => [],
    sessions: observedSessionSupport({ executable: 'copilot', help: ['--help'], continueNote: 'Copilot prints plain text here and reports no session identifier to continue: a next input starts a new session.' }),
    finalMessageFromOutput: (stdout) => stdout.replace(/\n\s*Total usage est[\s\S]*$/i, '').trim(),
};
