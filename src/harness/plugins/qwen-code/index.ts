import { readJsonIfExists } from '../../../common/fs.js';
import { anyExists, baseInspection, homePath, observedSessionSupport, parseStreamJson, withAuthentication } from '../../shared.js';
import type { HarnessContext, HarnessInspection, HarnessInvocation, HarnessPlugin, HarnessRunRequest } from '../../types.js';

/**
 * Inspects installation and stored Qwen login / API configuration.
 */
async function inspect(context: HarnessContext): Promise<HarnessInspection> {
    const { inspection, executablePath } = await baseInspection(plugin, context);
    if (!executablePath) return inspection;
    if (context.tool?.authentication === 'API_KEY' && context.env.OPENAI_API_KEY) return withAuthentication(inspection, true, 'api', plugin.loginHint);
    if (await anyExists([homePath('.qwen', 'oauth_creds.json')])) return withAuthentication(inspection, true, 'account', plugin.loginHint);
    if (context.env.DASHSCOPE_API_KEY || context.env.QWEN_API_KEY) return withAuthentication(inspection, true, 'api', plugin.loginHint);
    const settings = await readJsonIfExists<{ security?: { auth?: { selectedType?: string } } }>(homePath('.qwen', 'settings.json')).catch(() => undefined);
    if (settings?.security?.auth?.selectedType) return withAuthentication(inspection, 'unknown', 'unknown', plugin.loginHint);
    return withAuthentication(inspection, false, 'none', plugin.loginHint);
}

/**
 * Builds one-shot `qwen` in YOLO (or read-only plan) approval mode.
 */
async function buildInvocation(request: HarnessRunRequest): Promise<HarnessInvocation> {
    const args = ['--output-format', 'stream-json', '--approval-mode', request.readOnly ? 'plan' : 'yolo', ...(request.resumeSessionId ? ['--resume', request.resumeSessionId] : [])];
    if (request.authentication === 'api' && request.env.OPENAI_API_KEY && request.baseUrl === plugin.setupApiKey?.baseUrl) args.push('--auth-type', 'openai');
    if (request.model) args.push('--model', request.model);
    for (const directory of request.readableDirectories) args.push('--include-directories', directory);
    args.push(`Read the complete task instructions in the file ${request.promptFile} and follow them exactly.`);
    return { args, env: request.baseUrl ? { ...request.env, OPENAI_BASE_URL: request.baseUrl } : request.env };
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
