import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { EXIT, PtbkError, errorMessage, usageError } from '../../common/errors.js';
import { ensureDirectory, isDirectory, pathExists, toProjectRelative } from '../../common/fs.js';
import { ENGINE_VERSION } from '../../common/version.js';
import { describeBrowserProfile, userChromeProfile } from '../../browser/browser.js';
import { BookIndex } from '../../project/books.js';
import { generatedName } from '../../tasks/identity.js';
import { checkCandidates, validateCheckCommand } from '../../project/checks.js';
import { enabledHarnesses, getPath, loadSettings, readProjectConfigFile, setting, updateProjectConfig } from '../../project/config.js';
import { INITIAL_ASSETS, INITIAL_SPECIFICATION, bootstrapTask, sampleReadme } from '../../project/defaults.js';
import { clearSetupDraft, readSetupDraft, saveSetupDraft } from '../../project/draft.js';
import { commitPaths, inspectGit } from '../../project/git.js';
import { ensureManifest, inspectLocalInstallation, installLocally, verifyGlobalAvailability } from '../../project/install.js';
import { assessReadiness } from '../../project/readiness.js';
import { checkForEngineUpdate, updateEngine, type UpdateCheck } from '../../project/self-update.js';
import {
    ensureCoreAgents,
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
import { canonicalPath, projectAt, type Project } from '../../project/workspace.js';
import { HARNESS_PLUGINS, harnessPlugin } from '../../harness/registry.js';
import { checkHarnessVersion, installHarness, loginHarness, updateHarness } from '../../harness/maintenance.js';
import type { HarnessInspection, HarnessPlugin } from '../../harness/types.js';
import type { ServiceSnapshot } from '../../engine/snapshot.js';
import { lookupService } from '../../service/control.js';
import { launchDaemon } from '../../service/launcher.js';
import { newTaskPath, renderTaskBook } from '../../tasks/authoring.js';
import { wrap } from '../../ui/ansi.js';
import { materializeAttachments, isImagePath } from '../../ui/attachments.js';
import type { BadgeActivity } from '../../ui/badges.js';
import { celebrate } from '../../ui/celebration.js';
import type { ComposedSegment } from '../../ui/composer.js';
import { renderPanel } from '../../ui/panels.js';
import { CANCELLED, composeRich, confirm, inputLine, selectMany, selectOne, toggleList, wasInterrupted, type WizardFrame } from '../../ui/prompts.js';
import { symbols } from '../../ui/terminal.js';
import { readStdin, settingOverrides, tasksOverride, validateCombinations } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';
import { liveSnapshot } from '../service-view.js';

/**
 * Outcome of initialization.
 *
 * @private command
 */
export type InitResult = {
    readonly outcome: 'ready' | 'incomplete' | 'updated-engine' | 'cancelled';
    readonly project?: Project;
    readonly changed: readonly string[];
    readonly alreadyReady: readonly string[];
    readonly unresolved: readonly string[];
    /** Informational notes (overrides, parent changes, uncommitted setup). */
    readonly notes: readonly string[];
    readonly commit?: string;
    /** The ordinary Expert bootstrap task created by this run. */
    readonly firstTask?: { readonly title: string; readonly path: string };
};

/**
 * Raised when the user abandons the wizard (Ctrl+C); completed steps are kept, nothing further is applied.
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
type StepId = 'intent' | 'update' | 'destination' | 'installation' | 'harnesses' | 'browser' | 'traces' | 'validation' | 'finish';

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
    validation: 'Validation',
    finish: 'Set up and start',
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
 * Whether a destination already records its purpose (initial specification or an earlier initialization).
 */
async function recordedPurpose(root: string): Promise<boolean> {
    if (await pathExists(join(root, INITIAL_SPECIFICATION))) return true;
    const raw = (await readProjectConfigFile(projectAt(root))).raw;
    return Boolean(raw.initialized);
}

/**
 * Wizard/unattended initialization shared by `ptbk init` and the setup step of `ptbk start`.
 *
 * It completes technical setup, preserves the initial input in `specs/_initial.md`, saves one ordinary Expert task and
 * commits setup; starting the agenda is the caller's job (`ptbk init` starts it, `ptbk start` continues its own start).
 *
 * @private command
 */
export async function initializeProject(context: CommandContext, options: { projectRoot?: string; fromStart?: boolean } = {}): Promise<InitResult> {
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
    const steps = new StepTracker(['intent', 'update', 'destination', 'installation', 'harnesses', 'browser', 'traces', 'validation', 'finish']);
    const stepOrder: readonly StepId[] = ['intent', 'update', 'destination', 'installation', 'harnesses', 'browser', 'traces', 'validation', 'finish'];
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
    const explicitDestination = Boolean(options.projectRoot || option<string>(context, 'subfolder') || context.explicit.has('path'));
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
        selected?: string[];
        inspections: Map<string, HarnessInspection>;
        browserProfile?: string;
        browserMode?: 'headless' | 'headful';
        traces?: { commit: boolean; ignoreVideos: boolean; recordVideo: boolean };
        saveCheck?: string;
    } = { purposeRecorded: false, root: option<string>(context, 'subfolder') ? resolve(base, option<string>(context, 'subfolder')!) : base, inspections: new Map() };
    const shown = new Set<StepId>();

    const stepFunctions: Record<Exclude<StepId, 'finish'>, () => Promise<void>> = {
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
        // 3. Destination (current folder by default) and the versioning boundary of a new child.
        destination: async () => {
            for (;;) {
                if (!explicitDestination && interactive) {
                    shown.add('destination');
                    const destination = answered(
                        await selectOne(terminal, {
                            frame: frame('destination'),
                            question: 'Where should the project live?',
                            choices: [
                                { value: 'current', label: 'Current directory', description: base },
                                { value: 'subfolder', label: 'New subfolder', description: 'create a new project folder here' },
                            ],
                            defaultValue: state.root === base ? 'current' : 'subfolder',
                            escapeLabel: 'Esc back',
                        }),
                    );
                    if (destination === 'subfolder') {
                        const name = answered(await inputLine(terminal, { frame: frame('destination'), question: 'Name (or relative path) of the new folder:', initial: state.root !== base ? relative(base, state.root) : undefined, validate: (value) => (!value ? 'Enter a folder name.' : undefined) }));
                        state.root = resolve(base, name);
                    } else state.root = base;
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
            answers.set('destination', `Destination: ${state.root}${state.nested ? ` (${state.nested.strategy} child)` : ''}`);
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
                        { value: 'local' as const, label: "Install Promptbook locally in this project's dependencies", description: `ptbk@${ENGINE_VERSION} (recommended)` },
                        { value: 'global' as const, label: 'Use the global CLI', description: 'no project dependency' },
                    ],
                    defaultValue: state.installation === 'global' ? 'global' : 'local',
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
                    selected = answered(
                        await selectMany(terminal, {
                            frame: frame('harnesses', 'pick the coding agents that will do the work'),
                            question: 'Which harnesses should run this project? (installed globally, shared with other projects)',
                            choices: HARNESS_PLUGINS.map((plugin) => ({ value: plugin.id, label: plugin.displayName, featured: plugin.featured, description: plugin.featured ? undefined : plugin.npmPackage })),
                            initial: state.selected ?? [],
                            noneLabel: 'None selected (setup stays incomplete)',
                        }),
                    );
                }
                try {
                    await setUpHarnesses(selected);
                    state.selected = selected;
                    answers.set('harnesses', `Harnesses: ${selected.length ? selected.map((id) => harnessPlugin(id)!.displayName).join(', ') : 'none'}`);
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
            const raw = (await readProjectConfigFile(projectAt(state.root))).raw;
            state.browserProfile = option<string>(context, 'browser-profile') ?? state.browserProfile;
            state.browserMode = option<'headless' | 'headful'>(context, 'browser-mode') ?? state.browserMode;
            if (raw.browser || !interactive || option<string>(context, 'browser-profile')) {
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
            answers.set('browser', `Browser: ${describeBrowserProfile(state.browserProfile ?? 'global')}, ${state.browserMode}`);
        },
        // 7. Trace recording and Git inclusion (three explicit project choices).
        traces: async () => {
            const raw = (await readProjectConfigFile(projectAt(state.root))).raw;
            const saved = (key: string): boolean | undefined => (typeof getPath(raw, key) === 'boolean' ? (getPath(raw, key) as boolean) : undefined);
            const flagged = { commit: flag(context, 'commit-traces'), ignoreVideos: flag(context, 'ignore-trace-videos'), recordVideo: flag(context, 'record-video') };
            const current = {
                commit: saved('traces.commit') ?? flagged.commit ?? state.traces?.commit ?? false,
                ignoreVideos: saved('traces.ignoreVideos') ?? flagged.ignoreVideos ?? state.traces?.ignoreVideos ?? true,
                recordVideo: saved('traces.recordVideo') ?? flagged.recordVideo ?? state.traces?.recordVideo ?? true,
            };
            const complete = saved('traces.commit') !== undefined && saved('traces.ignoreVideos') !== undefined && saved('traces.recordVideo') !== undefined;
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
        // 8. Real project validation (never an unconditional pass).
        validation: async () => {
            const configBefore = (await pathExists(projectAt(state.root).configPath)) ? await loadSettings(projectAt(state.root), { env: context.env }) : undefined;
            const check = configBefore ? (setting<string | null | undefined>(configBefore, 'execution.check') ?? undefined) : undefined;
            const supplied = option<string>(context, 'check');
            const existing = await validateCheckCommand(state.root, check === undefined ? undefined : check, context.env);
            const fresh = !(await isDirectory(state.root)) || (await isFreshDirectory(state.root));
            state.saveCheck = undefined;
            if (existing.ok || supplied || fresh || !interactive) {
                if (supplied && !existing.ok) state.saveCheck = supplied;
                else if (!existing.ok && fresh) state.saveCheck = state.installation === 'global' ? 'ptbk lint' : 'npm run check';
                steps.set('validation', false);
                return;
            }
            shown.add('validation');
            const candidates = await checkCandidates(state.root, context.env);
            for (;;) {
                const choice = answered(
                    await selectOne(terminal, {
                        frame: frame('validation', 'every accepted task must pass this check'),
                        question: check !== undefined ? `The configured check is not usable: ${existing.ok ? '' : existing.reason} Choose the project check:` : 'Which command validates this project? (it must pass before each task is accepted)',
                        choices: [
                            ...candidates.map((candidate) => ({ value: candidate.command, label: candidate.command, description: candidate.description })),
                            { value: '__custom', label: 'Enter a custom command' },
                            { value: '__defer', label: 'Defer (setup stays incomplete)' },
                        ],
                        defaultValue: candidates[0]?.command ?? '__custom',
                    }),
                );
                if (choice === '__defer') return;
                const command = choice === '__custom' ? answered(await inputLine(terminal, { frame: frame('validation'), question: 'Check command (runs in the project directory):' })) : choice;
                const validation = await validateCheckCommand(state.root, command, context.env);
                if (!validation.ok) {
                    say(style.warning(`${marks.warn} ${validation.reason}`));
                    continue;
                }
                if (answered(await confirm(terminal, { frame: frame('validation'), question: `Save \`${command}\` as ptbk.json execution.check?`, defaultYes: true }))) {
                    state.saveCheck = command;
                    return;
                }
            }
        },
    };

    /**
     * Predicts which later steps apply once the destination is known, so `Step X of Y` settles early; each step still
     * corrects its own applicability (a step that turns out to need input is always counted).
     */
    const predictPath = async (): Promise<void> => {
        if (!interactive) return;
        const destination = projectAt(state.root);
        const raw = (await readProjectConfigFile(destination)).raw;
        const local = await inspectLocalInstallation(state.root);
        const saved = await loadSettings(destination, { env: context.env }).catch(() => undefined);
        const remembered = ((raw.initialized ?? {}) as { installation?: string }).installation === 'global';
        const fresh = !(await isDirectory(state.root)) || (await isFreshDirectory(state.root));
        steps.set('installation', !(local.usable || local.declaredIn || option<string>(context, 'installation') || remembered));
        steps.set('harnesses', !(option<string[]>(context, 'harness') || flag(context, 'no-harness') || (saved && enabledHarnesses(saved).length)));
        steps.set('browser', !(raw.browser || option<string>(context, 'browser-profile')));
        const tracesSaved = ['traces.commit', 'traces.ignoreVideos', 'traces.recordVideo'].every((key) => typeof getPath(raw, key) === 'boolean');
        const tracesFlagged = flag(context, 'commit-traces') !== undefined && flag(context, 'ignore-trace-videos') !== undefined && flag(context, 'record-video') !== undefined;
        steps.set('traces', !(tracesSaved || tracesFlagged));
        const check = saved ? (setting<string | null | undefined>(saved, 'execution.check') ?? undefined) : undefined;
        steps.set('validation', !(fresh || option<string>(context, 'check') || (check !== undefined && (await validateCheckCommand(state.root, check, context.env)).ok)));
    };

    /**
     * Installs, logs in and updates selected harnesses (interactive sub-steps of the Harnesses step).
     */
    const setUpHarnesses = async (selected: string[]): Promise<void> => {
        const context2 = { projectRoot: await nearestExisting(state.root), env: context.env };
        for (const id of [...selected]) {
            const plugin = harnessPlugin(id)!;
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
            while (inspection.installed && inspection.authenticated === false && interactive) {
                shown.add('harnesses');
                const choice = answered(
                    await selectOne(terminal, {
                        frame: frame('harnesses', `${plugin.displayName} needs a login`, 'waiting-user'),
                        question: `${plugin.displayName}: ${inspection.summary} ${plugin.loginHint}`,
                        choices: [
                            ...(plugin.loginArgs ? [{ value: 'login', label: `Log in now (runs ${plugin.executable} ${plugin.loginArgs.join(' ')})` }] : []),
                            { value: 'recheck', label: 'I logged in another way — check again' },
                            { value: 'remove', label: `Remove ${plugin.displayName} from the selection` },
                            { value: 'defer', label: 'Defer (setup stays incomplete)' },
                        ],
                        defaultValue: plugin.loginArgs ? 'login' : 'recheck',
                    }),
                );
                if (choice === 'login') {
                    const result = await loginHarness(plugin, context2);
                    say(`${result.outcome === 'authenticated' ? style.success(marks.ok) : style.warning(marks.warn)} ${result.diagnostic}`);
                } else if (choice === 'remove') {
                    selected.splice(selected.indexOf(id), 1);
                    break;
                } else if (choice === 'defer') break;
                inspection = await plugin.inspect(context2);
            }
            if (!selected.includes(id)) continue;
            state.inspections.set(id, inspection);
        }
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
    const order: Array<Exclude<StepId, 'finish'>> = ['intent', 'update', 'destination', 'installation', 'harnesses', 'browser', 'traces', 'validation'];
    for (let index = 0; index < order.length; ) {
        const id = order[index]!;
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
    if (interactive && terminal.pretty) terminal.write(`\n${style.muted(steps.label('finish'))}\n`);
    let root = state.root;
    const fresh = !(await isDirectory(root)) || (await isFreshDirectory(root));
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
    const configBefore = (await pathExists(project.configPath)) ? await loadSettings(project, { env: context.env }) : undefined;
    let check: string | undefined = configBefore ? (setting<string | null | undefined>(configBefore, 'execution.check') ?? undefined) : undefined;
    const installation = state.installation ?? 'existing';
    if (installation === 'existing') {
        const local = await inspectLocalInstallation(root);
        if (local.usable) alreadyReady.push(`ptbk ${local.installedVersion} installed locally (${local.declaredIn})`);
    }
    const selected = state.selected ?? [];
    for (const id of selected) {
        const plugin = harnessPlugin(id)!;
        const inspection = state.inspections.get(id);
        if (inspection?.usable) alreadyReady.push(`${plugin.displayName}: ${inspection.summary}`);
        else unresolved.push(`${plugin.displayName}: ${inspection?.summary ?? 'not inspected'}${inspection?.nextAction ? ` → ${inspection.nextAction}` : ''}`);
    }
    if (!selected.length) unresolved.push('No harness is selected → run `ptbk init --harness <id>`');

    const tasksDirectory = configBefore ? setting<string>(configBefore, 'paths.tasks') : 'tasks';
    const agentsDirectory = configBefore ? setting<string>(configBefore, 'paths.agents') : 'agents';
    const tracePolicy = state.traces ?? { commit: false, ignoreVideos: true, recordVideo: true };
    const createdManifest = installation === 'local' && !(await pathExists(join(root, 'package.json')));
    const ignore = await ensureRuntimeIgnore(root, createdManifest || (await pathExists(join(root, 'node_modules'))) ? ['node_modules/'] : []);
    if (ignore) createdPaths.push(ignore);
    const savedPolicy = configBefore ? { commit: setting<boolean>(configBefore, 'traces.commit'), ignoreVideos: setting<boolean>(configBefore, 'traces.ignoreVideos') } : undefined;
    const traceIgnore = await ensureTraceIgnoreRules(root, savedPolicy && configBefore?.raw.traces ? savedPolicy : tracePolicy);
    if (traceIgnore) createdPaths.push(traceIgnore);
    // Default roles first: a missing Chatter's initial TEAM covers the completed role set.
    for (const path of await ensureDefaultRoles(root, agentsDirectory)) createdPaths.push(path);
    for (const path of await ensureCoreAgents(root, agentsDirectory)) createdPaths.push(path);
    for (const path of await ensureTemplates(root, tasksDirectory)) createdPaths.push(path);
    await ensureDirectory(join(root, tasksDirectory));
    await ensureDirectory(join(root, 'specs'));
    await ensureDirectory(join(root, 'traces'));
    if (fresh && !(await pathExists(join(root, 'README.md')))) {
        await writeFile(join(root, 'README.md'), sampleReadme({ name: project.name }));
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
        if (await ensureManifest(root, project.name, state.saveCheck === 'npm run check' && fresh ? { check: 'ptbk lint' } : {})) createdPaths.push(join(root, 'package.json'));
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
    const existingValidation = await validateCheckCommand(root, check === undefined ? undefined : check, context.env);
    if (existingValidation.ok) {
        alreadyReady.push(`Check: ${check}`);
        const supplied = option<string>(context, 'check');
        if (supplied && supplied !== check) notes.push(`Check override for this run only: ${supplied}`);
    }
    if (state.saveCheck !== undefined) {
        const validation = await validateCheckCommand(root, state.saveCheck, context.env);
        if (!validation.ok) unresolved.push(`Check \`${state.saveCheck}\`: ${validation.reason}`);
        changed.push(`Check: ${state.saveCheck}`);
        check = state.saveCheck;
    } else if (!existingValidation.ok) {
        unresolved.push(`Project check not configured${flag(context, 'defer-check') ? ' (deferred)' : ''} → \`ptbk init --check "<command>"\``);
    }
    const instructions = await ensureProjectInstructions(root, project.name, check);
    if (instructions) createdPaths.push(instructions);

    // ptbk.json: selected harnesses, bootstrap routing, browser, check, traces, initialization marker.
    const rawConfig = (await readProjectConfigFile(project)).raw;
    const routingHarness = rawConfig.routing && typeof rawConfig.routing === 'object' ? (rawConfig.routing as Record<string, unknown>).harness : undefined;
    const usableSelected = selected.filter((id) => state.inspections.get(id)?.usable);
    const settingsChanges: Record<string, unknown> = {};
    if (!routingHarness && (usableSelected[0] ?? selected[0])) settingsChanges['routing.harness'] = usableSelected[0] ?? selected[0];
    if (state.saveCheck !== undefined) settingsChanges['execution.check'] = state.saveCheck;
    if (!rawConfig.browser || option<string>(context, 'browser-profile') !== undefined) settingsChanges['browser.profile'] = state.browserProfile ?? 'global';
    if (!rawConfig.browser || option<string>(context, 'browser-mode') !== undefined) settingsChanges['browser.mode'] = state.browserMode ?? 'headless';
    for (const [key, value] of [
        ['traces.commit', tracePolicy.commit],
        ['traces.ignoreVideos', tracePolicy.ignoreVideos],
        ['traces.recordVideo', tracePolicy.recordVideo],
    ] as const) {
        if (getPath(rawConfig, key) === undefined) settingsChanges[key] = value;
    }
    const harnessChanges: Record<string, { enabled: boolean }> = {};
    const configured = configBefore ? enabledHarnesses(configBefore) : [];
    for (const id of selected) harnessChanges[id] = { enabled: true };
    for (const id of configured) if (!selected.includes(id)) harnessChanges[id] = { enabled: false };
    if (await updateProjectConfig(project, { settings: settingsChanges, harnesses: harnessChanges })) createdPaths.push(project.configPath);

    // The first task: one ordinary Expert task referring to the preserved specification, never duplicated.
    const timeZone = setting<string>(await loadSettings(project, { env: context.env }), 'timezone');
    const marker = ((await readProjectConfigFile(project)).raw.initialized ?? {}) as { starterTask?: string; installation?: string; engineVersion?: string };
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
    const effectiveInstallation = installation === 'existing' ? (marker.installation ?? 'local') : installation;
    if (firstTask || !marker.engineVersion || marker.installation !== effectiveInstallation) {
        const raw = (await readProjectConfigFile(project)).raw;
        raw.initialized = { ...(raw.initialized as object | undefined), engineVersion: marker.engineVersion ?? ENGINE_VERSION, ...(firstTask ? { starterTask: firstTask.title } : {}), installation: effectiveInstallation };
        await writeFile(project.configPath, `${JSON.stringify(raw, null, 4)}\n`);
        createdPaths.push(project.configPath);
    }
    for (const path of createdPaths) {
        const label = toProjectRelative(root, path);
        if (!changed.includes(label)) changed.push(label);
    }

    // Commit authorized setup artifacts only (never unrelated changes), with the first task's ID.
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

    // Readiness from the saved settings the service will use.
    project = projectAt(root);
    const readiness = await assessReadiness(project, await loadSettings(project, { env: context.env }), context.env);
    for (const problem of readiness.problems) if (!unresolved.some((item) => item.startsWith(problem.message.slice(0, 30)))) unresolved.push(`${problem.message} → ${problem.action}`);
    const ready = readiness.ready && !unresolved.length;
    return { outcome: ready ? 'ready' : 'incomplete', project, changed, alreadyReady, unresolved, notes, commit: commitSha, firstTask };
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
        const persistent = setting<boolean>(settings, 'service.persist');
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
    const remote = snapshot?.connection.remote;
    const serviceLine = running
        ? `${service.kind === 'started' ? 'running in the background' : 'already running (reused)'} (PID ${snapshot!.service.pid})${local ? ` · local ${local}` : ''}${remote && remote.state !== 'disabled' ? ` · remote access ${remote.state}` : ''}${snapshot!.service.commitMode === 'no-commit' ? ' · no-commit mode' : ''}`
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
    const first = result.firstTask ? `{{${result.firstTask.title}}} → Expert (${toProjectRelative(root, result.firstTask.path)})` : undefined;
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
    row('Setup', `${result.changed.length ? `${result.changed.length} change${result.changed.length === 1 ? '' : 's'}` : 'nothing to change'}${result.commit ? ` committed ${result.commit.slice(0, 8)} (PTBK: setup)` : ''}${result.alreadyReady.length ? style.muted(` · ${result.alreadyReady.length} already ready`) : ''}`);
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
    if (flag(context, 'start') === false && (context.explicit.has('tunnel') || context.explicit.has('port') || context.explicit.has('server'))) {
        throw usageError('--no-start conflicts with service options (--tunnel/--no-tunnel, --port, --no-server).', 'init');
    }
    let result: InitResult;
    try {
        result = await initializeProject(context);
    } catch (error) {
        if (error instanceof WizardCancelled) {
            context.terminal.write(`${context.terminal.style.warning('Initialization cancelled.')} Completed steps were kept and nothing was started; run \`ptbk init\` to resume.\n`);
            return EXIT.incomplete;
        }
        throw error;
    }
    if (result.outcome === 'updated-engine') return EXIT.success;
    let service: StartOutcome | undefined;
    if (result.outcome === 'ready' && result.project) {
        service = flag(context, 'start') === false ? { kind: 'skipped', reason: 'not started (--no-start)' } : await startService(context, result.project);
    }
    const success = result.outcome === 'ready' && (service?.kind === 'started' || service?.kind === 'reused');
    if (success) await celebrate(context.terminal, result.firstTask ? 'All set — Expert starts on your project in the background.' : 'All set — your agenda is running in the background.');
    renderInitSummary(context, { result, service });
    if (result.outcome !== 'ready') return EXIT.incomplete;
    return service?.kind === 'failed' ? EXIT.incomplete : EXIT.success;
}
