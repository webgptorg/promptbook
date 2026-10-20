import type { ToolView } from '../engine/snapshot.js';
import { HARNESS_PLUGINS } from '../harness/registry.js';
import { BROWSER_VARIANTS, PROFILE_SOURCES, describeProfileSource, type ProfileSource } from '../tools/model.js';
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
 * Asks for the browser fields.
 */
async function browserFields(terminal: TerminalProfile, frame: WizardFrame, current?: { profileSource?: string; profilePath?: string; isHeadless?: boolean }): Promise<Pick<ToolDraft, 'profileSource' | 'profilePath' | 'isHeadless'>> {
    const profileSource = answer(
        await selectOne<ProfileSource>(terminal, {
            frame,
            question: 'Browser profile:',
            choices: PROFILE_SOURCES.map((source) => ({ value: source, label: describeProfileSource(source, source === 'CUSTOM' ? '<path>' : undefined), description: source })),
            defaultValue: (current?.profileSource as ProfileSource | undefined) ?? 'MANAGED_GLOBAL',
        }),
    );
    const profilePath = profileSource === 'CUSTOM' ? answer(await inputLine(terminal, { frame, question: 'Path of the existing profile directory:', initial: current?.profilePath, validate: (value) => (!value ? 'Enter a path.' : undefined) })) : undefined;
    const isHeadless = answer(await confirm(terminal, { frame, question: 'Run it headless (without a window)?', defaultYes: current?.isHeadless ?? true }));
    return { profileSource, ...(profilePath ? { profilePath } : {}), isHeadless };
}

/**
 * Asks for the authentication of a harness instance; a new API key is read concealed.
 */
async function harnessFields(terminal: TerminalProfile, frame: WizardFrame, name: string, current?: { authentication?: string; apiKeyEnv?: string }): Promise<{ fields: Pick<ToolDraft, 'authentication' | 'apiKeyEnv'>; secret?: ToolSecret }> {
    const authentication = answer(
        await selectOne(terminal, {
            frame,
            question: 'Authentication:',
            choices: [
                { value: 'NATIVE', label: 'Native login', description: 'the installation’s own account/subscription (no API billing)' },
                { value: 'API_KEY', label: 'API key', description: 'explicit paid API access through an environment variable' },
            ],
            defaultValue: current?.authentication ?? 'NATIVE',
        }),
    );
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
 * The add form: type, variant, name, description and the variant's fields.
 *
 * @private dashboard tool forms
 */
export async function addToolForm(terminal: TerminalProfile): Promise<ToolForm | undefined> {
    const frame: WizardFrame = { title: 'ptbk dashboard', step: 'Add a tool' };
    try {
        const type = answer(await selectOne(terminal, { frame, question: 'Tool type:', choices: [{ value: 'HARNESS', label: 'Harness', description: 'a coding agent integration instance (account, subscription or API key)' }, { value: 'BROWSER', label: 'Browser', description: 'a named browser profile for websites' }], defaultValue: 'HARNESS' }));
        const variant = answer(
            await selectOne(terminal, {
                frame,
                question: 'Variant:',
                choices: type === 'BROWSER' ? BROWSER_VARIANTS.map((value) => ({ value, label: value })) : HARNESS_PLUGINS.map((plugin) => ({ value: plugin.variant, label: plugin.displayName, description: plugin.variant, featured: plugin.featured })),
                defaultValue: type === 'BROWSER' ? 'CHROME' : 'OPENAI_CODEX',
            }),
        );
        const name = answer(await inputLine(terminal, { frame, question: 'Name (kebab-case, e.g. work-browser or codex-company):', validate: (value) => (!value ? 'Enter a name.' : undefined) }));
        const description = answer(await inputLine(terminal, { frame, question: 'Description (optional; helps agents choose it — enter "-" for none):', initial: '-' }));
        const base = { type, variant, name, ...(description && description !== '-' ? { description } : {}) };
        if (type === 'BROWSER') return { operation: { kind: 'add', tool: { ...base, ...(await browserFields(terminal, frame)) } } };
        const harness = await harnessFields(terminal, frame, name);
        return { operation: { kind: 'add', tool: { ...base, ...harness.fields } }, secret: harness.secret };
    } catch (error) {
        if (error instanceof FormCancelled) return undefined;
        throw error;
    }
}

/**
 * The modify form of one tool (unchanged fields stay as they are).
 *
 * @private dashboard tool forms
 */
export async function modifyToolForm(terminal: TerminalProfile, item: ToolView): Promise<ToolForm | undefined> {
    const frame: WizardFrame = { title: 'ptbk dashboard', step: `Modify ${item.name}` };
    try {
        const field = answer(
            await selectOne(terminal, {
                frame,
                question: `What should change on ${item.name}?`,
                choices: [
                    { value: 'description', label: 'Description' },
                    { value: 'rename', label: 'Name' },
                    ...(item.type === 'BROWSER' ? [{ value: 'browser', label: 'Profile and window mode' }] : [{ value: 'authentication', label: 'Authentication / API key' }, { value: 'model', label: 'Preferred model' }]),
                ],
                defaultValue: item.type === 'BROWSER' ? 'browser' : 'authentication',
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
        if (field === 'model') {
            const model = answer(await inputLine(terminal, { frame, question: 'Preferred model ("-" uses the harness default):', initial: item.fields.model ?? '-' }));
            return { operation: { kind: 'modify', name: item.name, changes: { model: model === '-' ? null : model } } };
        }
        if (field === 'browser') {
            const [source, ...path] = (item.fields.profile ?? 'MANAGED_GLOBAL').split(' ');
            const changes: ToolChanges = await browserFields(terminal, frame, { profileSource: source, profilePath: path.join(' ') || undefined, isHeadless: item.fields.isHeadless !== 'false' });
            return { operation: { kind: 'modify', name: item.name, changes: { ...changes, ...(changes.profileSource !== 'CUSTOM' ? { profilePath: null } : {}) } } };
        }
        const current = /env\.([A-Za-z_][A-Za-z0-9_]*)/.exec(item.fields.apiKey ?? '')?.[1];
        const harness = await harnessFields(terminal, frame, item.name, { authentication: item.fields.authentication, apiKeyEnv: current });
        return { operation: { kind: 'modify', name: item.name, changes: harness.fields }, secret: harness.secret };
    } catch (error) {
        if (error instanceof FormCancelled) return undefined;
        throw error;
    }
}
