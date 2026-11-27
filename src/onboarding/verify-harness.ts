import { createRedactor } from '../common/redact.js';
import { pluginDefaultRow } from '../engine/routing.js';
import { functionalCheck, type PreparatoryCall } from '../harness/preparation.js';
import type { HarnessContext, HarnessInspection, HarnessPlugin } from '../harness/types.js';

/** Single-line bounded diagnostic for a contract prompt. */
function diagnostic(text: string): string {
    // eslint-disable-next-line no-control-regex -- Terminal control bytes cannot be displayed in the browser.
    return text.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 500);
}

/** The checked invocation or a bounded explanation safe to show on the owner's sign-in form. */
type Verification = { call: PreparatoryCall; diagnostic?: undefined } | { call?: undefined; diagnostic: string };

/** Tests the selected provider through the real CLI without retaining its output or credentials. @private onboarding */
export async function verifyHarness(plugin: HarnessPlugin, context: HarnessContext, inspection: HarnessInspection, timeoutMs?: number): Promise<Verification> {
    context.signal?.throwIfAborted();
    if (!inspection.usable || (context.tool?.authentication === 'NATIVE' && inspection.authentication === 'api')) return { diagnostic: diagnostic(inspection.summary) };
    const api = context.tool?.authentication === 'API_KEY' ? plugin.setupApiKey : undefined;
    const catalog = !api?.model && plugin.modelCatalog === 'complete' && plugin.listModels ? await plugin.listModels(context).catch(() => []) : [];
    const row = pluginDefaultRow(plugin, catalog);
    const call = { plugin, inspection, env: context.env, signal: context.signal, baseUrl: context.tool?.baseUrl, model: api?.model ?? row.model, thinkingLevel: api?.thinkingLevel ?? row.thinking };
    const check = await functionalCheck({ ...call, timeoutMs, ...(context.tool?.authentication === 'NATIVE' ? { modelCandidates: catalog } : {}) });
    if (check.ok) return { call: { ...call, model: check.model ?? call.model } };
    // A pasted key and provider URLs with transient challenges must never return to the form.
    const detail = createRedactor([], context.env)(check.summary).replace(/https?:\/\/[^\s<>"']+/gi, '[provider URL]');
    return { diagnostic: diagnostic(detail) || 'The CLI could not verify a response.' };
}
