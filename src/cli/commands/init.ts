import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { EXIT, PtbkError, errorMessage, usageError } from '../../common/errors.js';
import { ensureDirectory, isDirectory, pathExists, toProjectRelative, writeFileAtomic } from '../../common/fs.js';
import { slugify } from '../../common/ids.js';
import { ENGINE_VERSION } from '../../common/version.js';
import { userChromeProfile } from '../../browser/browser.js';
import { BookIndex } from '../../project/books.js';
import { generatedName } from '../../tasks/identity.js';
import { validateCheckCommand } from '../../project/checks.js';
import { CHECK_PLACEHOLDER, SETTING_SPEC_BY_KEY, canonicalizeConfig, configText, enabledHarnesses, getPath, interpretConfig, isCheckPlaceholder, loadSettings, profileFromSpelling, readProjectConfigFile, serializeSettingValue, setPath, setting } from '../../project/config.js';
import { maintainProjectConfiguration } from '../../project/configuration.js';
import { MIGRATED_BROWSER_NAME, planConfigurationMigration } from '../../project/migrations.js';
import { requireEngineUpdate } from '../compatibility.js';
import { existingOrigin, githubLogin, publishProject, type PublicationChoice, type PublicationOutcome } from '../../project/publication.js';
import { instanceEnvironment } from '../../engine/harnesses.js';
import { pluginDefaultRow } from '../../engine/routing.js';
import { formatModelRow } from '../../book/model.js';
import { redactUrl } from '../../engine/sync.js';
import { applyToolOperationsToConfig, type ToolOperation } from '../../tools/operations.js';
import { inspectBrowserTool } from '../../tools/readiness.js';
import { describeProfileSource, harnessVariantOf, type BrowserToolRecord, type HarnessToolRecord } from '../../tools/model.js';
import { INITIAL_ASSETS, INITIAL_SPECIFICATION, bootstrapTask, sampleReadme } from '../../project/defaults.js';
import { clearSetupDraft, readSetupDraft, saveSetupDraft } from '../../project/draft.js';
import { commitPaths, inspectGit } from '../../project/git.js';
import { ensureManifest, inspectLocalInstallation, installLocally, verifyGlobalAvailability } from '../../project/install.js';
import { assessReadiness } from '../../project/readiness.js';
import { checkForEngineUpdate, updateEngine, type UpdateCheck } from '../../project/self-update.js';
import {
    ensureDefaultRoles,
    ensureGitRepository,
    ensureProjectInstructions,
    ensureRuntimeIgnore,
    ensureTemplates,
    ensureTraceIgnoreRules,
    hasFirstTask,
    isFreshDirectory,
    prepareNestedChild,
    registerSubmodule,
    traceIgnoreLines,
    type NestedStrategy,
} from '../../project/setup.js';
import { prepareCoreAgents } from '../../project/core-templates.js';
import { canonicalPath, projectAt, type Project } from '../../project/workspace.js';
import { HARNESS_PLUGINS, harnessPlugin } from '../../harness/registry.js';
import { functionalCheck, proposeProjectName, type FunctionalCheck, type PreparatoryCall } from '../../harness/preparation.js';
import { handOverCreated, intendedUser, missingDirectories, sharedProjectsRoot } from '../../common/user-home.js';
import { kebabIdentifier } from '../../common/naming.js';
import { WalletSubEngine } from '../../wallet/wallet.js';
import { confirmRecoveryWords, walletImportFlow } from '../../ui/wallet-forms.js';
import { checkHarnessVersion, installHarness, loginLocation, updateHarness } from '../../harness/maintenance.js';
import { attendHarnessSignIn, serviceProblemOf } from '../../ui/harness-sign-in.js';
import { persistentServiceEnvironment } from '../../service/records.js';
import type { HarnessInspection, HarnessPlugin } from '../../harness/types.js';
import type { ServiceSnapshot } from '../../engine/snapshot.js';
import { lookupService } from '../../service/control.js';
import { ensureKnownProject } from '../../service/known-projects.js';
import { launchDaemon } from '../../service/launcher.js';
import { newTaskPath, renderTaskBook } from '../../tasks/authoring.js';
import { wrap } from '../../ui/ansi.js';
import { materializeAttachments, isImagePath } from '../../ui/attachments.js';
import type { BadgeActivity } from '../../ui/badges.js';
import { celebrate } from '../../ui/celebration.js';
import { countdownHandoff } from '../../ui/countdown.js';
import type { ComposedSegment } from '../../ui/composer.js';
import { renderPanel } from '../../ui/panels.js';
import { CANCELLED, composeRich, confirm, inputLine, selectMany, selectOne, toggleList, wasInterrupted, type WizardFrame } from '../../ui/prompts.js';
import { symbols } from '../../ui/terminal.js';
import { readStdin, settingOverrides, tasksOverride, validateCombinations } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';
import { attachDashboard, wantsDashboardHandoff } from '../dashboard-handoff.js';
import { liveSnapshot } from '../service-view.js';

/**
 * Outcome of initialization.
 *
 * @private command
 */
export type InitResult = {
    readonly outcome: 'ready' | 'incomplete' | 'updated-engine' | 'cancelled';
    readonly project?: Project;
    /** The (generated or edited) title of a new project, when one was named. */
    readonly title?: string;
    readonly changed: readonly string[];
    readonly alreadyReady: readonly string[];
    readonly unresolved: readonly string[];
    /** Informational notes (overrides, parent changes, uncommitted setup). */
    readonly notes: readonly string[];
    readonly commit?: string;
    /** The ordinary Expert bootstrap task created by this run. */
    readonly firstTask?: { readonly title: string; readonly path: string };
    /** Outcome of the opt-in remote setup (separate from local setup). */
    readonly publication?: PublicationOutcome;
    /** Whether automatic synchronization is enabled. */
    readonly synchronization?: boolean;
};

/**
 * Raised when the user abandons the wizard (Ctrl+C) before the final confirmation: the in-memory draft is discarded
 * and nothing is applied to the destination.
 */
class WizardCancelled extends Error {}

/**
 * Raised when the user goes back (Esc) to the previous question.
 */
class WizardBack extends Error {}

/**
 * Raised after a successful engine update: this invocation stops before target setup.
 */
class EngineUpdated extends Error {}

/**
 * Unwraps a prompt result: Esc goes back, Ctrl+C abandons the wizard.
 */
function answered<T>(value: T | typeof CANCELLED): T {
    if (value === CANCELLED) throw wasInterrupted() ? new WizardCancelled('cancelled') : new WizardBack('back');
    return value;
}

/**
 * User-facing wizard steps, in order.
 */
type StepId = 'intent' | 'update' | 'destination' | 'installation' | 'harnesses' | 'browser' | 'traces' | 'wallet' | 'sync' | 'review';

/**
 * Titles of the user-facing steps.
 */
const STEP_TITLES: Readonly<Record<StepId, string>> = {
    intent: 'What are you working on?',
    update: 'Promptbook version',
    destination: 'Destination',
    installation: 'Installation',
    harnesses: 'Harnesses',
    browser: 'Project browser',
    traces: 'Traces',
    wallet: 'Wallet',
    sync: 'Automatic synchronization',
    review: 'Review, create and start',
};

/**
 * Truthful `Step X of Y`: counts only user-facing steps that currently apply (reused setup is not unfinished work).
 */
class StepTracker {
    private readonly applies = new Map<StepId, boolean>();

    public constructor(private readonly order: readonly StepId[]) {
        for (const id of order) this.applies.set(id, true);
    }

    /** Updates whether a step is part of the path (totals change honestly). */
    public set(id: StepId, applies: boolean): void {
        this.applies.set(id, applies);
    }

    /** Label of a step. */
    public label(id: StepId): string {
        const active = this.order.filter((step) => this.applies.get(step) || step === id);
        return `Step ${active.indexOf(id) + 1} of ${active.length} · ${STEP_TITLES[id]}`;
    }
}

/**
 * Initial project input: verbatim text with attachments at their positions.
 */
type IntentInput = { readonly segments: readonly ComposedSegment[]; readonly source: 'flags' | 'composer' | 'draft' | 'blank' };

/**
 * Reads explicitly supplied intent (`--intent`, `--intent-file`, `--attach`).
 */
async function intentFromFlags(context: CommandContext): Promise<IntentInput | undefined> {
    const text = option<string>(context, 'intent');
    const file = option<string>(context, 'intent-file');
    const attachments = option<string[]>(context, 'attach') ?? [];
    if (text === undefined && file === undefined && !attachments.length) return undefined;
    if (text !== undefined && file !== undefined) throw usageError('Use either --intent or --intent-file, not both.', 'init');
    const body = file === '-' ? await readStdin() : file !== undefined ? await readFile(resolve(context.cwd, file), 'utf8') : (text ?? '');
    const segments: ComposedSegment[] = body ? [{ type: 'text', text: body }] : [];
    for (const attachment of attachments) {
        const path = resolve(context.cwd, attachment);
        if (!(await pathExists(path))) throw usageError(`--attach ${attachment}: no such file.`, 'init');
        if (segments.length) segments.push({ type: 'text', text: '\n\n' });
        segments.push({ type: 'attachment', kind: isImagePath(path) ? 'image' : 'file', path, name: path.split(/[\\/]/).pop() ?? 'file' });
    }
    return { segments, source: 'flags' };
}

/**
 * The path itself or its nearest existing ancestor (probes run before a new destination is created).
 */
async function nearestExisting(path: string): Promise<string> {
    let current = path;
    while (!(await isDirectory(current))) {
        const parent = dirname(current);
        if (parent === current) return current;
        current = parent;
    }
    return current;
}

/**
 * Whether segments carry no content at all (deliberately blank input).
 */
function blankIntent(segments: readonly ComposedSegment[]): boolean {
    return segments.every((segment) => segment.type === 'text' && !segment.text.trim());
}

/**
 * The destination's saved configuration as this engine interprets it (a pending migration applied in memory only).
 */
async function savedConfiguration(root: string): Promise<Record<string, unknown>> {
    return interpretConfig(await readProjectConfigFile(projectAt(root))).interpreted;
}

/**
 * Whether a configuration already has a browser tool (the browser question is then not asked again).
 */
function hasBrowserTool(raw: Readonly<Record<string, unknown>>): boolean {
    return Array.isArray(raw.tools) && raw.tools.some((tool) => tool !== null && typeof tool === 'object' && String((tool as Record<string, unknown>).type).toUpperCase() === 'BROWSER');
}

/**
 * Whether a destination already records its purpose (initial specification or an earlier initialization).
 */
async function recordedPurpose(root: string): Promise<boolean> {
    if (await pathExists(join(root, INITIAL_SPECIFICATION))) return true;
    const raw = (await readProjectConfigFile(projectAt(root))).raw;
    return Boolean(raw.initialized);
}

/**
 * A sensible folder name for a new project in the shared projects folder: a few words of the intent, otherwise a
 * generic name (folder naming is never the project's brief).
 */
function projectFolderName(segments: readonly ComposedSegment[] | undefined): string {
    const text = (segments ?? []).flatMap((segment) => (segment.type === 'text' ? [segment.text] : [])).join(' ');
    const words = (kebabIdentifier(text.split(/\r?\n/).find((line) => line.trim()) ?? '') ?? '').split('-').filter(Boolean).slice(0, 4);
    // A name does not end in a filler word ("bird-newsletter-for-the" → "bird-newsletter").
    while (words.length > 1 && ['a', 'an', 'and', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with'].includes(words[words.length - 1]!)) words.pop();
    return words.join('-').slice(0, 40).replace(/-+$/, '') || 'my-project';
}

/**
 * The given folder name, or the first free numbered variant (`name-2`, …) when that child already holds content.
 */
async function freeProjectFolder(container: string, name: string): Promise<string> {
    for (let attempt = 1; ; attempt++) {
        const candidate = attempt === 1 ? name : `${name}-${attempt}`;
        const target = join(container, candidate);
        if (!(await pathExists(target)) || ((await isDirectory(target)) && (await isFreshDirectory(target)))) return candidate;
    }
}

/**
 * Why a folder name cannot be one child of the shared projects folder (undefined when it can).
 */
function projectFolderProblem(value: string): string | undefined {
    const name = value.trim();
    if (!name) return 'Enter a folder name.';
    if (name === '.' || name === '..' || /[\\/]/.test(name)) return 'Enter one folder name (no path separators); every project is its own child folder.';
    // eslint-disable-next-line no-control-regex
    if (/[<>:"|?*\u0000-\u001f]/.test(name) || /[. ]$/.test(name)) return 'Use letters, digits, spaces, dashes or dots (not at the end).';
    return undefined;
}

/**
 * The harness preselected when no installed and usable one is detected, so accepting the defaults never leads to an
 * empty selection (visible and editable, never a hidden fallback).
 */
const DEFAULT_HARNESS = 'openai-codex';

/**
 * A neutral editable title of a project whose brief is blank (no purpose is invented).
 */
const NEUTRAL_TITLE = 'My project';

/**
 * Harness variants that are installed **and ready** (verified login or configuration, usable now), inspected in
 * parallel without any model call. An executable alone, a signed-out or an unverifiable variant is not ready.
 */
async function readyHarnesses(projectRoot: string, env: NodeJS.ProcessEnv): Promise<string[]> {
    const ready = await Promise.all(
        HARNESS_PLUGINS.map(async (plugin) => {
            const tool: HarnessToolRecord = { type: 'HARNESS', variant: plugin.variant, name: plugin.id, isEnabled: true, authentication: 'NATIVE' };
            const inspection = await plugin.inspect({ projectRoot, env: instanceEnvironment(plugin, tool, undefined, env), tool }).catch(() => undefined);
            return inspection?.installed && inspection.usable && inspection.authenticated === true ? plugin.id : undefined;
        }),
    );
    return ready.filter((id): id is string => id !== undefined);
}

/**
 * Wizard/unattended initialization shared by `ptbk init`, the global dashboard's New project and the setup step of
 * `ptbk start` (one initializer; only the destination step's allowed locations differ).
 *
 * Every question builds an in-memory draft with Back navigation; the destination is neither created nor written before
 * the final confirmation (only global prerequisites such as a harness installation or native login, and the separate
 * preparatory harness checks and naming call, happen before it). Confirmation completes technical setup, preserves
 * the initial input in `specs/_initial.md`, saves one ordinary Expert task and commits setup; starting the agenda is
 * the caller's job (`ptbk init` starts it, `ptbk start` continues its own start).
 *
 * @private command
 */
export async function initializeProject(context: CommandContext, options: { projectRoot?: string; fromStart?: boolean; homeOnly?: boolean } = {}): Promise<InitResult> {
    const { terminal } = context;
    const interactive = terminal.interactive;
    const style = terminal.style;
    const marks = symbols(terminal.unicode);
    const commit = flag(context, 'commit') !== false;
    const changed: string[] = [];
    const alreadyReady: string[] = [];
    const unresolved: string[] = [];
    const answers = new Map<StepId, string>();
    const notes: string[] = [];
    const missingDecisions: string[] = [];
    const title = options.fromStart ? 'ptbk start · setup' : 'ptbk init';
    const steps = new StepTracker(['intent', 'update', 'destination', 'installation', 'harnesses', 'browser', 'traces', 'wallet', 'sync', 'review']);
    const stepOrder: readonly StepId[] = ['intent', 'update', 'destination', 'installation', 'harnesses', 'browser', 'traces', 'wallet', 'sync', 'review'];
    const frame = (id: StepId, note?: string, activity: BadgeActivity = 'working'): WizardFrame => ({
        title,
        step: steps.label(id),
        summary: stepOrder.slice(0, stepOrder.indexOf(id)).flatMap((step) => (answers.has(step) ? [answers.get(step)!] : [])),
        guide: { name: 'Expert', activity, note: note ?? 'your setup guide' },
    });
    const say = (text: string): void => {
        terminal.write(terminal.pretty ? `  ${text}\n` : `${text}\n`);
    };
    if (!terminal.pretty) terminal.write(`${title} (ptbk ${ENGINE_VERSION})\n`);

    const base = resolve(context.cwd, options.projectRoot ?? option<string>(context, 'path') ?? '.');
    const explicitDestination = !options.homeOnly && Boolean(options.projectRoot || option<string>(context, 'subfolder') || context.explicit.has('path'));
    const flaggedIntent = await intentFromFlags(context);
    const selfUpdate = option<string>(context, 'self-update');
    // Checked in the background while the user describes the project (bounded, best-effort).
    const updateCheck: Promise<UpdateCheck | undefined> =
        !options.fromStart && (interactive || selfUpdate === 'yes') && selfUpdate !== 'no' ? checkForEngineUpdate().catch(() => undefined) : Promise.resolve(undefined);

    const state: {
        intent?: IntentInput;
        purposeRecorded: boolean;
        root: string;
        nested?: { strategy: NestedStrategy; parentRoot: string; url?: string };
        installation?: 'local' | 'global' | 'existing';
        /** The chosen kind of destination (offered again as the default when going back). */
        destinationKind?: 'shared' | 'current' | 'subfolder';
        selected?: string[];
        inspections: Map<string, HarnessInspection>;
        browserProfile?: string;
        browserMode?: 'headless' | 'headful';
        traces?: { commit: boolean; ignoreVideos: boolean; recordVideo: boolean };
        /** Optional Wallet setup now (default No; the same protected operation as later Wallet setup). */
        wallet?: boolean;
        /** Automatic synchronization: the saved choice and, for a new opt-in, the explicit destination. */
        sync?: { enabled: boolean; choice?: PublicationChoice; reused: boolean };
        /** Whether the destination has no project configuration yet (a new initialization). */
        newProject: boolean;
        /** Latest real functional check per selected harness of a new project (passes are reused after Back). */
        checks: Map<string, FunctionalCheck>;
        /** The project title of a new project (generated, neutral or edited in the final review). */
        title?: string;
        /** The latest generated name and the brief/harness it was generated for (a changed brief names it again). */
        proposal?: { readonly key: string; readonly title: string; readonly folder: string };
        /** Whether the user edited the folder name in the final review (no longer replaced by the proposal). */
        folderChosen?: boolean;
        /** Whether the destination folder is a new child named by the wizard (editable in the final review). */
        folderEditable: boolean;
    } = { purposeRecorded: false, root: option<string>(context, 'subfolder') ? resolve(base, option<string>(context, 'subfolder')!) : base, inspections: new Map(), newProject: false, checks: new Map(), folderEditable: false };
    const shown = new Set<StepId>();

    const stepFunctions: Record<StepId, () => Promise<void>> = {
        // 1. The user's intent comes first: preserved verbatim, attachments included.
        intent: async () => {
            state.purposeRecorded = await recordedPurpose(state.root);
            if (state.purposeRecorded) {
                if (flaggedIntent && !blankIntent(flaggedIntent.segments)) {
                    throw usageError(`This project already records its purpose (${INITIAL_SPECIFICATION} or an earlier initialization); add new work with \`ptbk add\` instead of --intent.`, 'init');
                }
                steps.set('intent', false);
                return;
            }
            if (flaggedIntent) {
                state.intent = flaggedIntent;
                steps.set('intent', false);
                return;
            }
            const draft = await readSetupDraft(context.cwd);
            if (!interactive) {
                state.intent = draft ? { segments: draft.segments, source: 'draft' } : { segments: [], source: 'blank' };
                if (draft) notes.push('Reused the initial input saved before the engine update.');
                steps.set('intent', false);
                return;
            }
            shown.add('intent');
            const value = answered(
                await composeRich(terminal, {
                    frame: frame('intent', draft && !state.intent ? 'your saved draft is restored — edit or submit it' : 'tell me about it; I will set things up and start the first task'),
                    question: 'What are you working on?',
                    hint: 'Anything goes: a phrase, a full brief, long pasted text, images or other files. It is saved verbatim in specs/_initial.md and Expert turns it into the project. Leave it empty for a small skeleton with a readiness review.',
                    placeholder: 'e.g. A weekly newsletter about local birds, published on our website…',
                    initial: state.intent?.segments ?? draft?.segments,
                    attachments: true,
                }),
            );
            state.intent = { segments: value.segments, source: draft && !state.intent ? 'draft' : 'composer' };
            const attachments = value.segments.filter((segment) => segment.type === 'attachment').length;
            answers.set('intent', blankIntent(value.segments) ? 'Intent: blank (a skeleton with a readiness review)' : `Intent: ${value.text.length} characters${attachments ? `, ${attachments} attachment${attachments === 1 ? '' : 's'}` : ''} → ${INITIAL_SPECIFICATION}`);
        },
        // 2. Optional engine self-update, never displacing or losing the intent.
        update: async () => {
            const check = await updateCheck;
            if (!check?.newer || !check.latest) {
                if (check?.unknownReason && interactive) notes.push(`Update check skipped: ${check.unknownReason}`);
                else if (check?.incompatible && interactive) notes.push(`Update not offered: ${check.incompatible}.`);
                steps.set('update', false);
                return;
            }
            let update = selfUpdate === 'yes';
            if (selfUpdate === undefined && interactive) {
                shown.add('update');
                update = answered(
                    await confirm(terminal, {
                        frame: frame('update', 'a newer Promptbook is available'),
                        question: `ptbk ${check.latest} is available (running ${check.current}, ${check.installation.scope} installation at ${check.installation.root}). Update this installation first?`,
                        defaultYes: true,
                        yesLabel: `Yes, update to ${check.latest}`,
                        noLabel: `No, continue with ${check.current}`,
                    }),
                );
            }
            if (!update) return;
            for (;;) {
                try {
                    const message = await updateEngine(check, (line) => terminal.pretty && terminal.write(style.muted(`    ${line}\n`)));
                    if (state.intent && !blankIntent(state.intent.segments)) await saveSetupDraft(context.cwd, state.intent.segments);
                    say(`${style.success(marks.ok)} ${message}`);
                    say(`Run the same \`ptbk init\` again to continue with the new version${state.intent && !blankIntent(state.intent.segments) ? '; your initial input is kept and offered again' : ''}.`);
                    throw new EngineUpdated(message);
                } catch (error) {
                    if (error instanceof EngineUpdated || !interactive) throw error;
                    const choice = answered(
                        await selectOne(terminal, {
                            frame: frame('update', 'the update did not work', 'blocked'),
                            question: `The update failed: ${errorMessage(error)}`,
                            choices: [
                                { value: 'retry', label: 'Retry the update' },
                                { value: 'continue', label: `Continue with ${check.current}` },
                            ],
                            defaultValue: 'continue',
                        }),
                    );
                    if (choice === 'continue') return;
                }
            }
        },
        // 3. Destination (the shared home-based projects folder first) and the versioning boundary of a new child.
        destination: async () => {
            for (;;) {
                if ((!explicitDestination && interactive) || options.homeOnly) {
                    const user = intendedUser(context.env);
                    const sharedRoot = sharedProjectsRoot(context.env);
                    if (options.homeOnly && user.problem) throw new PtbkError('The shared projects folder cannot be determined.', { kind: 'setup', reason: user.problem, effect: 'Nothing was created.', next: ['Run `ptbk init` in the intended folder instead.'] });
                    if (user.problem) notes.push(`${user.problem} The shared projects folder is not offered; choose the destination explicitly.`);
                    const initializedHere = await pathExists(projectAt(base).configPath);
                    // The global dashboard's New project keeps this step visible but limited to the shared projects home.
                    const destination = !interactive
                        ? ('shared' as const)
                        : answered(
                              await selectOne(terminal, {
                                  frame: frame('destination', options.homeOnly ? 'new projects from the global dashboard live in your projects home' : 'start a new agenda anywhere, or add Promptbook to existing work'),
                                  question: options.homeOnly ? 'Where should the project live? (for another location, run `ptbk init` there)' : 'Where should the project live?',
                                  choices: [
                                      ...(user.problem ? [] : [{ value: 'shared' as const, label: 'New project in the shared Promptbook projects folder', description: `${sharedRoot}${sep}<name> — a new agenda without choosing a location` }]),
                                      ...(options.homeOnly
                                          ? []
                                          : [
                                                { value: 'current' as const, label: 'Current directory', description: `${base} — add Promptbook to the work here` },
                                                { value: 'subfolder' as const, label: 'New subfolder of the current directory', description: 'create a new project folder here' },
                                            ]),
                                  ],
                                  defaultValue: options.homeOnly ? 'shared' : (state.destinationKind ?? (initializedHere || user.problem ? 'current' : 'shared')),
                                  escapeLabel: 'Esc back',
                              }),
                          );
                    if (interactive) shown.add('destination');
                    state.destinationKind = destination;
                    if (destination === 'shared') {
                        // A provisional free child: the folder name is proposed from the brief's meaning after the harness
                        // checks and can be edited in the final review (nothing is created before confirmation).
                        state.folderEditable = true;
                        if (state.root === base || dirname(state.root) !== sharedRoot) {
                            state.root = join(sharedRoot, await freeProjectFolder(sharedRoot, state.proposal?.folder ?? projectFolderName(state.intent?.segments)));
                            state.folderChosen = false;
                        }
                    } else if (destination === 'subfolder') {
                        const name = answered(await inputLine(terminal, { frame: frame('destination'), question: 'Name (or relative path) of the new folder:', initial: state.root !== base && !relative(base, state.root).startsWith('..') ? relative(base, state.root) : undefined, validate: (value) => (!value ? 'Enter a folder name.' : undefined) }));
                        state.root = resolve(base, name);
                        state.folderEditable = false;
                    } else {
                        state.root = base;
                        state.folderEditable = false;
                    }
                } else if (interactive && !options.fromStart) {
                    // An explicit destination (e.g. the Windows installer's `--path` handoff) is reused rather than chosen
                    // again, but still shown for confirmation before anything is written.
                    shown.add('destination');
                    const accepted = answered(
                        await confirm(terminal, {
                            frame: frame('destination'),
                            question: `Set up the project in ${state.root}?`,
                            defaultYes: true,
                            yesLabel: 'Yes, set it up here',
                            noLabel: 'No, cancel (nothing is changed)',
                        }),
                    );
                    if (!accepted) throw new WizardCancelled('destination declined');
                } else steps.set('destination', false);
                state.nested = undefined;
                const newFolder = state.root !== base || !(await isDirectory(state.root));
                const ancestor = (await isDirectory(state.root)) ? state.root : dirname(state.root);
                const enclosing = await inspectGit((await isDirectory(ancestor)) ? ancestor : base);
                if (newFolder && enclosing.state === 'repository' && resolve(enclosing.root) !== state.root && (!(await isDirectory(state.root)) || (await isFreshDirectory(state.root)))) {
                    let strategy = option<NestedStrategy>(context, 'nested');
                    if (!strategy && interactive) {
                        shown.add('destination');
                        const choice = answered(
                            await selectOne(terminal, {
                                frame: frame('destination', 'this folder is inside another Git repository'),
                                question: `${state.root} is inside the Git repository ${enclosing.root}. How should the new project be versioned?`,
                                choices: [
                                    { value: 'back', label: 'Go back', description: 'choose another destination; nothing changes' },
                                    { value: 'ignored', label: 'Independent, ignored project', description: 'parent .gitignore ignores the folder; the child gets its own repository' },
                                    { value: 'submodule', label: 'Git submodule', description: 'needs a remote URL for later checkout' },
                                ],
                                defaultValue: 'back',
                            }),
                        );
                        if (choice === 'back') {
                            if (explicitDestination) throw new WizardCancelled('back');
                            continue;
                        }
                        strategy = choice as NestedStrategy;
                    }
                    if (!strategy) {
                        missingDecisions.push(`--nested ignored|submodule (the destination is a new folder inside the Git repository ${enclosing.root})`);
                        break;
                    }
                    let url = option<string>(context, 'submodule-url');
                    if (strategy === 'submodule' && !url && interactive) {
                        url = answered(await inputLine(terminal, { frame: frame('destination'), question: 'Remote URL of the child repository (used by `git submodule` for later checkout):' }));
                    }
                    if (strategy === 'submodule' && !url) missingDecisions.push('--submodule-url <url> (required for --nested submodule)');
                    state.nested = { strategy, parentRoot: enclosing.root, url };
                }
                break;
            }
            answers.set('destination', `Destination: ${state.folderEditable ? `${dirname(state.root)}${sep}<name>` : state.root}${state.nested ? ` (${state.nested.strategy} child)` : ''}`);
            state.newProject = !(await pathExists(projectAt(state.root).configPath));
            const compatibility = planConfigurationMigration((await readProjectConfigFile(projectAt(state.root))).raw);
            if (compatibility.kind === 'older-engine') await requireEngineUpdate(context, compatibility.saved, projectAt(state.root));
            await predictPath();
            // A changed destination may already record its purpose.
            if (!state.purposeRecorded && (await recordedPurpose(state.root))) {
                state.purposeRecorded = true;
                state.intent = undefined;
                notes.push(`${state.root} already records its purpose; its existing initial specification is kept.`);
            }
        },
        // 4. Destination-specific installation.
        installation: async () => {
            const local = await inspectLocalInstallation(state.root);
            const configBefore = await loadSettings(projectAt(state.root), { env: context.env }).catch(() => undefined);
            const remembered = ((configBefore?.raw.initialized ?? {}) as { installation?: 'local' | 'global' }).installation;
            const choice = option<'local' | 'global'>(context, 'installation') ?? (remembered === 'global' ? 'global' : undefined);
            if (local.usable) {
                state.installation = 'existing';
                steps.set('installation', false);
                return;
            }
            if (local.declaredIn) {
                state.installation = 'local';
                steps.set('installation', false);
                return;
            }
            if (choice) {
                state.installation = choice;
                steps.set('installation', false);
                return;
            }
            if (!interactive) {
                missingDecisions.push('--installation local|global');
                return;
            }
            shown.add('installation');
            state.installation = answered(
                await selectOne(terminal, {
                    frame: frame('installation'),
                    question: 'How should this project run Promptbook?',
                    choices: [
                        { value: 'global' as const, label: 'Use the global CLI', description: 'no project dependency (recommended)' },
                        { value: 'local' as const, label: "Install Promptbook locally in this project's dependencies", description: `ptbk@${ENGINE_VERSION}` },
                    ],
                    defaultValue: state.installation === 'local' ? 'local' : 'global',
                }),
            );
            answers.set('installation', `Installation: ${state.installation}`);
        },
        // 5. Harnesses: selection, global installation, native login and updates.
        harnesses: async () => {
            const harnessFlags = option<string[]>(context, 'harness');
            for (const id of harnessFlags ?? []) if (!harnessPlugin(id)) throw usageError(`Unknown harness "${id}". Supported: ${HARNESS_PLUGINS.map((plugin) => plugin.id).join(', ')}.`, 'init');
            const configBefore = (await pathExists(projectAt(state.root).configPath)) ? await loadSettings(projectAt(state.root), { env: context.env }) : undefined;
            const configured = configBefore ? enabledHarnesses(configBefore) : [];
            state.inspections = new Map();
            for (;;) {
                let selected: string[];
                if (harnessFlags) selected = [...new Set(harnessFlags)];
                else if (flag(context, 'no-harness')) selected = [];
                else if (configured.length) selected = configured;
                else if (!interactive) {
                    missingDecisions.push('--harness <id> (repeatable) or --no-harness');
                    return;
                } else {
                    shown.add('harnesses');
                    // A fresh selection starts with every installed and usable harness, or OpenAI Codex when there is none
                    // (visible and editable); earlier choices win.
                    if (state.selected === undefined) {
                        const ready = await readyHarnesses(await nearestExisting(state.root), context.env);
                        state.selected = ready.length ? ready : [DEFAULT_HARNESS];
                    }
                    const failed = [...state.checks].filter(([, check]) => !check.ok);
                    selected = answered(
                        await selectMany(terminal, {
                            frame: frame('harnesses', failed.length ? 'no selected harness works yet — fix one or choose another' : 'pick the coding agents that will do the work', failed.length ? 'blocked' : 'working'),
                            question: `Which harnesses should run this project? (installed globally, shared with other projects; usable ones are preselected, otherwise OpenAI Codex${state.newProject ? '; each is tested with a real request' : ''})`,
                            choices: HARNESS_PLUGINS.map((plugin) => {
                                const check = state.checks.get(plugin.id);
                                // A failed real check stays visible with its concrete cause.
                                const description = check ? `${check.ok ? marks.ok : marks.fail} ${check.summary}` : plugin.featured ? undefined : plugin.npmPackage;
                                return { value: plugin.id, label: plugin.displayName, featured: plugin.featured || state.selected!.includes(plugin.id) || Boolean(check), description };
                            }),
                            initial: state.selected,
                            ...(state.newProject ? { minimum: 1 } : {}),
                            noneLabel: state.newProject ? 'None selected (a new project needs at least one working harness)' : 'None selected (setup stays incomplete)',
                            emptyWarning: state.newProject
                                ? 'No harness is selected: a new project needs at least one harness that passes its real check. Choose one with Space.'
                                : 'No harness is selected: no model work can run, and Router cannot receive its concrete initial MODEL. Nothing is selected for you; choose one with Space, or continue and add one later (ptbk tool add HARNESS …).',
                        }),
                    );
                }
                try {
                    await setUpHarnesses(selected);
                    state.selected = selected;
                    // A new project needs at least one selected harness that answers a real request; additional failures
                    // stay visible but do not block. Without a working one, the user stays in harness configuration.
                    if (state.newProject && selected.length && !(await checkHarnesses(selected))) {
                        if (interactive && !harnessFlags) {
                            state.selected = selected;
                            continue;
                        }
                        throw new PtbkError('No selected harness passed its real functional check.', {
                            kind: 'setup',
                            project: state.root,
                            reason: selected.map((id) => `${harnessPlugin(id)!.displayName}: ${state.checks.get(id)?.summary ?? 'not checked'}`).join('\n'),
                            effect: 'Nothing was created or changed in the destination.',
                            next: ['Fix the reported cause (sign in, install or repair the harness) or select another harness, then run `ptbk init` again.'],
                        });
                    }
                    const checkMark = (id: string): string => {
                        const check = state.checks.get(id);
                        return check ? ` ${check.ok ? marks.ok : `${marks.fail} (${check.summary})`}` : '';
                    };
                    answers.set('harnesses', `Harnesses: ${selected.length ? selected.map((id) => `${harnessPlugin(id)!.displayName}${checkMark(id)}`).join(', ') : 'none'}`);
                    if (!shown.has('harnesses') && selected.every((id) => state.inspections.get(id)?.usable)) steps.set('harnesses', false);
                    return;
                } catch (error) {
                    if (error instanceof WizardBack && !harnessFlags && !configured.length && interactive) continue;
                    throw error;
                }
            }
        },
        // 6. Browser (independent of harness logins).
        browser: async () => {
            const saved = await savedConfiguration(state.root);
            state.browserProfile = option<string>(context, 'browser-profile') ?? state.browserProfile;
            state.browserMode = option<'headless' | 'headful'>(context, 'browser-mode') ?? state.browserMode;
            if (hasBrowserTool(saved) || !interactive || option<string>(context, 'browser-profile')) {
                steps.set('browser', false);
                return;
            }
            shown.add('browser');
            const choice = answered(
                await selectOne(terminal, {
                    frame: frame('browser', 'agents share one browser for websites'),
                    question: 'Which browser profile should agents use for websites in this project?',
                    choices: [
                        { value: 'global', label: 'Dedicated Promptbook profile', description: 'a separate Promptbook-only profile, reused by your other projects (one project at a time); not your Chrome profile' },
                        { value: 'isolated', label: 'Isolated project profile', description: 'only this project, stored in .ptbk/ (Git-ignored)' },
                        { value: 'user', label: 'Your Chrome profile', description: 'reuses your logged-in sessions; agents act as you' },
                        { value: 'custom', label: 'Custom profile path', description: 'another existing browser profile directory' },
                    ],
                    defaultValue: 'global',
                }),
            );
            if (choice === 'custom') {
                state.browserProfile = answered(
                    await inputLine(terminal, {
                        frame: frame('browser'),
                        question: 'Path of the existing browser profile directory:',
                        validate: (value) => (!value.trim() ? 'Enter a path.' : ['global', 'isolated', 'user'].includes(value.trim()) ? 'Choose that option instead of typing its name.' : undefined),
                    }),
                ).trim();
            } else if (choice === 'user') {
                const ok = answered(await confirm(terminal, { frame: frame('browser'), question: `Agents will act with every session in ${userChromeProfile()} and their actions affect that profile; Chrome must be closed while they use it. Use it?`, defaultYes: false }));
                state.browserProfile = ok ? 'user' : 'global';
            } else state.browserProfile = choice;
            state.browserMode = answered(
                await selectOne(terminal, {
                    frame: frame('browser'),
                    question: 'Browser visibility:',
                    choices: [
                        { value: 'headless' as const, label: 'Headless', description: 'no window (servers, background work)' },
                        { value: 'headful' as const, label: 'Visible window', description: 'lets you watch and log in on desktops' },
                    ],
                    defaultValue: state.browserMode ?? 'headless',
                }),
            );
            const profile = profileFromSpelling(state.browserProfile ?? 'global');
            answers.set('browser', `Browser: ${describeProfileSource(profile.source, profile.path)}, ${state.browserMode}`);
        },
        // 7. Trace recording and Git inclusion (three explicit project choices).
        traces: async () => {
            const raw = await savedConfiguration(state.root);
            const saved = (key: string): boolean | undefined => (typeof getPath(raw, key) === 'boolean' ? (getPath(raw, key) as boolean) : undefined);
            const flagged = { commit: flag(context, 'commit-traces'), ignoreVideos: flag(context, 'ignore-trace-videos'), recordVideo: flag(context, 'record-video') };
            const current = {
                commit: saved('traces.isCommitted') ?? flagged.commit ?? state.traces?.commit ?? false,
                ignoreVideos: saved('traces.isVideoIgnored') ?? flagged.ignoreVideos ?? state.traces?.ignoreVideos ?? true,
                recordVideo: saved('traces.isVideoRecordingEnabled') ?? flagged.recordVideo ?? state.traces?.recordVideo ?? true,
            };
            const complete = saved('traces.isCommitted') !== undefined && saved('traces.isVideoIgnored') !== undefined && saved('traces.isVideoRecordingEnabled') !== undefined;
            const decided = Object.values(flagged).every((value) => value !== undefined);
            if (complete || decided || !interactive) {
                state.traces = current;
                steps.set('traces', false);
                return;
            }
            shown.add('traces');
            state.traces = answered(
                await toggleList(terminal, {
                    frame: frame('traces', 'every task keeps its own audit trail'),
                    question: 'Traces: how should task evidence be kept?',
                    intro: 'Each task records its harness output, events and (when enabled) browser video in traces/<task-file-basename>/, linked to its commits by the Task-Name trailer. Traces can contain project data and page content; sign-in steps are not recorded.',
                    toggles: [
                        { key: 'commit', label: 'Commit traces to Git', description: 'include each task’s traces in its result commit (shared with everyone who can read the repository); otherwise traces stay local and the whole traces/ folder is ignored' },
                        { key: 'ignoreVideos', label: 'Ignore trace videos in Git', description: 'keep browser videos local even when traces are committed (videos are large and may show sensitive pages)' },
                        { key: 'recordVideo', label: 'Record browser videos', description: 'record what agents do in the project browser, per task and attempt (independent of Git; text traces are always kept)' },
                    ],
                    initial: current,
                    effect: (values) => [
                        `Effective: ${values.commit ? `task logs are committed${values.ignoreVideos ? '; videos stay local (ignored)' : '; videos are committed too'}` : 'traces stay local — the whole traces/ folder is ignored, videos included'}.`,
                        values.recordVideo ? 'Browser activity is recorded for tasks that use the project browser.' : 'No browser video is recorded (text traces continue).',
                        ...(!values.commit && !values.ignoreVideos ? ['Note: "Ignore trace videos" has no effect while traces are not committed; the choice is kept for later.'] : []),
                    ],
                }),
            );
            answers.set('traces', `Traces: ${state.traces.commit ? 'committed' : 'local only'}, videos ${state.traces.recordVideo ? `recorded${state.traces.commit && !state.traces.ignoreVideos ? ' and committed' : ' locally'}` : 'off'}`);
        },
        // 8. Optional Wallet setup, default No; an existing vault is never recreated.
        wallet: async () => {
            if (!interactive || (await pathExists(join(projectAt(state.root).runtime.root, 'encryption', 'project.json')))) {
                state.wallet = false;
                steps.set('wallet', false);
                return;
            }
            shown.add('wallet');
            state.wallet = answered(
                await confirm(terminal, {
                    frame: frame('wallet', 'website logins your agents may need'),
                    question: 'Set up Wallet now? It keeps website logins encrypted in this project and signs agents in without ever showing them a password. You can also set it up later on the dashboard.',
                    defaultYes: false,
                    yesLabel: 'Yes, set it up now (shows 12 words for recovery once)',
                    noLabel: 'No, later',
                }),
            );
            answers.set('wallet', `Wallet: ${state.wallet ? 'set up at the end' : 'later'}`);
        },
        // 9. Automatic synchronization: one opt-in decision, default off; "no" asks nothing further.
        sync: async () => {
            const saved = await savedConfiguration(state.root);
            const explicit = flag(context, 'auto-sync') ?? (flag(context, 'auto-pull') || flag(context, 'auto-push') ? true : undefined);
            const savedChoice = typeof saved.isAutoSync === 'boolean' ? saved.isAutoSync : undefined;
            const repositoryGit = await inspectGit(await nearestExisting(state.root));
            const ownRepository = repositoryGit.state === 'repository' && canonicalPath(repositoryGit.root) === canonicalPath(state.root);
            const origin = ownRepository ? await existingOrigin(repositoryGit.root) : undefined;
            if (explicit === undefined && savedChoice !== undefined) {
                state.sync = { enabled: savedChoice, reused: true };
                steps.set('sync', false);
                return;
            }
            let enabled = explicit;
            if (enabled === undefined) {
                if (!interactive) {
                    state.sync = { enabled: false, reused: false };
                    steps.set('sync', false);
                    return;
                }
                shown.add('sync');
                enabled = answered(
                    await confirm(terminal, {
                        frame: frame('sync', 'optional: keep a Git remote up to date'),
                        question: 'Synchronize this project automatically with a Git remote? (pull every minute and before work, then push completed work)',
                        defaultYes: false,
                        yesLabel: 'Yes, set up automatic synchronization',
                        noLabel: 'No, keep the project local (default)',
                    }),
                );
            }
            if (!enabled) {
                state.sync = { enabled: false, reused: false };
                answers.set('sync', 'Synchronization: off');
                return;
            }
            if (!commit) throw usageError('Automatic synchronization publishes commits, so it conflicts with --no-commit.', 'init');
            const provider = option<'github' | 'origin' | 'existing'>(context, 'sync-provider');
            const repositoryFlag = option<string>(context, 'github-repository');
            const originUrl = option<string>(context, 'origin-url');
            const visibility = option<'private' | 'public'>(context, 'github-visibility') ?? 'private';
            const github = (value: string): PublicationChoice => {
                const [owner, name] = value.includes('/') ? value.split('/', 2) : [undefined, value];
                return { kind: 'github', owner: owner || undefined, name: name!, visibility };
            };
            let choice: PublicationChoice | undefined;
            if (originUrl) choice = { kind: 'origin', url: originUrl };
            else if (repositoryFlag || provider === 'github') choice = repositoryFlag ? github(repositoryFlag) : undefined;
            else if (provider === 'existing' || provider === 'origin' || (savedChoice === true && origin)) choice = origin ? { kind: 'existing' } : undefined;
            if (!choice && interactive) {
                shown.add('sync');
                if (origin) {
                    // An existing remote is reused explicitly, never silently replaced or duplicated on GitHub.
                    const reuse = answered(await confirm(terminal, { frame: frame('sync'), question: `This repository already has origin ${redactUrl(origin)}. Synchronize with it?`, defaultYes: true, yesLabel: 'Yes, use the existing origin', noLabel: 'No, keep synchronization off' }));
                    if (!reuse) {
                        state.sync = { enabled: false, reused: false };
                        answers.set('sync', 'Synchronization: off');
                        return;
                    }
                    choice = { kind: 'existing' };
                } else {
                    const kind = answered(
                        await selectOne(terminal, {
                            frame: frame('sync', 'where should the project be published?'),
                            question: 'Where should the project be synchronized?',
                            choices: [
                                { value: 'github' as const, label: 'GitHub', description: 'create a new repository (private by default) with your GitHub CLI login and publish this project' },
                                { value: 'origin' as const, label: 'Another Git origin', description: 'enter a remote URL (any Git host or server)' },
                            ],
                            defaultValue: 'github',
                        }),
                    );
                    if (kind === 'origin') {
                        const url = answered(await inputLine(terminal, { frame: frame('sync'), question: 'Remote URL of the Git origin:', validate: (value) => (!value.trim() ? 'Enter a Git remote URL.' : undefined) })).trim();
                        choice = { kind: 'origin', url };
                    } else {
                        const login = await githubLogin(context.env);
                        if (login.problem) say(style.warning(`${marks.warn} ${login.problem} Publication is attempted after the local setup and can be retried later.`));
                        const name = slugify(basename(state.root)) || 'project';
                        const repository = answered(
                            await inputLine(terminal, {
                                frame: frame('sync'),
                                question: 'New GitHub repository (owner/name):',
                                initial: `${login.login ?? ''}${login.login ? '/' : ''}${name}`,
                                validate: (value) => (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value.trim()) || (/^[A-Za-z0-9_.-]+$/.test(value.trim()) && login.login) ? undefined : 'Enter owner/name, e.g. my-company/newsletter.'),
                            }),
                        ).trim();
                        const chosenVisibility = answered(
                            await selectOne(terminal, {
                                frame: frame('sync'),
                                question: 'Visibility of the new repository:',
                                choices: [
                                    { value: 'private' as const, label: 'Private (recommended)', description: 'only people you invite can see it' },
                                    { value: 'public' as const, label: 'Public', description: 'anyone can see the code and its whole history' },
                                ],
                                defaultValue: 'private' as const,
                            }),
                        );
                        const target = github(repository) as Extract<PublicationChoice, { kind: 'github' }>;
                        choice = { ...target, visibility: chosenVisibility };
                        const shownName = `${target.owner ?? login.login ?? '<you>'}/${target.name}`;
                        const ok = answered(await confirm(terminal, { frame: frame('sync'), question: `Create github.com/${shownName} (${chosenVisibility}) and publish this project after the local setup is committed?`, defaultYes: true }));
                        if (!ok) throw new WizardBack('back');
                    }
                }
            }
            if (!choice) {
                missingDecisions.push(origin ? '--sync-provider existing (reuse the existing origin)' : '--github-repository <owner>/<name> or --origin-url <url> (automatic synchronization was enabled)');
                return;
            }
            state.sync = { enabled: true, choice, reused: false };
            answers.set('sync', `Synchronization: ${choice.kind === 'existing' ? `existing origin ${redactUrl(origin ?? '')}` : choice.kind === 'origin' ? `origin ${redactUrl(choice.url)}` : `GitHub ${choice.owner ? `${choice.owner}/` : ''}${choice.name} (${choice.visibility})`}`);
        },
        // 10. Naming (a separate preparatory call), then the unmistakable last step: nothing in the destination is
        // created or changed before this confirmation.
        review: async () => {
            // Unattended init with missing decisions stops before anything is named or applied.
            if (missingDecisions.length) return;
            await nameProject();
            if (!interactive) return;
            shown.add('review');
            const start = flag(context, 'start') !== false;
            for (;;) {
                const summary = [
                    ...(state.title !== undefined ? [`Title: ${state.title}`] : []),
                    `Destination: ${state.root}${state.folderEditable ? ' (new folder)' : ''}${state.nested ? ` (${state.nested.strategy} child)` : ''}`,
                    ...stepOrder.filter((id) => id !== 'destination' && answers.has(id)).map((id) => answers.get(id)!),
                ];
                const choice = answered(
                    await selectOne(terminal, {
                        frame: { ...frame('review', 'last step: nothing is created until you confirm', 'waiting-user'), summary },
                        question: state.newProject ? `Create ${state.title ?? 'the project'}${start ? ' and start its agenda' : ''}?` : `Apply this setup${start ? ' and start the agenda' : ''}?`,
                        choices: [
                            { value: 'create' as const, label: state.newProject ? (start ? 'Create and start project' : 'Create project (--no-start)') : start ? 'Apply setup and start' : 'Apply setup (--no-start)' },
                            ...(state.title !== undefined ? [{ value: 'title' as const, label: 'Edit the title', description: state.title }] : []),
                            ...(state.folderEditable ? [{ value: 'folder' as const, label: 'Edit the folder name', description: state.root }] : []),
                        ],
                        defaultValue: 'create' as const,
                        escapeLabel: 'Esc back',
                    }),
                );
                if (choice === 'create') return;
                // Esc in an edit returns to this review, not to the previous step.
                const edited = await inputLine(terminal, {
                    frame: frame('review', choice === 'title' ? 'the project title (shown in its README)' : `one new folder in ${dirname(state.root)}`),
                    question: choice === 'title' ? 'Project title:' : `Folder name (in ${dirname(state.root)}):`,
                    initial: choice === 'title' ? state.title : basename(state.root),
                    validate: (value) => (choice === 'title' ? (value.trim() ? undefined : 'Enter a title.') : projectFolderProblem(value)),
                });
                if (edited === CANCELLED) {
                    if (wasInterrupted()) throw new WizardCancelled('cancelled');
                    continue;
                }
                if (choice === 'title') state.title = edited.replace(/\s+/g, ' ').trim();
                else {
                    const target = join(dirname(state.root), edited.trim());
                    if ((await pathExists(target)) && !((await isDirectory(target)) && (await isFreshDirectory(target)))) {
                        say(style.warning(`${target} already exists and is not empty; choose another name.`));
                        continue;
                    }
                    state.root = target;
                    state.folderChosen = true;
                }
            }
        },
    };

    /**
     * The preparatory call context of a selected harness: its native instance in the environment the background engine
     * started by this init receives (the restored service environment is verified separately during setup), with the
     * plugin's coded default model.
     */
    const preparatoryCall = async (id: string): Promise<PreparatoryCall> => {
        const plugin = harnessPlugin(id)!;
        const nativeTool: HarnessToolRecord = { type: 'HARNESS', variant: plugin.variant, name: plugin.id, isEnabled: true, authentication: 'NATIVE' };
        const env = instanceEnvironment(plugin, nativeTool, undefined, context.env);
        const catalog = plugin.modelCatalog === 'complete' && plugin.listModels ? await plugin.listModels({ projectRoot: await nearestExisting(state.root), env, tool: nativeTool }).catch(() => []) : [];
        const row = pluginDefaultRow(plugin, catalog);
        return { plugin, inspection: state.inspections.get(id)!, env, model: row.model, thinkingLevel: row.thinking };
    };

    /**
     * Names a new project after its harness checks: one working selected harness proposes a title and a safe folder name
     * from the brief's meaning (a distinct preparatory call, not a project task). A blank brief, or no working harness,
     * gets an honest neutral editable name instead. A failed naming call is an unexpected error: nothing is created.
     */
    const nameProject = async (): Promise<void> => {
        if (!state.newProject) return;
        const brief = (state.intent?.segments ?? []).map((segment) => (segment.type === 'text' ? segment.text : `[${segment.kind}: ${segment.name}]`)).join('');
        const namer = (state.selected ?? []).find((id) => state.checks.get(id)?.ok);
        const key = `${namer ?? ''}\u0000${brief}`;
        if (state.proposal?.key !== key) {
            let proposal: { title: string; folder: string };
            // An existing or explicitly named folder keeps its own name as the neutral title.
            if (!brief.trim() || !namer) proposal = { title: state.folderEditable ? NEUTRAL_TITLE : basename(state.root), folder: brief.trim() ? projectFolderName(state.intent?.segments) : 'my-project' };
            else {
                const plugin = harnessPlugin(namer)!;
                say(style.muted(`Naming the project with ${plugin.displayName}${marks.ellipsis}`));
                try {
                    proposal = await proposeProjectName(await preparatoryCall(namer), brief);
                } catch (error) {
                    throw new PtbkError('The project could not be named.', {
                        kind: 'internal',
                        phase: 'project naming',
                        harness: namer,
                        reason: errorMessage(error),
                        effect: 'Nothing was created and nothing was started.',
                        next: ['Run `ptbk init` again.'],
                    });
                }
                say(`${style.success(marks.ok)} Proposed: ${proposal.title} (${proposal.folder})`);
            }
            state.proposal = { key, ...proposal };
            state.title = proposal.title;
            state.folderChosen = false;
        }
        // Only a new child folder named by the wizard is renamed; an explicitly selected directory never is.
        if (state.folderEditable && !state.folderChosen) state.root = join(dirname(state.root), await freeProjectFolder(dirname(state.root), state.proposal.folder));
    };

    /**
     * Predicts which later steps apply once the destination is known, so `Step X of Y` settles early; each step still
     * corrects its own applicability (a step that turns out to need input is always counted).
     */
    const predictPath = async (): Promise<void> => {
        if (!interactive) return;
        const destination = projectAt(state.root);
        const raw = await savedConfiguration(state.root);
        const local = await inspectLocalInstallation(state.root);
        const saved = await loadSettings(destination, { env: context.env }).catch(() => undefined);
        const remembered = ((raw.initialized ?? {}) as { installation?: string }).installation === 'global';
        steps.set('installation', !(local.usable || local.declaredIn || option<string>(context, 'installation') || remembered));
        steps.set('harnesses', !(option<string[]>(context, 'harness') || flag(context, 'no-harness') || (saved && enabledHarnesses(saved).length)));
        steps.set('browser', !(hasBrowserTool(raw) || option<string>(context, 'browser-profile')));
        const tracesSaved = ['traces.isCommitted', 'traces.isVideoIgnored', 'traces.isVideoRecordingEnabled'].every((key) => typeof getPath(raw, key) === 'boolean');
        const tracesFlagged = flag(context, 'commit-traces') !== undefined && flag(context, 'ignore-trace-videos') !== undefined && flag(context, 'record-video') !== undefined;
        steps.set('traces', !(tracesSaved || tracesFlagged));
        steps.set('wallet', !(await pathExists(join(destination.runtime.root, 'encryption', 'project.json'))));
        steps.set('sync', !(typeof raw.isAutoSync === 'boolean' || flag(context, 'auto-sync') !== undefined || flag(context, 'auto-pull') || flag(context, 'auto-push')));
    };

    /**
     * The real functional check of every selected harness of a new project, with visible progress and results. A
     * harness that already passed is not called again; a failure is retried. True when at least one works.
     */
    const checkHarnesses = async (selected: readonly string[]): Promise<boolean> => {
        for (const id of selected) {
            if (state.checks.get(id)?.ok) continue;
            const plugin = harnessPlugin(id)!;
            const inspection = state.inspections.get(id);
            let check: FunctionalCheck;
            if (!inspection?.installed || !inspection.usable) check = { ok: false, summary: inspection?.summary ?? 'Not inspected.', durationMs: 0 };
            else {
                say(style.muted(`Testing ${plugin.displayName} with a real request${marks.ellipsis}`));
                check = await functionalCheck(await preparatoryCall(id));
            }
            state.checks.set(id, check);
            say(`${check.ok ? style.success(marks.ok) : style.error(marks.fail)} ${plugin.displayName}: ${check.summary}`);
        }
        return selected.some((id) => state.checks.get(id)?.ok);
    };

    /**
     * Installs, logs in and updates selected harnesses (interactive sub-steps of the Harnesses step).
     */
    const setUpHarnesses = async (selected: string[]): Promise<void> => {
        const projectRoot = await nearestExisting(state.root);
        const place = loginLocation(context.env);
        for (const id of [...selected]) {
            const plugin = harnessPlugin(id)!;
            // The simple init instance: the native account context of the global installation (never an ambient API key).
            const nativeTool: HarnessToolRecord = { type: 'HARNESS', variant: plugin.variant, name: plugin.id, isEnabled: true, authentication: 'NATIVE' };
            const context2 = { projectRoot, env: instanceEnvironment(plugin, nativeTool, undefined, context.env), tool: nativeTool };
            // The same instance as the background service will see it after detachment or reboot.
            const service = { projectRoot, env: instanceEnvironment(plugin, nativeTool, undefined, persistentServiceEnvironment(context.env)), tool: nativeTool };
            let inspection = await plugin.inspect(context2);
            if (!inspection.installed) {
                let install = flag(context, 'install-harnesses') === true;
                if (interactive && flag(context, 'install-harnesses') === undefined) {
                    shown.add('harnesses');
                    install = answered(await confirm(terminal, { frame: frame('harnesses', `${plugin.displayName} is missing`), question: `${plugin.displayName} is not installed. Install it globally${plugin.npmPackage ? ` (npm install --global ${plugin.npmPackage})` : ''}?`, defaultYes: true }));
                }
                if (install) {
                    say(`Installing ${plugin.displayName}…`);
                    const result = await installHarness(plugin, context2, (line) => terminal.pretty && terminal.write(style.muted(`    ${line}\n`)));
                    say(`${result.outcome === 'installed' ? style.success(marks.ok) : style.error(marks.fail)} ${result.diagnostic}`);
                    if (result.outcome === 'installed') changed.push(`Installed ${plugin.displayName} globally`);
                    inspection = await plugin.inspect(context2);
                }
            }
            // A sign-in only this terminal can see (or an executable the service cannot find) is not readiness.
            let serviceProblem = await serviceProblemOf(plugin, inspection, service);
            if (interactive) {
                const signIn = await attendHarnessSignIn(terminal, {
                    plugin,
                    context: context2,
                    service,
                    place,
                    inspection,
                    serviceProblem,
                    frame: () => frame('harnesses', `${plugin.displayName} needs a login`, 'waiting-user'),
                    exits: [
                        { value: 'remove', label: `Remove ${plugin.displayName} from the selection` },
                        { value: 'defer', label: 'Defer (setup stays incomplete)' },
                    ],
                    say,
                    onPrompt: () => shown.add('harnesses'),
                });
                if (signIn.exit === CANCELLED) answered(CANCELLED);
                if (signIn.exit === 'remove') {
                    selected.splice(selected.indexOf(id), 1);
                    continue;
                }
                ({ inspection, serviceProblem } = signIn);
            }
            // Incomplete readiness keeps its reason for the completion summary and a later retry.
            if (serviceProblem) inspection = { ...inspection, usable: false, summary: `Signed in, but ${serviceProblem.summary}.`, problem: 'error', nextAction: serviceProblem.nextAction };
            state.inspections.set(id, inspection);
        }
        const context2 = { projectRoot, env: context.env };
        const outdated: Array<{ plugin: HarnessPlugin; inspection: HarnessInspection; current?: string; latest?: string }> = [];
        const canDecideUpdates = interactive || option<string>(context, 'update-harnesses') === 'update';
        for (const id of canDecideUpdates ? selected : []) {
            const inspection = state.inspections.get(id);
            if (!inspection?.installed) continue;
            const plugin = harnessPlugin(id)!;
            const version = await checkHarnessVersion(plugin, inspection, context2);
            if (version.outcome === 'outdated') outdated.push({ plugin, inspection, current: version.current, latest: version.latest });
        }
        if (!outdated.length) return;
        let toUpdate: typeof outdated = [];
        const decision = option<string>(context, 'update-harnesses');
        if (decision === 'update') toUpdate = outdated;
        else if (decision === undefined && interactive) {
            shown.add('harnesses');
            if (outdated.length === 1) {
                const item = outdated[0]!;
                if (answered(await confirm(terminal, { frame: frame('harnesses', 'a harness update is available'), question: `${item.plugin.displayName} ${item.current} is outdated (${item.latest} available; shared global installation). Update it?`, defaultYes: true }))) toUpdate = outdated;
            } else {
                const choice = answered(
                    await selectOne(terminal, {
                        frame: frame('harnesses', 'harness updates are available'),
                        question: `${outdated.length} selected harnesses are outdated (${outdated.map((item) => `${item.plugin.displayName} ${item.current} → ${item.latest}`).join(', ')}).`,
                        choices: [
                            { value: 'keep', label: 'Keep current versions' },
                            { value: 'all', label: 'Update all outdated selected harnesses' },
                            { value: 'choose', label: 'Choose individually' },
                        ],
                        defaultValue: 'keep',
                    }),
                );
                if (choice === 'all') toUpdate = outdated;
                else if (choice === 'choose') {
                    const ids = answered(await selectMany(terminal, { frame: frame('harnesses'), question: 'Update which harnesses?', choices: outdated.map((item) => ({ value: item.plugin.id, label: `${item.plugin.displayName} ${item.current} → ${item.latest}` })), initial: [] }));
                    toUpdate = outdated.filter((item) => ids.includes(item.plugin.id));
                }
            }
        }
        for (const item of toUpdate) {
            say(`Updating ${item.plugin.displayName}…`);
            const result = await updateHarness(item.plugin, item.inspection, context2);
            say(`${result.outcome === 'updated' || result.outcome === 'current' ? style.success(marks.ok) : style.warning(marks.warn)} ${result.diagnostic}`);
            if (result.outcome === 'updated') changed.push(result.diagnostic);
        }
        for (const item of outdated.filter((candidate) => !toUpdate.includes(candidate))) alreadyReady.push(`${item.plugin.displayName} kept at ${item.current}`);
    };

    // Questions, with Esc going back to the previous screen.
    const order: StepId[] = ['intent', 'update', 'destination', 'installation', 'harnesses', 'browser', 'traces', 'wallet', 'sync', 'review'];
    for (let index = 0; index < order.length; ) {
        const id = order[index]!;
        // Named after the destination folder, which the destination step may change.
        context.terminal.title.set({ project: basename(state.root), mode: options.fromStart ? 'Setup' : 'Init' });
        try {
            await stepFunctions[id]();
            index++;
        } catch (error) {
            if (error instanceof EngineUpdated) return { outcome: 'updated-engine', changed: [error.message], alreadyReady, unresolved, notes };
            if (!(error instanceof WizardBack)) throw error;
            let previous = index - 1;
            while (previous >= 0 && !shown.has(order[previous]!)) previous--;
            if (previous < 0) throw new WizardCancelled('back from the first question');
            index = previous;
        }
    }
    if (missingDecisions.length) {
        throw new PtbkError('Initialization needs decisions that were not supplied.', {
            kind: 'incomplete',
            project: state.root,
            reason: missingDecisions.map((decision) => `missing ${decision}`).join('\n'),
            effect: 'Nothing was changed.',
            next: ['Supply the listed flags, or run `ptbk init` in an interactive terminal.'],
        });
    }

    // ── Apply technical setup (no more questions) ────────────────────────────
    if (interactive && terminal.pretty) terminal.write(`\n${style.muted(state.newProject ? 'Creating the project…' : 'Applying the setup…')}\n`);
    let root = state.root;
    const fresh = !(await isDirectory(root)) || (await isFreshDirectory(root));
    // Directories this init creates (e.g. the shared projects folder and the new project in it): under sudo they are
    // handed over to the original user afterwards.
    const createdDirectories = await missingDirectories(root);
    const createdPaths: string[] = [];
    const parentChanges: string[] = [];
    if (state.nested) {
        const prepared = await prepareNestedChild({ parentRoot: state.nested.parentRoot, childRoot: root, strategy: state.nested.strategy, submoduleUrl: state.nested.url });
        parentChanges.push(...prepared.parentChanges);
        changed.push(`Child repository created (${state.nested.strategy === 'ignored' ? 'ignored by the parent' : 'to be registered as a submodule'})`);
    }
    const repository = await ensureGitRepository(root);
    // Use the canonical form Git reports (symlinked temp folders, Windows short names).
    root = canonicalPath(root);
    let project = projectAt(root);
    if (repository.created) changed.push('Git repository initialized');
    else alreadyReady.push(`Git repository ${repository.repositoryRoot}`);
    // Required configuration evolution of an existing project is its own committed pass, before any setup write.
    if (await pathExists(project.configPath)) {
        const maintenance = await maintainProjectConfiguration(project, { commit, env: context.env });
        if (maintenance.migrated) changed.push(`Migrated ptbk.json from ${maintenance.migrated.from} to ${maintenance.migrated.to}${maintenance.migrated.commit ? ` (${maintenance.migrated.commit.slice(0, 8)})` : ''}`);
        if (maintenance.normalized) changed.push(`Normalized ptbk.json spelling${maintenance.normalized.commit ? ` (${maintenance.normalized.commit.slice(0, 8)})` : ''}`);
    }
    const configBefore = (await pathExists(project.configPath)) ? await loadSettings(project, { env: context.env }) : undefined;
    const savedCheck: string | undefined = configBefore ? (setting<string | null | undefined>(configBefore, 'execution.check') ?? undefined) : undefined;
    const installation = state.installation ?? 'existing';
    if (installation === 'existing') {
        const local = await inspectLocalInstallation(root);
        if (local.usable) alreadyReady.push(`ptbk ${local.installedVersion} installed locally (${local.declaredIn})`);
    }
    const selected = state.selected ?? [];
    for (const id of selected) {
        const plugin = harnessPlugin(id)!;
        const inspection = state.inspections.get(id);
        const check = state.checks.get(id);
        // A tested harness reports its real check; a failed additional one is identified without blocking the working one.
        if (check?.ok) alreadyReady.push(`${plugin.displayName}: ${check.summary}`);
        else if (check) notes.push(`${plugin.displayName} did not pass its real functional check: ${check.summary}${inspection?.nextAction ? ` → ${inspection.nextAction}` : ''}`);
        else if (inspection?.usable) alreadyReady.push(`${plugin.displayName}: ${inspection.summary}`);
        else unresolved.push(`${plugin.displayName}: ${inspection?.summary ?? 'not inspected'}${inspection?.nextAction ? ` → ${inspection.nextAction}` : ''}`);
    }
    if (!selected.length && !(configBefore && enabledHarnesses(configBefore).length)) notes.push('No harness is selected: the agenda runs but waits for tools until one is added (`ptbk tool add HARNESS …`).');

    const tasksDirectory = configBefore ? setting<string>(configBefore, 'paths.tasks') : 'tasks';
    const agentsDirectory = configBefore ? setting<string>(configBefore, 'paths.agents') : 'agents';
    const tracePolicy = state.traces ?? { commit: false, ignoreVideos: true, recordVideo: true };
    const createdManifest = installation === 'local' && !(await pathExists(join(root, 'package.json')));
    // Runtime state and local secrets stay ignored independently of every trace choice.
    const ignore = await ensureRuntimeIgnore(root, [...(createdManifest || (await pathExists(join(root, 'node_modules'))) ? ['node_modules/'] : []), '.env']);
    if (ignore) createdPaths.push(ignore);
    const savedPolicy = configBefore ? { commit: setting<boolean>(configBefore, 'traces.isCommitted'), ignoreVideos: setting<boolean>(configBefore, 'traces.isVideoIgnored') } : undefined;
    const traceIgnore = await ensureTraceIgnoreRules(root, savedPolicy && configBefore?.interpreted.traces ? savedPolicy : tracePolicy);
    if (traceIgnore) createdPaths.push(traceIgnore);
    // Default roles first: a missing Chatter's initial TEAM covers the completed role set. They are the useful
    // boilerplate of a blank start; a supplied intent gets relevant specialists from the ordinary first task instead
    // of sample roles. Existing user-owned agents are never touched.
    if (!state.intent || blankIntent(state.intent.segments)) for (const path of await ensureDefaultRoles(root, agentsDirectory)) createdPaths.push(path);
    // Router starts directly runnable: the first selected harness that passed its real check, with its plugin's coded
    // defaults.
    const routerModel = async (): Promise<string | undefined> => {
        const id = selected.find((candidate) => state.checks.get(candidate)?.ok) ?? selected.find((candidate) => state.inspections.get(candidate)?.usable) ?? selected[0] ?? (configBefore ? enabledHarnesses(configBefore)[0] : undefined);
        const plugin = id ? harnessPlugin(id) : undefined;
        if (!plugin) return undefined;
        const catalog = plugin.modelCatalog === 'complete' && plugin.listModels ? await plugin.listModels({ projectRoot: root, env: context.env }).catch(() => []) : [];
        return formatModelRow(pluginDefaultRow(plugin, catalog));
    };
    // The same core preparation as start: missing roles are created, clean template updates applied; conflicts stay
    // for the engine's ordinary Fixer work (init makes no project model calls).
    const cores = await prepareCoreAgents(root, agentsDirectory, { runtimeRoot: project.runtime.root, routerModel });
    createdPaths.push(...cores.created, ...cores.updated);
    for (const path of await ensureTemplates(root, tasksDirectory)) createdPaths.push(path);
    await ensureDirectory(join(root, tasksDirectory));
    await ensureDirectory(join(root, 'specs'));
    await ensureDirectory(join(root, 'traces'));
    if (fresh && !(await pathExists(join(root, 'README.md')))) {
        await writeFile(join(root, 'README.md'), sampleReadme({ name: state.title ?? project.name }));
        createdPaths.push(join(root, 'README.md'));
    }

    // The user's initial input, preserved verbatim with project-local attachments.
    const newPurpose = !state.purposeRecorded && Boolean(state.intent) && !(await recordedPurpose(root));
    if (newPurpose && state.intent) {
        const specification = join(root, INITIAL_SPECIFICATION);
        const { text, files } = await materializeAttachments(state.intent.segments, { directory: join(root, INITIAL_ASSETS), link: (name) => `${INITIAL_ASSETS.split('/').pop()}/${name}` });
        await ensureDirectory(dirname(specification));
        await writeFile(specification, text, { flag: 'wx' });
        createdPaths.push(specification, ...files);
    }

    if (installation === 'local' || createdManifest) {
        if (await ensureManifest(root, project.name)) createdPaths.push(join(root, 'package.json'));
    }
    if (installation === 'local') {
        say(`Installing ptbk ${ENGINE_VERSION} into ${root}…`);
        try {
            const result = await installLocally(root, (line) => terminal.pretty && terminal.write(style.muted(`    ${line}\n`)), context.env);
            if (result.changed) {
                changed.push(`Installed ptbk ${result.version} locally`);
                createdPaths.push(join(root, 'package.json'));
                for (const lock of ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock']) if (await pathExists(join(root, lock))) createdPaths.push(join(root, lock));
            }
        } catch (error) {
            unresolved.push(`Local installation: ${errorMessage(error)}`);
        }
    } else if (installation === 'global') {
        const global = await verifyGlobalAvailability(context.env);
        if (global.available) alreadyReady.push(global.note);
        else notes.push(global.note);
    }
    // No check question: a real existing check is kept (even a failing one: that is ordinary repair work); a supplied
    // --check fills a missing one; otherwise the explicit informational placeholder records that validation is absent.
    const suppliedCheck = option<string>(context, 'check');
    let check = savedCheck;
    let saveCheck: string | undefined;
    if (savedCheck !== undefined) {
        if (isCheckPlaceholder(savedCheck)) notes.push('Real automated validation is not configured yet (execution.check holds the informational placeholder).');
        else {
            const validation = await validateCheckCommand(root, savedCheck, context.env);
            if (validation.ok) alreadyReady.push(`Check: ${savedCheck}`);
            else notes.push(`The configured check \`${savedCheck}\` is kept but does not look runnable (${validation.reason}); it is repaired through ordinary work, never replaced by the placeholder.`);
        }
        if (suppliedCheck && suppliedCheck !== savedCheck) notes.push(`Check override for this run only: ${suppliedCheck}`);
    } else if (suppliedCheck) {
        saveCheck = suppliedCheck;
        const validation = await validateCheckCommand(root, suppliedCheck, context.env);
        if (!validation.ok) notes.push(`The supplied check \`${suppliedCheck}\` does not look runnable yet (${validation.reason}).`);
        changed.push(`Check: ${suppliedCheck}`);
    } else {
        saveCheck = CHECK_PLACEHOLDER;
        changed.push('Check: informational placeholder (real automated validation is not configured)');
    }
    if (flag(context, 'defer-check')) notes.push('--defer-check is no longer needed: init does not ask for a check.');
    if (saveCheck !== undefined) check = saveCheck;
    const instructions = await ensureProjectInstructions(root, project.name, check);
    if (instructions) createdPaths.push(instructions);

    // ptbk.json in one write: settings, the simple initial tools (through the shared tool operations), synchronization
    // choice and the initialization marker. A new configuration records the running engine version.
    const file = await readProjectConfigFile(project);
    const timeZone = setting<string>(await loadSettings(project, { env: context.env }), 'timezone');
    const marker = (file.raw.initialized ?? {}) as { starterTask?: string; installation?: string; engineVersion?: string };
    let firstTask: InitResult['firstTask'];
    const tasksRoot = join(root, tasksDirectory);
    if (newPurpose && !marker.starterTask && !(await hasFirstTask({ root, tasksDirectory, timeZone }))) {
        const blank = blankIntent(state.intent?.segments ?? []);
        const specification = join(root, INITIAL_SPECIFICATION);
        const draftPath = await newTaskPath(tasksRoot, blank ? 'review initialized project' : 'transform project', Date.now(), timeZone);
        const link = relative(dirname(draftPath), specification).split(sep).join('/');
        const content = bootstrapTask({ blank, specificationLink: link });
        // A generated name: the readable title plus creation date/time, distinct from every Book of the project.
        const title = generatedName(content.title, { taken: (await BookIndex.load(root, { agents: agentsDirectory, tasks: tasksDirectory })).names(), timeZone });
        await writeFile(draftPath, renderTaskBook({ title, description: content.description, commitments: ['TASK AGENT @Expert', 'TASK ORIGIN initialization'] }), { flag: 'wx' });
        createdPaths.push(draftPath);
        firstTask = { title, path: draftPath };
    }
    const raw = structuredClone(file.raw) as Record<string, unknown>;
    if (!file.exists) raw.promptbookVersion = ENGINE_VERSION;
    const set = (key: string, value: unknown): void => setPath(raw, key, serializeSettingValue(SETTING_SPEC_BY_KEY.get(key)!, value));
    if (saveCheck !== undefined) set('execution.check', saveCheck);
    for (const [key, value] of [
        ['traces.isCommitted', tracePolicy.commit],
        ['traces.isVideoIgnored', tracePolicy.ignoreVideos],
        ['traces.isVideoRecordingEnabled', tracePolicy.recordVideo],
    ] as const) {
        if (getPath(raw, key) === undefined) set(key, value);
    }
    if (state.sync && (!state.sync.reused || raw.isAutoSync === undefined)) raw.isAutoSync = state.sync.enabled;
    const existingTools = Array.isArray(raw.tools) ? (raw.tools as unknown[]) : [];
    const typedTools = interpretConfig({ raw, exists: true, diagnostics: [] }).tools;
    const operations: ToolOperation[] = [];
    // One simple browser from the familiar picker; advanced profiles/accounts are managed later.
    const browserProfile = profileFromSpelling(state.browserProfile ?? 'global');
    const firstBrowser = typedTools.find((tool): tool is BrowserToolRecord => tool.type === 'BROWSER');
    if (!firstBrowser) {
        operations.push({ kind: 'add', tool: { type: 'BROWSER', variant: 'CHROME', name: MIGRATED_BROWSER_NAME, profileSource: browserProfile.source, ...(browserProfile.path ? { profilePath: browserProfile.path } : {}), isHeadless: (state.browserMode ?? 'headless') !== 'headful' } });
    } else if (option<string>(context, 'browser-profile') !== undefined || option<string>(context, 'browser-mode') !== undefined) {
        operations.push({ kind: 'modify', name: firstBrowser.name, changes: { ...(option<string>(context, 'browser-profile') !== undefined ? { profileSource: browserProfile.source, profilePath: browserProfile.path ?? null } : {}), ...(option<string>(context, 'browser-mode') !== undefined ? { isHeadless: state.browserMode !== 'headful' } : {}) } });
    }
    // Each selected integration gets one native instance named after it (existing instances are kept as they are).
    for (const id of selected) {
        const variant = harnessVariantOf(id)!;
        const instances = typedTools.filter((tool): tool is HarnessToolRecord => tool.type === 'HARNESS' && tool.variant === variant);
        if (!instances.length) operations.push({ kind: 'add', tool: { type: 'HARNESS', variant, name: typedTools.some((tool) => tool.name === id) ? `${id}-native` : id, authentication: 'NATIVE' } });
        else if (!instances.some((tool) => tool.isEnabled)) operations.push({ kind: 'enable', name: instances[0]!.name });
    }
    const configured = operations.length ? applyToolOperationsToConfig({ ...raw, tools: existingTools }, operations) : canonicalizeConfig(raw).raw;
    const effectiveInstallation = installation === 'existing' ? (marker.installation ?? 'local') : installation;
    if (firstTask || !marker.engineVersion || marker.installation !== effectiveInstallation) {
        configured.initialized = { ...(configured.initialized as object | undefined), engineVersion: marker.engineVersion ?? ENGINE_VERSION, ...(firstTask ? { starterTask: firstTask.title } : {}), installation: effectiveInstallation };
    }
    const text = configText(configured);
    if (text !== file.text) {
        await writeFileAtomic(project.configPath, text);
        createdPaths.push(project.configPath);
    }
    for (const operation of operations) changed.push(operation.kind === 'add' ? `Tool ${operation.tool.name} (${operation.tool.type} ${operation.tool.variant})` : `Tool ${operation.name}: ${operation.kind}`);
    for (const path of createdPaths) {
        const label = toProjectRelative(root, path);
        if (!changed.includes(label)) changed.push(label);
    }

    // Commit authorized setup artifacts only (never unrelated changes), with the first task's name.
    let commitSha: string | undefined;
    const uniquePaths = [...new Set(createdPaths)];
    if (uniquePaths.length) {
        if (commit) {
            try {
                const outcome = await commitPaths({
                    projectRoot: root,
                    repositoryRoot: repository.repositoryRoot,
                    paths: uniquePaths,
                    subject: configBefore ? 'Update project setup' : 'Initialize project',
                    trailers: { 'Task-Name': firstTask ? [firstTask.title] : [] },
                    temporaryDirectory: project.runtime.temporary,
                    env: context.env,
                });
                if (outcome.committed) commitSha = outcome.sha;
            } catch (error) {
                unresolved.push(`Setup commit failed: ${errorMessage(error)} → fix the cause and run \`ptbk init\` again (files are preserved)`);
            }
        } else {
            notes.push(`Setup is uncommitted (--no-commit): ${uniquePaths.map((path) => toProjectRelative(root, path)).join(', ')}. The started service keeps this no-commit policy; commit these files before an ordinary committed start.`);
        }
    }
    if (state.intent && newPurpose) await clearSetupDraft(context.cwd);
    if (state.nested?.strategy === 'submodule' && state.nested.url && commitSha) {
        try {
            parentChanges.push(...(await registerSubmodule(state.nested.parentRoot, root, state.nested.url)));
        } catch (error) {
            unresolved.push(`Submodule registration failed: ${errorMessage(error)}`);
        }
    }
    if (parentChanges.length) notes.push(`Parent repository changes left uncommitted: ${parentChanges.map((path) => toProjectRelative(state.nested!.parentRoot, path) || '.').join(', ')}`);
    if (!traceIgnore && !createdPaths.length) alreadyReady.push(`Trace policy: ${traceIgnoreLines(tracePolicy).join(' ')}`);

    // The initial browser must actually be usable (inspected without launching it).
    const browserTool = interpretConfig({ raw: configured, exists: true, diagnostics: [] }).tools.find((tool): tool is BrowserToolRecord => tool.type === 'BROWSER' && tool.isEnabled);
    if (browserTool) {
        const browserReadiness = await inspectBrowserTool(project, browserTool, context.env);
        if (browserReadiness.usable) alreadyReady.push(`Browser ${browserTool.name}: ${browserReadiness.summary}`);
        else unresolved.push(`Browser ${browserTool.name}: ${browserReadiness.summary}${browserReadiness.nextAction ? ` → ${browserReadiness.nextAction}` : ''}`);
    }

    // Remote publication is a separate, honestly reported outcome after the committed local setup.
    let publication: PublicationOutcome | undefined;
    if (state.sync?.enabled && state.sync.choice && commitSha !== undefined && !unresolved.length) {
        say('Setting up automatic synchronization…');
        publication = await publishProject(project, repository.repositoryRoot, state.sync.choice, context.env);
        (publication.ok ? changed : notes).push(publication.ok ? publication.message : `Remote publication did not succeed: ${publication.message} Local setup is complete; synchronization stays enabled and retries in the background (or rerun \`ptbk init\`).`);
    } else if (state.sync?.enabled && state.sync.choice && !commitSha && !unresolved.length && !uniquePaths.length) {
        publication = await publishProject(project, repository.repositoryRoot, state.sync.choice, context.env);
        (publication.ok ? alreadyReady : notes).push(publication.ok ? publication.message : `Remote publication did not succeed: ${publication.message}`);
    }

    // Optional Wallet setup through the same protected operation as later Wallet management (never a second vault).
    if (state.wallet) {
        const wallet = new WalletSubEngine({ project, env: context.env, onChange: () => undefined, log: () => undefined });
        await wallet.initialize();
        if (wallet.readiness === 'empty' || wallet.readiness === 'setup') {
            const { words } = await wallet.beginSetup();
            if (await confirmRecoveryWords(terminal, words)) {
                const outcome = await wallet.confirmSetup();
                (outcome.applied ? changed : unresolved).push(outcome.applied ? 'Set up the Wallet (this computer unlocks it automatically)' : `Wallet setup: ${outcome.outcome} → set it up later on the Wallet page`);
            } else {
                wallet.cancelSetup();
                notes.push('Wallet setup was discarded (nothing was saved); set it up later on the dashboard Wallet page.');
            }
        } else alreadyReady.push(`Wallet: ${wallet.view().summary}`);
        // The same optional Bitwarden import as the Wallet page, so selected routine access needs no later visit.
        if (wallet.readiness === 'ready' && terminal.interactive) {
            const offer = await confirm(terminal, {
                frame: { title: 'ptbk init', step: 'Wallet · import logins' },
                question: 'Import website logins from a Bitwarden export now? You choose which ones; you can also import later on the Wallet page.',
                defaultYes: false,
                yesLabel: 'Yes, import from an unencrypted Bitwarden JSON export',
                noLabel: 'No, not now',
            });
            if (offer === true) {
                const outcome = await walletImportFlow(
                    terminal,
                    { preview: async (path) => await wallet.previewImport({ content: await readFile(path, 'utf8') }), apply: async (draft, select, replace) => await wallet.applyImport({ draft, select, replace }), cancel: async () => wallet.cancelImport() },
                    'ptbk init',
                );
                if (outcome) (/^Nothing was imported|^The export has no/.test(outcome) ? notes : changed).push(`Wallet import: ${outcome}`);
            }
        }
    }
    await handOverCreated(createdDirectories, intendedUser(context.env)).catch((error: unknown) => unresolved.push(`The new project folder could not be handed over to its user: ${errorMessage(error)} → fix its ownership (chown) before running Promptbook without sudo`));

    // Readiness from the saved settings the service will use.
    project = projectAt(root);
    const readiness = await assessReadiness(project, await loadSettings(project, { env: context.env }), context.env);
    for (const problem of readiness.problems) if (!unresolved.some((item) => item.startsWith(problem.message.slice(0, 30)))) unresolved.push(`${problem.message} → ${problem.action}`);
    const ready = readiness.ready && !unresolved.length;
    return { outcome: ready ? 'ready' : 'incomplete', project, ...(state.title !== undefined ? { title: state.title } : {}), changed, alreadyReady, unresolved, notes, commit: commitSha, firstTask, publication, synchronization: state.sync?.enabled ?? false };
}

/**
 * Outcome of the automatic background start after setup.
 */
type StartOutcome =
    | { readonly kind: 'started' | 'reused'; readonly snapshot: ServiceSnapshot; readonly note?: string }
    | { readonly kind: 'failed'; readonly reason: string }
    | { readonly kind: 'skipped'; readonly reason: string };

/**
 * Performs the ordinary background start with the init invocation's applicable overrides (one service, never a second
 * worker; an existing service is reused without resetting it).
 */
async function startService(context: CommandContext, project: Project): Promise<StartOutcome> {
    try {
        const overrides = settingOverrides(context);
        const existing = await lookupService(project);
        if (existing.state === 'running') {
            return { kind: 'reused', snapshot: await liveSnapshot(project, existing), note: `The ${existing.record.mode} service (PID ${existing.record.pid}) was already running and keeps its configuration.` };
        }
        const settings = await loadSettings(project, { env: context.env, cli: overrides });
        const persistent = setting<boolean>(settings, 'service.isPersistent');
        const launched = await launchDaemon(project, { cli: overrides, tasksDirectory: tasksOverride(context), persistent, env: context.env });
        let snapshot = await liveSnapshot(project, launched.lookup);
        const deadline = Date.now() + 10_000;
        while (snapshot.phase === 'starting' && Date.now() < deadline) {
            await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));
            snapshot = await liveSnapshot(project, launched.lookup);
        }
        return { kind: launched.started ? 'started' : 'reused', snapshot, note: launched.persistence?.note ?? (persistent ? undefined : 'Restart persistence is disabled (--no-persist).') };
    } catch (error) {
        return { kind: 'failed', reason: errorMessage(error) };
    }
}

/**
 * After setup: registers the initialized project for the global dashboard (verified through discovery at its actual
 * path, independent of the launch directory) and performs the ordinary background start of a ready project. Shared by
 * `ptbk init` and the global dashboard's New project.
 */
async function registerAndStart(context: CommandContext, result: InitResult): Promise<StartOutcome | undefined> {
    if (!result.project || (result.outcome !== 'ready' && result.outcome !== 'incomplete')) return undefined;
    // Every initialized project is known to this host: the global dashboard lists it even while stopped or incomplete.
    const known = await ensureKnownProject(result.project, context.env);
    if (known.problem) context.terminal.write(`${context.terminal.style.warning('Note:')} the project could not be registered for \`ptbk dashboard --global\`: ${known.problem}\n`);
    if (result.outcome !== 'ready') return undefined;
    return flag(context, 'start') === false ? { kind: 'skipped', reason: 'not started (--no-start)' } : await startService(context, result.project);
}

/**
 * The global dashboard's New project: the same initializer as `ptbk init` (every step, Back navigation and the final
 * create-and-start review), with the destination limited to a new child of the shared projects home. Cancellation
 * before confirmation leaves nothing behind. Returns a one-line outcome for the global view and the created project.
 *
 * @private command
 */
export async function newProjectFromGlobalDashboard(context: CommandContext): Promise<{ readonly message: string; readonly projectRoot?: string }> {
    let result: InitResult;
    try {
        result = await initializeProject(context, { homeOnly: true });
    } catch (error) {
        if (error instanceof WizardCancelled) return { message: 'New project cancelled; nothing was created.' };
        return { message: `New project failed: ${errorMessage(error)}` };
    }
    if (result.outcome === 'updated-engine') return { message: 'Promptbook was updated; run New project again with the new version.' };
    const service = await registerAndStart(context, result);
    const name = result.title ?? result.project?.name ?? 'The project';
    if (result.outcome !== 'ready') return { message: `${name} was created, but setup is incomplete: ${result.unresolved[0] ?? 'see ptbk init'}.`, projectRoot: result.project?.root };
    if (service?.kind === 'failed') return { message: `${name} was created, but its engine did not start: ${service.reason}`, projectRoot: result.project?.root };
    return { message: `${name} was created${service?.kind === 'started' || service?.kind === 'reused' ? ' and its agenda is running' : ''}${result.firstTask ? '; Expert starts on it in the background' : ''}.`, projectRoot: result.project?.root };
}

/**
 * Renders init's concise, finite final summary: project, engine version, setup result and confirmed service state,
 * with `ptbk dashboard` as the primary next action.
 */
function renderInitSummary(context: CommandContext, input: { result: InitResult; service?: StartOutcome }): void {
    const { terminal } = context;
    const { style } = terminal;
    const marks = symbols(terminal.unicode);
    const { result, service } = input;
    const root = result.project?.root ?? '';
    const { notes, unresolved } = result;
    const ready = result.outcome === 'ready';
    const running = service?.kind === 'started' || service?.kind === 'reused';
    const snapshot = running ? service.snapshot : undefined;
    const local = snapshot?.connection.local.url;
    const serviceLine = running
        ? `${service.kind === 'started' ? 'running in the background' : 'already running (reused)'} (PID ${snapshot!.service.pid})${local ? ` · local ${local}` : ''}${snapshot!.service.commitMode === 'no-commit' ? ' · no-commit mode' : ''}`
        : service?.kind === 'failed'
          ? `did not start: ${service.reason}`
          : service?.kind === 'skipped'
            ? service.reason
            : 'not started (setup is incomplete)';
    const next: Array<[string, string]> = running
        ? [
              ['ptbk dashboard', 'watch and control the running agenda'],
              ['ptbk stop', 'stop the background service'],
          ]
        : ready
          ? [['ptbk start', service?.kind === 'failed' ? 'start the service after fixing the problem above' : 'start the agenda in the background']]
          : [['ptbk init', 'resume setup after resolving the items above']];
    const first = result.firstTask ? `{${result.firstTask.title}} → Expert (${toProjectRelative(root, result.firstTask.path)})` : undefined;
    const headline = !ready ? 'Setup incomplete' : running ? 'Project ready · agenda running' : 'Setup complete · service not running';
    if (!terminal.pretty) {
        const lines = [`${headline}: ${root} (ptbk ${ENGINE_VERSION})`];
        if (result.changed.length) lines.push('Changed:', ...result.changed.map((item) => `  - ${item}`));
        if (result.alreadyReady.length) lines.push('Already ready:', ...result.alreadyReady.map((item) => `  - ${item}`));
        if (unresolved.length) lines.push('Unresolved prerequisites:', ...unresolved.map((item) => `  - ${item}`));
        if (result.commit) lines.push(`Commit: ${result.commit}`);
        if (first) lines.push(`First task: ${first}`);
        lines.push(`Service: ${serviceLine}`);
        if (running && service.note) lines.push(service.note);
        lines.push(...notes);
        lines.push(`Next: ${next.map(([command, description]) => `${command} (${description})`).join('; ')}`);
        terminal.write(`${lines.join('\n')}\n`);
        return;
    }
    const width = Math.min(terminal.columns(), 110);
    const lines: string[] = [];
    const row = (label: string, value: string): void => {
        wrap(value, width - 18).forEach((line, index) => lines.push(`${index === 0 ? style.bold(label.padEnd(12)) : ' '.repeat(12)}${line}`));
    };
    row('Project', `${result.project?.name ?? ''}  ${style.muted(root)}`);
    row('Setup', `${result.changed.length ? `${result.changed.length} change${result.changed.length === 1 ? '' : 's'}` : 'nothing to change'}${result.commit ? ` committed ${result.commit.slice(0, 8)} (ptbk: setup)` : ''}${result.alreadyReady.length ? style.muted(` · ${result.alreadyReady.length} already ready`) : ''}`);
    if (first) row('First task', first);
    row('Service', running ? style.success(serviceLine) : style.warning(serviceLine));
    if (running && service.note) row('', style.muted(service.note));
    if (unresolved.length) {
        lines.push('', style.bold('Unresolved'));
        for (const item of unresolved) wrap(item, width - 8).forEach((line, index) => lines.push(`${index === 0 ? style.error(marks.fail) : ' '} ${line}`));
    }
    if (result.changed.length && result.changed.length <= 14) lines.push('', style.muted(`Changed: ${result.changed.join(', ')}`));
    for (const note of notes) for (const line of wrap(note, width - 4)) lines.push(style.muted(line));
    lines.push('');
    next.forEach(([command, description], index) => lines.push(`${index === 0 ? style.bold('Next') : '    '}        ${index === 0 ? style.bold(style.accent(command)) : style.accent(command)}  ${style.muted(description)}`));
    terminal.write(`${renderPanel({ title: `${ready ? marks.ok : marks.warn} ${headline}`, titleRight: `ptbk ${ENGINE_VERSION}`, lines, width, tone: ready && running ? 'success' : 'attention', unicode: terminal.unicode, style }).join('\n')}\n`);
}

/**
 * `ptbk init`: finite technical setup, then the ordinary background start of the agenda.
 *
 * @private command
 */
export default async function init(context: CommandContext): Promise<number> {
    validateCombinations(context);
    if (flag(context, 'start') === false && (context.explicit.has('port') || context.explicit.has('server'))) {
        throw usageError('--no-start conflicts with service options (--port, --no-server).', 'init');
    }
    let result: InitResult;
    try {
        result = await initializeProject(context);
    } catch (error) {
        if (error instanceof WizardCancelled) {
            // Cancelling the draft never reaches the destination; only global prerequisites (a harness installation or
            // sign-in) may already have happened, and they are not presented as rolled back.
            context.terminal.write(`${context.terminal.style.warning('Initialization cancelled.')} Nothing was created or changed in the destination and nothing was started (global harness installations or sign-ins made meanwhile stay); run \`ptbk init\` to start again.\n`);
            return EXIT.incomplete;
        }
        throw error;
    }
    if (result.outcome === 'updated-engine') return EXIT.success;
    const service = await registerAndStart(context, result);
    const success = result.outcome === 'ready' && (service?.kind === 'started' || service?.kind === 'reused');
    if (success) await celebrate(context.terminal, result.firstTask ? 'All set — Expert starts on your project in the background.' : 'All set — your agenda is running in the background.');
    renderInitSummary(context, { result, service });
    if (result.outcome !== 'ready') return EXIT.incomplete;
    if (service?.kind === 'failed') return EXIT.incomplete;
    if (success && result.project) await handOffToDashboard(context, result.project);
    return EXIT.success;
}

/**
 * Interactive init's automatic handoff: a brief cancellable countdown, then the ordinary independent dashboard attached
 * to the service that was just started or reused (never another start, initialization or worker). Skipping it or
 * later closing the viewer leaves the engine running; `--no-dashboard` and raw/no-UI/noninteractive use return
 * without it.
 */
async function handOffToDashboard(context: CommandContext, project: Project): Promise<void> {
    const { terminal } = context;
    if (!wantsDashboardHandoff(context)) return;
    if ((await countdownHandoff(terminal, { label: 'Opening the dashboard' })) === 'skip') return;
    const lookup = await lookupService(project);
    if (lookup.state !== 'running') {
        terminal.write(`${terminal.style.warning('The dashboard cannot attach right now')}; run \`ptbk status\` or \`ptbk dashboard\`.\n`);
        return;
    }
    await attachDashboard(context, project, lookup);
}
