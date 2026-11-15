import { readJsonIfExists } from '../../../common/fs.js';
import { join } from 'node:path';
import { anyExists, baseInspection, contextHome, helpText, observedSessionSupport, parseStreamJson, withAuthentication } from '../../shared.js';
import type { HarnessContext, HarnessInspection, HarnessInvocation, HarnessPlugin, HarnessRunRequest } from '../../types.js';

/**
 * Every variable through which Qwen Code picks an OpenAI-compatible, DashScope, Qwen, Anthropic or Gemini route.
 */
const ROUTE_VARIABLES = ['OPENAI_API_KEY', 'OPENAI_BASE_URL', 'DASHSCOPE_API_KEY', 'QWEN_API_KEY', 'ANTHROPIC_API_KEY', 'ANTHROPIC_BASE_URL', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_GENAI_USE_VERTEXAI'];

/**
 * Credential-free placeholder for an OpenAI-compatible endpoint that needs no key (the client requires a value).
 */
const CREDENTIAL_FREE_KEY = 'ptbk-credential-free';

/**
 * Inspects installation and stored Qwen login / API configuration. A native instance is ready only from its Qwen
 * OAuth login; a saved non-OAuth selection is an API route.
 */
async function inspect(context: HarnessContext): Promise<HarnessInspection> {
    const { inspection, executablePath } = await baseInspection(plugin, context);
    if (!executablePath) return inspection;
    if (context.tool?.authentication === 'API_KEY' && context.env.OPENAI_API_KEY) return withAuthentication(inspection, true, 'api', plugin.loginHint);
    const home = join(contextHome(context.env), '.qwen');
    const settings = await readJsonIfExists<{ security?: { auth?: { selectedType?: string } } }>(join(home, 'settings.json')).catch(() => undefined);
    const selected = settings?.security?.auth?.selectedType;
    if (await anyExists([join(home, 'oauth_creds.json')])) return withAuthentication(inspection, true, 'account', plugin.loginHint);
    if (context.tool?.authentication !== 'NATIVE' && (context.env.DASHSCOPE_API_KEY || context.env.QWEN_API_KEY)) return withAuthentication(inspection, true, 'api', plugin.loginHint);
    if (selected && selected !== 'qwen-oauth') return withAuthentication(inspection, true, 'api', plugin.loginHint, `Qwen Code is set to ${selected} authentication in its settings.json.`);
    if (selected) return withAuthentication(inspection, 'unknown', 'unknown', plugin.loginHint);
    return withAuthentication(inspection, false, 'none', plugin.loginHint);
}

/**
 * Builds one-shot `qwen` in YOLO (or read-only plan) approval mode. The authentication type is always explicit, so a
 * saved selection of the user's own CLI cannot switch the route: Qwen OAuth for a native instance (where the installed
 * CLI offers it), the configured key on the resolved endpoint for API_KEY, and the credential-free endpoint for NONE.
 */
async function buildInvocation(request: HarnessRunRequest): Promise<HarnessInvocation> {
    const args = ['--output-format', 'stream-json', '--approval-mode', request.readOnly ? 'plan' : 'yolo', ...(request.resumeSessionId ? ['--resume', request.resumeSessionId] : [])];
    let env = request.env;
    if (request.authentication === 'api') {
        args.push('--auth-type', 'openai');
        env = { ...env, OPENAI_BASE_URL: request.baseUrl ?? plugin.endpoints.official };
    } else if (request.authentication === 'local') {
        args.push('--auth-type', 'openai');
        env = { ...env, OPENAI_API_KEY: CREDENTIAL_FREE_KEY, ...(request.baseUrl ? { OPENAI_BASE_URL: request.baseUrl } : {}) };
    } else if ((await helpText({ projectRoot: request.projectRoot, env: request.env }, 'qwen', ['--help'])).includes('qwen-oauth')) {
        args.push('--auth-type', 'qwen-oauth');
    }
    if (request.model) args.push('--model', request.model);
    for (const directory of request.readableDirectories) args.push('--include-directories', directory);
    args.push(`Read the complete task instructions in the file ${request.promptFile} and follow them exactly.`);
    return { args, env };
}

/**
 * Qwen Code integration.
 *
 * @private harness plugin
 */
export const plugin: HarnessPlugin = {
    id: 'qwen-code',
    variant: 'QWEN_CODE',
    apiKeyVariable: 'OPENAI_API_KEY',
    ambientApiKeyVariables: ROUTE_VARIABLES,
    setupApiKey: {
        reference: 'PTBK_QWEN_CODE_API_KEY',
        label: 'QwenCloud Singapore pay-as-you-go API key', url: 'https://docs.qwencloud.com/api-reference/preparation/api-key',
        baseUrl: 'https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1', model: 'qwen3.8-max',
    },
    displayName: 'Qwen Code',
    featured: false,
    executable: 'qwen',
    npmPackage: '@qwen-code/qwen-code',
    homepage: 'https://qwenlm.github.io/qwen-code-docs/',
    thinkingLevels: [],
    defaultModel: 'qwen3-coder-plus',
    modelCatalog: 'partial',
    endpoints: { official: 'https://dashscope.aliyuncs.com/compatible-mode/v1', local: 'http://localhost:11434/v1', custom: true },
    capabilities: { mcp: false, readOnly: true },
    priceList: { providers: [{ catalog: 'dashscope' }] },
    loginArgs: ['--approval-mode', 'plan'],
    loginHint: 'Start `qwen`, use /auth to sign in, and exit when finished.',
    inspect,
    buildInvocation,
    sessions: observedSessionSupport({ executable: 'qwen', help: ['--help'], continueFlag: '--resume' }),
    parseLine: parseStreamJson,
};
