import { join } from 'node:path';
import { readJsonIfExists } from '../../../common/fs.js';
import { anyExists, baseInspection, homePath, observedSessionSupport, parseStreamJson, withAuthentication } from '../../shared.js';
import type { HarnessContext, HarnessInspection, HarnessInvocation, HarnessLoginMethod, HarnessPlugin, HarnessRunRequest, LoginLocation } from '../../types.js';

/**
 * Inspects installation and stored Google login / API configuration.
 */
async function inspect(context: HarnessContext): Promise<HarnessInspection> {
    const { inspection, executablePath } = await baseInspection(plugin, context);
    if (!executablePath) return inspection;
    if (context.tool?.authentication === 'API_KEY' && context.env.GEMINI_API_KEY) return withAuthentication(inspection, true, 'api', plugin.loginHint);
    const configHome = context.env.GEMINI_CLI_HOME ? join(context.env.GEMINI_CLI_HOME, '.gemini') : homePath('.gemini');
    if (await anyExists([join(configHome, 'oauth_creds.json')])) return withAuthentication(inspection, true, 'account', plugin.loginHint);
    if (context.env.GEMINI_API_KEY || context.env.GOOGLE_API_KEY || context.env.GOOGLE_GENAI_USE_VERTEXAI) return withAuthentication(inspection, true, 'api', plugin.loginHint);
    const settings = await readJsonIfExists<{ security?: { auth?: { selectedType?: string } }; selectedAuthType?: string }>(join(configHome, 'settings.json')).catch(() => undefined);
    if (settings?.security?.auth?.selectedType || settings?.selectedAuthType) return withAuthentication(inspection, 'unknown', 'unknown', plugin.loginHint);
    return withAuthentication(inspection, false, 'none', plugin.loginHint);
}

/** Gemini's terminal supports a manual browser sign-in on headless hosts. */
function loginMethods(_context: HarnessContext, location: LoginLocation): Promise<HarnessLoginMethod[]> {
    return Promise.resolve([{
        id: 'native', label: 'Sign in in the Gemini terminal', args: [], remote: true, terminal: 'inherit',
        ...(location === 'remote' ? { env: { NO_BROWSER: 'true' } } : {}),
        instructions: 'Choose an authentication method in Gemini CLI, follow its instructions, then exit the CLI.',
    }]);
}

/**
 * Builds headless `gemini -p` in YOLO (or read-only plan) approval mode.
 */
async function buildInvocation(request: HarnessRunRequest): Promise<HarnessInvocation> {
    const args = ['--output-format', 'stream-json', '--skip-trust', '--approval-mode', request.readOnly ? 'plan' : 'yolo'];
    if (request.model) args.push('--model', request.model);
    for (const directory of request.readableDirectories) args.push('--include-directories', directory);
    args.push('-p', `Read the complete task instructions in the file ${request.promptFile} and follow them exactly.`);
    const env = { ...request.env };
    if (request.authentication === 'api' && env.GEMINI_API_KEY && env.GEMINI_CLI_HOME) {
        // Let the documented API-key mode win over ambient Google Cloud authentication and endpoint settings.
        delete env.GOOGLE_GENAI_USE_GCA;
        delete env.GOOGLE_GENAI_USE_VERTEXAI;
        delete env.GOOGLE_API_KEY;
        delete env.GOOGLE_GEMINI_BASE_URL;
    }
    return { args, env };
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
    apiKeyHomeVariable: 'GEMINI_CLI_HOME',
    setupApiKey: { label: 'Google AI Studio API key', url: 'https://aistudio.google.com/apikey', model: 'gemini-3.8-flash' },
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
    priceList: { providers: [{ catalog: 'gemini' }] },
    loginHint: 'Start `gemini` once and choose “Login with Google”, or set GEMINI_API_KEY.',
    loginMethods,
    inspect,
    buildInvocation,
    sessions: observedSessionSupport({ executable: 'gemini', help: ['--help'], continueNote: 'Gemini CLI resumes only by position in its own list, which is not a stable identity of this session: a next input starts a new session.' }),
    parseLine: parseStreamJson,
};
