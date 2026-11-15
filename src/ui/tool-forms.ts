import type { ToolView } from '../engine/snapshot.js';
import { HARNESS_PLUGINS } from '../harness/registry.js';
import { BROWSER_VARIANTS, INFERENCE_RUNTIME_VARIANTS, PROFILE_SOURCES, describeProfileSource, type ProfileSource } from '../tools/model.js';
import type { ToolChanges, ToolDraft, ToolOperation, ToolSecret } from '../tools/operations.js';
import { CANCELLED, confirm, inputLine, selectOne, type WizardFrame } from './prompts.js';
import { readConcealed } from './secret.js';
import type { TerminalProfile } from './terminal.js';

/**
 * A completed form: the operation for the shared tool management and an optional write-only secret.
 *
 * @private dashboard tool forms
 */
export type ToolForm = { readonly operation: ToolOperation; readonly secret?: ToolSecret };

/**
 * Raised when the user leaves the form (nothing is changed).
 */
class FormCancelled extends Error {}

/**
 * Unwraps a prompt answer.
 */
function answer<T>(value: T | typeof CANCELLED): T {
    if (value === CANCELLED) throw new FormCancelled('cancelled');
    return value;
}

/**
 * Asks for the browser fields: profile source, its applicable path, window mode and the optional executable override.
 * Every answer starts at the current value, so confirming unchanged answers changes nothing; emptying an optional field
 * clears it explicitly.
 */
async function browserFields(
    terminal: TerminalProfile,
    frame: WizardFrame,
    current?: { profileSource?: string; profilePath?: string; isHeadless?: boolean; executable?: string },
): Promise<{ readonly profileSource: string; readonly profilePath?: string; readonly isHeadless: boolean; readonly executable?: string }> {
    const profileSource = answer(
        await selectOne<ProfileSource>(terminal, {
            frame,
            question: 'Browser profile:',
            choices: PROFILE_SOURCES.map((source) => ({ value: source, label: describeProfileSource(source, source === 'CUSTOM' ? '<path>' : undefined), description: source })),
            defaultValue: (current?.profileSource as ProfileSource | undefined) ?? 'MANAGED_GLOBAL',
        }),
    );
    // A path belongs to its source: switching the source starts from that source's default location.
    const initialPath = profileSource === current?.profileSource ? current?.profilePath : undefined;
    const profilePath =
        profileSource === 'CUSTOM'
            ? answer(await inputLine(terminal, { frame, question: 'Path of the existing profile directory:', initial: initialPath, validate: (value) => (!value ? 'Enter a path.' : undefined) }))
            : answer(await inputLine(terminal, { frame, question: `Profile path (optional; empty uses the default location of ${describeProfileSource(profileSource)}):`, initial: initialPath, optional: true }));
    const isHeadless = answer(await confirm(terminal, { frame, question: 'Run it headless (without a window)?', defaultYes: current?.isHeadless ?? true }));
    const executable = answer(await inputLine(terminal, { frame, question: 'Browser executable (optional; empty discovers the installed browser):', initial: current?.executable, placeholder: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', optional: true }));
    return { profileSource, ...(profilePath ? { profilePath } : {}), isHeadless, ...(executable ? { executable } : {}) };
}

/**
 * The adapter of a harness variant.
 */
function pluginOf(variant: string): (typeof HARNESS_PLUGINS)[number] | undefined {
    return HARNESS_PLUGINS.find((plugin) => plugin.variant === variant);
}

/**
 * Asks for the authentication of a harness instance; a new API key is read concealed (write-only), a credential-free
 * local connection names its inference runtime.
 */
async function harnessFields(
    terminal: TerminalProfile,
    frame: WizardFrame,
    name: string,
    current?: { authentication?: string; apiKeyEnv?: string; inferenceRuntime?: string },
): Promise<{ fields: Pick<ToolDraft, 'authentication' | 'apiKeyEnv' | 'baseUrl' | 'inferenceRuntime'>; secret?: ToolSecret }> {
    const authentication = answer(
        await selectOne(terminal, {
            frame,
            question: 'Authentication:',
            choices: [
                { value: 'NATIVE', label: 'Native login', description: 'the installation’s own account/subscription (no API billing)' },
                { value: 'API_KEY', label: 'API key', description: 'explicit paid API access through an environment variable' },
                { value: 'NONE', label: 'None', description: 'a credential-free connection to a local model runtime on the engine host' },
            ],
            defaultValue: current?.authentication ?? 'NATIVE',
        }),
    );
    if (authentication === 'NONE') {
        const inferenceRuntime = answer(await inputLine(terminal, { frame, question: 'Local model runtime (its INFERENCE_RUNTIME tool name; empty for none):', initial: current?.inferenceRuntime, placeholder: 'local-ollama', optional: true }));
        return { fields: { authentication, baseUrl: 'LOCAL', ...(inferenceRuntime ? { inferenceRuntime } : {}) } };
    }
    if (authentication !== 'API_KEY') return { fields: { authentication } };
    const apiKeyEnv = answer(
        await inputLine(terminal, {
            frame,
            question: 'Environment variable holding the key (stored as ${{ env.NAME }}, never the key):',
            initial: current?.apiKeyEnv ?? `${name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_API_KEY`,
            validate: (value) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(value) ? undefined : 'Use letters, digits and underscores.'),
        }),
    );
    const store = answer(await confirm(terminal, { frame, question: `Store a new value of ${apiKeyEnv} in the project's ignored .env now?`, defaultYes: !current?.apiKeyEnv }));
    if (!store) return { fields: { authentication, apiKeyEnv } };
    const value = await readConcealed(terminal, `  Value of ${apiKeyEnv}`);
    return { fields: { authentication, apiKeyEnv }, secret: value ? { variable: apiKeyEnv, value } : undefined };
}

/**
 * Asks for the separate native account context of an adapter that supports one (empty: the default login).
 */
async function accountProfileField(terminal: TerminalProfile, frame: WizardFrame, current?: string): Promise<string | undefined> {
    const value = answer(
        await inputLine(terminal, {
            frame,
            question: 'Separate native account context (optional; empty uses the default login of this installation):',
            initial: current,
            placeholder: 'company',
            optional: true,
            validate: (text) => (!text || /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(text) ? undefined : 'Use letters, digits, dots, dashes and underscores.'),
        }),
    );
    return value || undefined;
}

/**
 * The variants of a tool type, for choosing one when adding or modifying.
 */
function variantChoices(type: string): Array<{ value: string; label: string; description?: string; featured?: boolean }> {
    if (type === 'COMPUTER_CONTROL') return [{ value: 'NATIVE', label: 'Native desktop' }];
    if (type === 'BROWSER') return BROWSER_VARIANTS.map((value) => ({ value, label: value }));
    if (type === 'INFERENCE_RUNTIME') return INFERENCE_RUNTIME_VARIANTS.map((value) => ({ value, label: value === 'OLLAMA' ? 'Ollama' : 'LM Studio', description: value }));
    return HARNESS_PLUGINS.map((plugin) => ({ value: plugin.variant, label: plugin.displayName, description: plugin.variant, featured: plugin.featured }));
}

/**
 * Asks for an inference runtime's service URL (empty: the adapter discovers its local service).
 */
async function runtimeEndpointField(terminal: TerminalProfile, frame: WizardFrame, current?: string): Promise<string | undefined> {
    const value = answer(await inputLine(terminal, { frame, question: 'Service URL (optional; empty discovers the local service):', initial: current, placeholder: 'http://127.0.0.1:11434', optional: true, validate: (text) => (!text || /^https?:\/\/\S+$/i.test(text) ? undefined : 'Enter an http(s) URL.') }));
    return value || undefined;
}

/**
 * The add form: type, variant, name, description and the variant's fields (the same domain fields as CLI).
 *
 * @private dashboard tool forms
 */
export async function addToolForm(terminal: TerminalProfile): Promise<ToolForm | undefined> {
    const frame: WizardFrame = { title: 'ptbk dashboard', step: 'Add a tool' };
    try {
        const type = answer(
            await selectOne(terminal, {
                frame,
                question: 'Tool type:',
                choices: [
                    { value: 'HARNESS', label: 'Harness', description: 'a coding agent integration instance (account, subscription or API key)' },
                    { value: 'BROWSER', label: 'Browser', description: 'a named browser profile for websites' },
                    { value: 'INFERENCE_RUNTIME', label: 'Local model runtime', description: 'a reference to Ollama or LM Studio on the engine host (installs nothing)' },
                    { value: 'COMPUTER_CONTROL', label: 'Computer control', description: 'the engine host’s logged-in desktop (native OS permissions required)' },
                ],
                defaultValue: 'HARNESS',
            }),
        );
        const variant = answer(await selectOne(terminal, { frame, question: 'Variant:', choices: variantChoices(type), defaultValue: type === 'COMPUTER_CONTROL' ? 'NATIVE' : type === 'BROWSER' ? 'CHROME' : type === 'INFERENCE_RUNTIME' ? 'OLLAMA' : 'OPENAI_CODEX' }));
        const name = answer(await inputLine(terminal, { frame, question: 'Name (kebab-case, e.g. work-browser or codex-company):', validate: (value) => (!value ? 'Enter a name.' : undefined) }));
        const description = answer(await inputLine(terminal, { frame, question: 'Description (optional; helps agents choose it — enter "-" for none):', initial: '-' }));
        const base = { type, variant, name, ...(description && description !== '-' ? { description } : {}) };
        if (type === 'BROWSER') return { operation: { kind: 'add', tool: { ...base, ...(await browserFields(terminal, frame)) } } };
        if (type === 'COMPUTER_CONTROL') return { operation: { kind: 'add', tool: base } };
        if (type === 'INFERENCE_RUNTIME') {
            const endpoint = await runtimeEndpointField(terminal, frame);
            return { operation: { kind: 'add', tool: { ...base, ...(endpoint ? { endpoint } : {}) } } };
        }
        const harness = await harnessFields(terminal, frame, name);
        const plugin = pluginOf(variant);
        const accountProfile = harness.fields.authentication === 'NATIVE' && plugin?.accountHomeVariable ? await accountProfileField(terminal, frame) : undefined;
        const baseUrl = harness.fields.authentication === 'NONE' ? undefined : await endpointField(terminal, frame, { name, variant });
        return { operation: { kind: 'add', tool: { ...base, ...harness.fields, ...(accountProfile ? { accountProfile } : {}), ...(baseUrl ? { baseUrl } : {}) } }, secret: harness.secret };
    } catch (error) {
        if (error instanceof FormCancelled) return undefined;
        throw error;
    }
}

/**
 * Asks for a harness tool's endpoint among what its adapter can reach: `null` is the default, which saves nothing.
 */
async function endpointField(terminal: TerminalProfile, frame: WizardFrame, item: Pick<ToolView, 'name' | 'variant'> & { readonly fields?: ToolView['fields'] }): Promise<string | null> {
    const endpoints = pluginOf(item.variant)?.endpoints;
    const custom = /^custom\s+(\S+)/.exec(item.fields?.endpoint ?? '')?.[1];
    const choice = answer(
        await selectOne<'DEFAULT' | 'OFFICIAL' | 'LOCAL' | 'URL'>(terminal, {
            frame,
            question: `Which model endpoint should ${item.name} use?`,
            choices: [
                { value: 'DEFAULT', label: 'Default', description: 'the official endpoint, without saving a choice' },
                { value: 'OFFICIAL', label: 'Official', description: endpoints?.official ?? "the provider's fixed endpoint" },
                ...(endpoints?.local ? [{ value: 'LOCAL' as const, label: 'Local', description: `on the engine's host (${endpoints.local})` }] : []),
                ...(endpoints?.custom ? [{ value: 'URL' as const, label: 'Another base URL' }] : []),
            ],
            defaultValue: custom ? 'URL' : /^local/i.test(item.fields?.endpoint ?? '') ? 'LOCAL' : /^official$/i.test(item.fields?.baseUrl ?? '') ? 'OFFICIAL' : 'DEFAULT',
        }),
    );
    if (choice === 'DEFAULT') return null;
    if (choice !== 'URL') return choice;
    return answer(await inputLine(terminal, { frame, question: 'Base URL of the endpoint:', initial: custom, placeholder: 'https://proxy.example/v1', validate: (value) => (/^https?:\/\/\S+$/i.test(value) ? undefined : 'Enter an http(s) URL.') }));
}

/**
 * The modify form of one tool: one field group at a time, each starting at its current values, so unchanged answers
 * change nothing and clearing an optional override is explicit. A variant change stays within the tool's type and is
 * validated by the shared domain rules (an account context is never silently discarded).
 *
 * @private dashboard tool forms
 */
export async function modifyToolForm(terminal: TerminalProfile, item: ToolView): Promise<ToolForm | undefined> {
    const frame: WizardFrame = { title: 'ptbk dashboard', step: `Modify ${item.name}` };
    const fields = item.fields ?? {};
    const plugin = item.type === 'HARNESS' ? pluginOf(item.variant) : undefined;
    try {
        const field = answer(
            await selectOne(terminal, {
                frame,
                question: `What should change on ${item.name}?`,
                choices: [
                    { value: 'description', label: 'Description' },
                    { value: 'rename', label: 'Name' },
                    ...(item.type === 'COMPUTER_CONTROL'
                        ? []
                        : item.type === 'BROWSER'
                          ? [{ value: 'browser', label: 'Profile, window mode and executable' }]
                          : item.type === 'INFERENCE_RUNTIME'
                            ? [{ value: 'service', label: 'Service URL' }]
                            : [
                                  { value: 'authentication', label: 'Authentication / API key / local runtime' },
                                  { value: 'endpoint', label: 'Model endpoint' },
                                  // Offered where the adapter supports it, or to clear an override it cannot use.
                                  ...(plugin?.accountHomeVariable || fields.accountProfile ? [{ value: 'account', label: 'Native account context', description: fields.accountProfile ? `now: ${fields.accountProfile}` : 'now: the default login' }] : []),
                              ]),
                    ...(variantChoices(item.type).length > 1 ? [{ value: 'variant', label: 'Variant', description: `now: ${item.variant}` }] : []),
                ],
                defaultValue: item.type === 'COMPUTER_CONTROL' ? 'description' : item.type === 'BROWSER' ? 'browser' : item.type === 'INFERENCE_RUNTIME' ? 'service' : 'authentication',
            }),
        );
        if (field === 'rename') {
            const rename = answer(await inputLine(terminal, { frame, question: 'New name:', initial: item.name }));
            return { operation: { kind: 'modify', name: item.name, changes: {}, rename } };
        }
        if (field === 'description') {
            const description = answer(await inputLine(terminal, { frame, question: 'Description ("-" removes it):', initial: item.description ?? '-' }));
            return { operation: { kind: 'modify', name: item.name, changes: { description: description === '-' ? null : description } } };
        }
        if (field === 'variant') {
            const variant = answer(await selectOne(terminal, { frame, question: `Variant of ${item.name} (the type stays ${item.type}; other settings are kept):`, choices: variantChoices(item.type), defaultValue: item.variant }));
            return { operation: { kind: 'modify', name: item.name, changes: variant === item.variant ? {} : { variant } } };
        }
        if (field === 'endpoint') {
            return { operation: { kind: 'modify', name: item.name, changes: { baseUrl: await endpointField(terminal, frame, item) } } };
        }
        if (field === 'service') {
            return { operation: { kind: 'modify', name: item.name, changes: { endpoint: (await runtimeEndpointField(terminal, frame, item.runtime?.endpointSource === 'configured' ? item.runtime.endpoint : undefined)) ?? null } } };
        }
        if (field === 'account') {
            return { operation: { kind: 'modify', name: item.name, changes: { accountProfile: (await accountProfileField(terminal, frame, fields.accountProfile)) ?? null } } };
        }
        if (field === 'browser') {
            const [source, ...path] = (fields.profile ?? 'MANAGED_GLOBAL').split(' ');
            const chosen = await browserFields(terminal, frame, { profileSource: source, profilePath: path.join(' ') || undefined, isHeadless: fields.isHeadless !== 'false', executable: fields.executable });
            const changes: ToolChanges = { profileSource: chosen.profileSource, profilePath: chosen.profilePath ?? null, isHeadless: chosen.isHeadless, executable: chosen.executable ?? null };
            return { operation: { kind: 'modify', name: item.name, changes } };
        }
        const current = /env\.([A-Za-z_][A-Za-z0-9_]*)/.exec(fields.apiKey ?? '')?.[1];
        const harness = await harnessFields(terminal, frame, item.name, { authentication: fields.authentication, apiKeyEnv: current, inferenceRuntime: fields.inferenceRuntime });
        // Leaving a local connection returns to the official endpoint and drops its runtime binding explicitly.
        const leavingLocal = fields.authentication === 'NONE' && harness.fields.authentication !== 'NONE';
        const changes: ToolChanges = { ...harness.fields, ...(harness.fields.authentication === 'NONE' ? { inferenceRuntime: harness.fields.inferenceRuntime ?? null } : leavingLocal ? { baseUrl: null, inferenceRuntime: null } : {}) };
        return { operation: { kind: 'modify', name: item.name, changes }, secret: harness.secret };
    } catch (error) {
        if (error instanceof FormCancelled) return undefined;
        throw error;
    }
}
