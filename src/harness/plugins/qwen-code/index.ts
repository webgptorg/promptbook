import { readJsonIfExists } from '../../../common/fs.js';
import { anyExists, baseInspection, homePath, parseStreamJson, withAuthentication } from '../../shared.js';
import type { HarnessContext, HarnessInspection, HarnessInvocation, HarnessPlugin, HarnessRunRequest } from '../../types.js';

/**
 * Inspects installation and stored Qwen login / API configuration.
 */
async function inspect(context: HarnessContext): Promise<HarnessInspection> {
    const { inspection, executablePath } = await baseInspection(plugin, context);
    if (!executablePath) return inspection;
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
    const args = ['--output-format', 'stream-json', '--approval-mode', request.readOnly ? 'plan' : 'yolo'];
    if (request.model) args.push('--model', request.model);
    for (const directory of request.readableDirectories) args.push('--include-directories', directory);
    args.push(`Read the complete task instructions in the file ${request.promptFile} and follow them exactly.`);
    return { args, env: request.env };
}

/**
 * Qwen Code integration.
 *
 * @private harness plugin
 */
export const plugin: HarnessPlugin = {
    id: 'qwen-code',
    variant: 'QWEN_CODE',
    displayName: 'Qwen Code',
    featured: false,
    executable: 'qwen',
    npmPackage: '@qwen-code/qwen-code',
    homepage: 'https://qwenlm.github.io/qwen-code-docs/',
    thinkingLevels: [],
    capabilities: { mcp: false, readOnly: true },
    loginHint: 'Start `qwen` once and complete its login, or set DASHSCOPE_API_KEY.',
    inspect,
    buildInvocation,
    parseLine: parseStreamJson,
};
