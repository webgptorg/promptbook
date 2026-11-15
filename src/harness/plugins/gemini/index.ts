import { join } from 'node:path';
import { readJsonIfExists } from '../../../common/fs.js';
import { anyExists, baseInspection, contextHome, observedSessionSupport, parseStreamJson, withAuthentication } from '../../shared.js';
import type { HarnessContext, HarnessInspection, HarnessInvocation, HarnessLoginMethod, HarnessPlugin, HarnessRunRequest, LoginLocation } from '../../types.js';

/**
 * Every variable through which Gemini CLI chooses an API-key, Vertex AI or Code Assist route (or another endpoint).
 */
const ROUTE_VARIABLES = ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_GENAI_USE_VERTEXAI', 'GOOGLE_GENAI_USE_GCA', 'GOOGLE_GEMINI_BASE_URL', 'GOOGLE_VERTEX_BASE_URL'];

/**
 * Saved authentication types of Gemini CLI that are API routes, not a native Google login.
 */
const API_TYPES = new Set(['gemini-api-key', 'vertex-ai', 'USE_GEMINI', 'USE_VERTEX_AI']);

/**
 * Inspects installation and stored Google login / API configuration. A native instance is ready only from its Google
 * login; a saved API-key or Vertex AI selection would take precedence over that login, so it is reported as such.
 */
async function inspect(context: HarnessContext): Promise<HarnessInspection> {
    const { inspection, executablePath } = await baseInspection(plugin, context);
    if (!executablePath) return inspection;
    if (context.tool?.authentication === 'API_KEY' && context.env.GEMINI_API_KEY) return withAuthentication(inspection, true, 'api', plugin.loginHint);
    const configHome = join(context.env.GEMINI_CLI_HOME || contextHome(context.env), '.gemini');
    const settings = await readJsonIfExists<{ security?: { auth?: { selectedType?: string } }; selectedAuthType?: string }>(join(configHome, 'settings.json')).catch(() => undefined);
    const selected = settings?.security?.auth?.selectedType ?? settings?.selectedAuthType;
    if (selected && API_TYPES.has(selected)) return withAuthentication(inspection, true, 'api', plugin.loginHint, `Gemini CLI is set to ${selected} authentication in its settings.json.`);
    if (await anyExists([join(configHome, 'oauth_creds.json')])) return withAuthentication(inspection, true, 'account', plugin.loginHint);
    if (context.tool?.authentication !== 'NATIVE' && (context.env.GEMINI_API_KEY || context.env.GOOGLE_API_KEY || context.env.GOOGLE_GENAI_USE_VERTEXAI)) return withAuthentication(inspection, true, 'api', plugin.loginHint);
    if (selected) return withAuthentication(inspection, 'unknown', 'unknown', plugin.loginHint);
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
    ambientApiKeyVariables: ROUTE_VARIABLES,
    // Without a saved selection, headless Gemini CLI uses the Google login only when asked to.
    modeEnvironment: { NATIVE: { GOOGLE_GENAI_USE_GCA: 'true' } },
    // The user's own settings.json could select the Google login over the configured key: API_KEY uses its own home.
    apiKeyProfile: { home: 'GEMINI_CLI_HOME' },
    setupApiKey: {
        reference: 'PTBK_GEMINI_API_KEY', label: 'Google AI Studio API key', url: 'https://aistudio.google.com/apikey', model: 'gemini-3.8-flash',
        profile: {
            home: 'GEMINI_CLI_HOME',
            omit: ['GOOGLE_GENAI_USE_GCA', 'GOOGLE_GENAI_USE_VERTEXAI', 'GOOGLE_API_KEY', 'GOOGLE_GEMINI_BASE_URL'],
        },
    },
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
    loginHint: 'Start `gemini` once and choose “Login with Google”; for a Gemini API key, add an API_KEY instance instead (ptbk tool add HARNESS --variant GEMINI --authentication API_KEY --api-key-env GEMINI_API_KEY --api-key-stdin).',
    loginMethods,
    inspect,
    buildInvocation,
    sessions: observedSessionSupport({ executable: 'gemini', help: ['--help'], continueNote: 'Gemini CLI resumes only by position in its own list, which is not a stable identity of this session: a next input starts a new session.' }),
    parseLine: parseStreamJson,
};
