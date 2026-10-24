import { readJsonIfExists } from '../../../common/fs.js';
import { anyExists, baseInspection, homePath, parseStreamJson, withAuthentication } from '../../shared.js';
import type { HarnessContext, HarnessInspection, HarnessInvocation, HarnessPlugin, HarnessRunRequest } from '../../types.js';

/**
 * Inspects installation and stored Google login / API configuration.
 */
async function inspect(context: HarnessContext): Promise<HarnessInspection> {
    const { inspection, executablePath } = await baseInspection(plugin, context);
    if (!executablePath) return inspection;
    if (await anyExists([homePath('.gemini', 'oauth_creds.json')])) return withAuthentication(inspection, true, 'account', plugin.loginHint);
    if (context.env.GEMINI_API_KEY || context.env.GOOGLE_API_KEY || context.env.GOOGLE_GENAI_USE_VERTEXAI) return withAuthentication(inspection, true, 'api', plugin.loginHint);
    const settings = await readJsonIfExists<{ security?: { auth?: { selectedType?: string } }; selectedAuthType?: string }>(homePath('.gemini', 'settings.json')).catch(() => undefined);
    if (settings?.security?.auth?.selectedType || settings?.selectedAuthType) return withAuthentication(inspection, 'unknown', 'unknown', plugin.loginHint);
    return withAuthentication(inspection, false, 'none', plugin.loginHint);
}

/**
 * Builds headless `gemini -p` in YOLO (or read-only plan) approval mode.
 */
async function buildInvocation(request: HarnessRunRequest): Promise<HarnessInvocation> {
    const args = ['--output-format', 'stream-json', '--skip-trust', '--approval-mode', request.readOnly ? 'plan' : 'yolo'];
    if (request.model) args.push('--model', request.model);
    for (const directory of request.readableDirectories) args.push('--include-directories', directory);
    args.push('-p', `Read the complete task instructions in the file ${request.promptFile} and follow them exactly.`);
    return { args, env: request.env };
}

/**
 * Gemini CLI integration.
 *
 * @private harness plugin
 */
export const plugin: HarnessPlugin = {
    id: 'gemini',
    variant: 'GEMINI',
    apiKeyVariable: 'GEMINI_API_KEY',
    displayName: 'Gemini CLI',
    featured: false,
    executable: 'gemini',
    npmPackage: '@google/gemini-cli',
    homepage: 'https://geminicli.com/docs/',
    thinkingLevels: [],
    defaultModel: 'gemini-2.5-pro',
    modelCatalog: 'partial',
    endpoints: { official: 'https://generativelanguage.googleapis.com', custom: false },
    capabilities: { mcp: false, readOnly: true },
    loginHint: 'Start `gemini` once and choose “Login with Google”, or set GEMINI_API_KEY.',
    inspect,
    buildInvocation,
    parseLine: parseStreamJson,
};
