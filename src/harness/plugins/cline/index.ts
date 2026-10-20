import { anyExists, baseInspection, homePath, parseJsonLine, summarizeToolInput, withAuthentication } from '../../shared.js';
import type { HarnessContext, HarnessEvent, HarnessInspection, HarnessInvocation, HarnessPlugin, HarnessRunRequest, ParserState } from '../../types.js';

/**
 * Inspects installation and stored provider configuration.
 */
async function inspect(context: HarnessContext): Promise<HarnessInspection> {
    const { inspection, executablePath } = await baseInspection(plugin, context);
    if (!executablePath) return inspection;
    const configured = await anyExists([homePath('.cline', 'data', 'secrets.json'), homePath('.cline', 'data', 'globalState.json'), homePath('.cline', 'data', 'settings', 'providers.json')]);
    if (configured || context.env.CLINE_API_KEY) return withAuthentication(inspection, true, 'unknown', plugin.loginHint);
    return withAuthentication(inspection, false, 'none', plugin.loginHint, 'Installed, but no provider is configured.');
}

/**
 * Builds `cline -y --json` (prompt passed through a file reference).
 */
async function buildInvocation(request: HarnessRunRequest): Promise<HarnessInvocation> {
    const args = ['-y', '--json', '-c', request.cwd];
    if (request.model) args.push('-m', request.model);
    if (request.thinkingLevel) args.push('--thinking', request.thinkingLevel);
    args.push(`Read the complete task instructions in the file ${request.promptFile} and follow them exactly.`);
    return { args, env: request.env };
}

/**
 * Parses Cline JSON messages tolerantly.
 */
function parseLine(line: string, state: ParserState): HarnessEvent[] {
    const event = parseJsonLine(line);
    if (!event) return [];
    void state;
    const text = typeof event.text === 'string' ? event.text : typeof event.content === 'string' ? event.content : undefined;
    const kind = String(event.say ?? event.ask ?? event.type ?? '');
    if (/error/i.test(kind)) return text ? [{ type: 'error', text }] : [];
    if (/tool|command/i.test(kind)) return [{ type: 'activity', text: `${kind} ${summarizeToolInput(event.input ?? text)}`.trim() }];
    if (/reasoning|thinking/i.test(kind)) return text ? [{ type: 'reasoning', text }] : [];
    if (/completion_result|text|message|result/i.test(kind) && text) return [{ type: 'message', text }];
    return [];
}

/**
 * Cline CLI integration.
 *
 * @private harness plugin
 */
export const plugin: HarnessPlugin = {
    id: 'cline',
    variant: 'CLINE',
    displayName: 'Cline',
    featured: false,
    executable: 'cline',
    npmPackage: 'cline',
    homepage: 'https://docs.cline.bot/cline-cli/overview',
    thinkingLevels: ['low', 'medium', 'high', 'xhigh'],
    thinkingLabel: 'thinking (--thinking)',
    capabilities: { mcp: false, readOnly: false },
    loginArgs: ['auth'],
    loginHint: 'Run `cline auth` to configure a provider.',
    selfUpdateArgs: ['--update'],
    inspect,
    buildInvocation,
    parseLine,
};
