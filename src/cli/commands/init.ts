import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { EXIT, PtbkError, errorMessage, usageError } from '../../common/errors.js';
import { isDirectory, pathExists, toProjectRelative } from '../../common/fs.js';
import { ENGINE_VERSION } from '../../common/version.js';
import { checkCandidates, validateCheckCommand } from '../../project/checks.js';
import { enabledHarnesses, loadSettings, readProjectConfigFile, setting, updateProjectConfig } from '../../project/config.js';
import { STARTER_TASK_ID, sampleReadme } from '../../project/defaults.js';
import { commitPaths, inspectGit } from '../../project/git.js';
import { ensureManifest, inspectLocalInstallation, installLocally, verifyGlobalAvailability } from '../../project/install.js';
import { assessReadiness, type ReadinessProblem } from '../../project/readiness.js';
import { checkForEngineUpdate, updateEngine } from '../../project/self-update.js';
import {
    ensureCoreAgents,
    ensureDefaultRoles,
    ensureGitRepository,
    ensureProjectInstructions,
    ensureRuntimeIgnore,
    ensureStarterTask,
    ensureTemplates,
    isFreshDirectory,
    prepareNestedChild,
    registerSubmodule,
    type NestedStrategy,
} from '../../project/setup.js';
import { canonicalPath, projectAt, type Project } from '../../project/workspace.js';
import { HARNESS_PLUGINS, harnessPlugin } from '../../harness/registry.js';
import { checkHarnessVersion, installHarness, loginHarness, updateHarness } from '../../harness/maintenance.js';
import type { HarnessInspection, HarnessPlugin } from '../../harness/types.js';
import { generateTaskId, newTaskPath, renderTaskBook, splitTitle } from '../../tasks/authoring.js';
import { wrap } from '../../ui/ansi.js';
import { renderPanel } from '../../ui/panels.js';
import { CANCELLED, composeText, confirm, inputLine, selectMany, selectOne, type WizardFrame } from '../../ui/prompts.js';
import { symbols } from '../../ui/terminal.js';
import { settingOverrides, validateCombinations } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';

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
    readonly commit?: string;
    readonly intentTask?: string;
};

/**
 * Raised when the user cancels the wizard (nothing further is applied).
 */
class WizardCancelled extends Error {}

/**
 * Unwraps a prompt result, turning cancellation into a wizard cancellation.
 */
function answered<T>(value: T | typeof CANCELLED): T {
    if (value === CANCELLED) throw new WizardCancelled('cancelled');
    return value;
}

/**
 * Default Chrome user-data directory of this platform.
 */
function defaultChromeProfile(): string {
    if (process.platform === 'darwin') return join(homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
    if (process.platform === 'win32') return join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'Google', 'Chrome', 'User Data');
    return join(homedir(), '.config', 'google-chrome');
}

/**
 * Wizard/unattended initialization shared by `ptbk init` and the setup step of `ptbk start`.
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
    const summary: string[] = [];
    const missingDecisions: string[] = [];
    const totalSteps = 7;
    const frame = (step: number, name: string): WizardFrame => ({ title: options.fromStart ? 'ptbk start · setup' : 'ptbk init', step: `Step ${step} of ${totalSteps} · ${name}`, summary });
    const say = (text: string): void => {
        if (!terminal.pretty) terminal.write(`${text}\n`);
        else terminal.write(`  ${text}\n`);
    };
    if (!terminal.pretty) terminal.write(`ptbk init (ptbk ${ENGINE_VERSION})\n`);

    // 1. Self-update of the invoked installation (separate, earlier decision).
    const selfUpdate = option<string>(context, 'self-update');
    if (!options.fromStart && (interactive || selfUpdate === 'yes') && selfUpdate !== 'no') {
        const check = await checkForEngineUpdate();
        if (check.newer && check.latest) {
            let update = selfUpdate === 'yes';
            if (selfUpdate === undefined) {
                update = answered(
                    await confirm(terminal, {
                        frame: frame(1, 'Promptbook version'),
                        question: `ptbk ${check.latest} is available (running ${check.current}, ${check.installation.scope} installation at ${check.installation.root}). Update this installation first?`,
                        defaultYes: true,
                        yesLabel: `Yes, update to ${check.latest}`,
                        noLabel: `No, continue with ${check.current}`,
                    }),
                );
            }
            if (update) {
                for (;;) {
                    try {
                        const message = await updateEngine(check, (line) => terminal.pretty && terminal.write(style.muted(`    ${line}\n`)));
                        say(`${style.success(marks.ok)} ${message} Run the command again to continue with the new version.`);
                        return { outcome: 'updated-engine', changed: [message], alreadyReady, unresolved };
                    } catch (error) {
                        if (!interactive) throw error;
                        const choice = answered(
                            await selectOne(terminal, {
                                frame: frame(1, 'Promptbook version'),
                                question: `The update failed: ${errorMessage(error)}`,
                                choices: [
                                    { value: 'retry', label: 'Retry the update' },
                                    { value: 'continue', label: `Continue with ${check.current}` },
                                ],
                                defaultValue: 'continue',
                            }),
                        );
                        if (choice === 'continue') break;
                    }
                }
            }
        } else if (check.unknownReason && interactive) {
            summary.push(`Update check skipped: ${check.unknownReason}`);
        }
    }

    // 2. Destination.
    const base = resolve(context.cwd, options.projectRoot ?? option<string>(context, 'path') ?? '.');
    let root = base;
    let nested: { strategy: NestedStrategy; parentRoot: string; url?: string } | undefined;
    for (;;) {
        if (options.projectRoot) root = base;
        else if (option<string>(context, 'subfolder')) root = resolve(base, option<string>(context, 'subfolder')!);
        else if (context.explicit.has('path') || !interactive) root = base;
        else {
            const destination = answered(
                await selectOne(terminal, {
                    frame: frame(2, 'Destination'),
                    question: 'Where should Promptbook be initialized?',
                    choices: [
                        { value: 'current', label: 'Current directory', description: base },
                        { value: 'subfolder', label: 'New subfolder', description: 'create a new project folder here' },
                    ],
                    defaultValue: 'current',
                    escapeLabel: 'Esc cancel',
                }),
            );
            if (destination === 'subfolder') {
                const name = answered(
                    await inputLine(terminal, {
                        frame: frame(2, 'Destination'),
                        question: 'Name (or relative path) of the new folder:',
                        validate: (value) => (!value ? 'Enter a folder name.' : undefined),
                    }),
                );
                root = resolve(base, name);
            } else root = base;
        }
        // A new child folder inside an existing Git working tree needs an explicit versioning boundary.
        const newFolder = root !== base || !(await isDirectory(root));
        const ancestor = (await isDirectory(root)) ? root : dirname(root);
        const enclosing = await inspectGit((await isDirectory(ancestor)) ? ancestor : base);
        if (newFolder && enclosing.state === 'repository' && resolve(enclosing.root) !== root && (!(await isDirectory(root)) || (await isFreshDirectory(root)))) {
            let strategy = option<NestedStrategy>(context, 'nested');
            if (!strategy && interactive) {
                const choice = answered(
                    await selectOne(terminal, {
                        frame: frame(2, 'Versioning boundary'),
                        question: `${root} is inside the Git repository ${enclosing.root}. How should the new project be versioned?`,
                        choices: [
                            { value: 'back', label: 'Go back', description: 'choose another destination; nothing changes' },
                            { value: 'ignored', label: 'Independent, ignored project', description: 'parent .gitignore ignores the folder; the child gets its own repository' },
                            { value: 'submodule', label: 'Git submodule', description: 'needs a remote URL for later checkout' },
                        ],
                        defaultValue: 'back',
                    }),
                );
                if (choice === 'back') {
                    if (options.projectRoot || option<string>(context, 'subfolder') || context.explicit.has('path')) throw new WizardCancelled('back');
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
                url = answered(await inputLine(terminal, { frame: frame(2, 'Versioning boundary'), question: 'Remote URL of the child repository (used by `git submodule` for later checkout):' }));
            }
            if (strategy === 'submodule' && !url) missingDecisions.push('--submodule-url <url> (required for --nested submodule)');
            nested = { strategy, parentRoot: enclosing.root, url };
        }
        break;
    }
    summary.push(`Destination: ${root}`);
    const fresh = !(await isDirectory(root)) || (await isFreshDirectory(root));

    // 3. Intent (fresh destinations only).
    let intent = option<string>(context, 'intent');
    const intentFile = option<string>(context, 'intent-file');
    if (intentFile) intent = await readFile(resolve(context.cwd, intentFile), 'utf8');
    if (intent !== undefined && !fresh) throw usageError('--intent applies only to a fresh, empty destination; existing projects keep their purpose.', 'init');
    if (fresh && intent === undefined && interactive && !options.fromStart) {
        const value = answered(
            await composeText(terminal, {
                frame: frame(3, 'Intent'),
                question: 'What should this project achieve?',
                hint: 'Expert will shape the project from this intent and start the agenda. Leave it empty for a sample project (no model call).',
                placeholder: 'e.g. A small website listing local bird species, updated weekly…',
            }),
        );
        intent = value.trim() || undefined;
    }
    if (intent) summary.push('Intent: provided');

    // Unattended decisions that are still missing fail before any change.
    let project = projectAt(root);
    const configBefore = (await pathExists(project.configPath)) ? await loadSettings(project, { env: context.env }) : undefined;
    const localBefore = await inspectLocalInstallation(root);
    const rememberedInstallation = ((configBefore?.raw.initialized ?? {}) as { installation?: 'local' | 'global' }).installation;
    const installationChoice = option<'local' | 'global'>(context, 'installation') ?? (rememberedInstallation === 'global' ? 'global' : undefined);
    if (!interactive && !localBefore.usable && !localBefore.declaredIn && !installationChoice) missingDecisions.push('--installation local|global');
    const harnessFlags = option<string[]>(context, 'harness');
    for (const id of harnessFlags ?? []) if (!harnessPlugin(id)) throw usageError(`Unknown harness "${id}". Supported: ${HARNESS_PLUGINS.map((plugin) => plugin.id).join(', ')}.`, 'init');
    const configuredHarnesses = configBefore ? enabledHarnesses(configBefore) : [];
    if (!interactive && !harnessFlags && !flag(context, 'no-harness') && !configuredHarnesses.length) missingDecisions.push('--harness <id> (repeatable) or --no-harness');
    if (missingDecisions.length) {
        throw new PtbkError('Initialization needs decisions that were not supplied.', {
            kind: 'incomplete',
            project: root,
            reason: missingDecisions.map((decision) => `missing ${decision}`).join('\n'),
            effect: 'Nothing was changed.',
            next: ['Supply the listed flags, or run `ptbk init` in an interactive terminal.'],
        });
    }

    // 4. Git preflight (explicit init authorizes creating a repository; nested strategies are explicit).
    const createdPaths: string[] = [];
    const parentChanges: string[] = [];
    if (nested) {
        const prepared = await prepareNestedChild({ parentRoot: nested.parentRoot, childRoot: root, strategy: nested.strategy, submoduleUrl: nested.url });
        parentChanges.push(...prepared.parentChanges);
        changed.push(`Child repository created (${nested.strategy === 'ignored' ? 'ignored by the parent' : 'to be registered as a submodule'})`);
    }
    const repository = await ensureGitRepository(root);
    // Use the canonical form Git reports (symlinked temp folders, Windows short names).
    root = canonicalPath(root);
    project = projectAt(root);
    if (repository.created) changed.push('Git repository initialized');
    else alreadyReady.push(`Git repository ${repository.repositoryRoot}`);

    // 5. Installation scope.
    let check: string | undefined = configBefore ? (setting<string | null | undefined>(configBefore, 'execution.check') ?? undefined) : undefined;
    let installation: 'local' | 'global' | 'existing' = 'existing';
    if (localBefore.usable) alreadyReady.push(`ptbk ${localBefore.installedVersion} installed locally (${localBefore.declaredIn})`);
    else if (localBefore.declaredIn) installation = 'local';
    else {
        installation =
            installationChoice ??
            answered(
                await selectOne(terminal, {
                    frame: frame(4, 'Installation'),
                    question: 'How should this project run Promptbook?',
                    choices: [
                        { value: 'local' as const, label: "Install Promptbook locally in this project's dependencies", description: `ptbk@${ENGINE_VERSION} (recommended)` },
                        { value: 'global' as const, label: 'Use the global CLI', description: 'no project dependency' },
                    ],
                    defaultValue: 'local',
                }),
            );
    }
    summary.push(`Installation: ${installation === 'existing' ? 'existing local dependency' : installation}`);

    // 6. Harnesses: selection, global installation, native login, updates.
    let selected: string[];
    if (harnessFlags) selected = [...new Set(harnessFlags)];
    else if (flag(context, 'no-harness')) selected = [];
    else if (configuredHarnesses.length) {
        selected = configuredHarnesses;
        alreadyReady.push(`Harnesses configured: ${selected.join(', ')}`);
    } else {
        selected = answered(
            await selectMany(terminal, {
                frame: frame(5, 'Harnesses'),
                question: 'Which harnesses should run this project? (installed globally, shared with other projects)',
                choices: HARNESS_PLUGINS.map((plugin) => ({ value: plugin.id, label: plugin.displayName, featured: plugin.featured, description: plugin.featured ? undefined : plugin.npmPackage })),
                initial: [],
                noneLabel: 'None selected (setup stays incomplete)',
            }),
        );
    }
    const inspections = new Map<string, HarnessInspection>();
    const harnessContext = (_plugin: HarnessPlugin): { projectRoot: string; env: NodeJS.ProcessEnv } => ({ projectRoot: root, env: context.env });
    for (const id of [...selected]) {
        const plugin = harnessPlugin(id)!;
        let inspection = await plugin.inspect(harnessContext(plugin));
        if (!inspection.installed) {
            const install = interactive
                ? answered(await confirm(terminal, { frame: frame(5, plugin.displayName), question: `${plugin.displayName} is not installed. Install it globally${plugin.npmPackage ? ` (npm install --global ${plugin.npmPackage})` : ''}?`, defaultYes: true }))
                : flag(context, 'install-harnesses') === true;
            if (install) {
                say(`Installing ${plugin.displayName}…`);
                const result = await installHarness(plugin, harnessContext(plugin), (line) => terminal.pretty && terminal.write(style.muted(`    ${line}\n`)));
                say(`${result.outcome === 'installed' ? style.success(marks.ok) : style.error(marks.fail)} ${result.diagnostic}`);
                if (result.outcome === 'installed') changed.push(`Installed ${plugin.displayName} globally`);
                inspection = await plugin.inspect(harnessContext(plugin));
            }
        }
        while (inspection.installed && inspection.authenticated === false && interactive) {
            const choice = answered(
                await selectOne(terminal, {
                    frame: frame(5, plugin.displayName),
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
                const result = await loginHarness(plugin, harnessContext(plugin));
                say(`${result.outcome === 'authenticated' ? style.success(marks.ok) : style.warning(marks.warn)} ${result.diagnostic}`);
            } else if (choice === 'remove') {
                selected = selected.filter((item) => item !== id);
                break;
            } else if (choice === 'defer') break;
            inspection = await plugin.inspect(harnessContext(plugin));
        }
        if (!selected.includes(id)) continue;
        inspections.set(id, inspection);
        if (inspection.usable) alreadyReady.push(`${plugin.displayName}: ${inspection.summary}`);
        else unresolved.push(`${plugin.displayName}: ${inspection.summary}${inspection.nextAction ? ` → ${inspection.nextAction}` : ''}`);
    }
    if (!selected.length) unresolved.push('No harness is selected → run `ptbk init --harness <id>`');
    summary.push(`Harnesses: ${selected.length ? selected.map((id) => harnessPlugin(id)!.displayName).join(', ') : 'none'}`);
    const outdated: Array<{ plugin: HarnessPlugin; inspection: HarnessInspection; current?: string; latest?: string }> = [];
    // Version checks only matter when an update decision can be made (interactive, or explicitly requested).
    const canDecideUpdates = interactive || option<string>(context, 'update-harnesses') === 'update';
    for (const id of canDecideUpdates ? selected : []) {
        const inspection = inspections.get(id);
        if (!inspection?.installed) continue;
        const plugin = harnessPlugin(id)!;
        const version = await checkHarnessVersion(plugin, inspection, harnessContext(plugin));
        if (version.outcome === 'outdated') outdated.push({ plugin, inspection, current: version.current, latest: version.latest });
    }
    if (outdated.length) {
        let toUpdate: typeof outdated = [];
        const decision = option<string>(context, 'update-harnesses');
        if (decision === 'update') toUpdate = outdated;
        else if (decision === undefined && interactive) {
            if (outdated.length === 1) {
                const item = outdated[0]!;
                if (answered(await confirm(terminal, { frame: frame(5, 'Harness updates'), question: `${item.plugin.displayName} ${item.current} is outdated (${item.latest} available; shared global installation). Update it?`, defaultYes: true }))) toUpdate = outdated;
            } else {
                const choice = answered(
                    await selectOne(terminal, {
                        frame: frame(5, 'Harness updates'),
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
                    const ids = answered(
                        await selectMany(terminal, { frame: frame(5, 'Harness updates'), question: 'Update which harnesses?', choices: outdated.map((item) => ({ value: item.plugin.id, label: `${item.plugin.displayName} ${item.current} → ${item.latest}` })), initial: [] }),
                    );
                    toUpdate = outdated.filter((item) => ids.includes(item.plugin.id));
                }
            }
        }
        for (const item of toUpdate) {
            say(`Updating ${item.plugin.displayName}…`);
            const result = await updateHarness(item.plugin, item.inspection, harnessContext(item.plugin));
            say(`${result.outcome === 'updated' || result.outcome === 'current' ? style.success(marks.ok) : style.warning(marks.warn)} ${result.diagnostic}`);
            if (result.outcome === 'updated') changed.push(result.diagnostic);
        }
        for (const item of outdated.filter((candidate) => !toUpdate.includes(candidate))) alreadyReady.push(`${item.plugin.displayName} kept at ${item.current}`);
    }

    // 7. Browser (independent of harness logins).
    const rawConfig = (await readProjectConfigFile(project)).raw;
    const browserConfigured = Boolean(rawConfig.browser);
    let browserProfile = option<string>(context, 'browser-profile');
    let browserMode = option<'headless' | 'headful'>(context, 'browser-mode');
    if (!browserConfigured && interactive && !browserProfile) {
        const choice = answered(
            await selectOne(terminal, {
                frame: frame(6, 'Project browser'),
                question: 'Which browser profile should agents share for websites in this project?',
                choices: [
                    { value: 'isolated', label: 'Isolated project profile', description: 'persistent profile in .ptbk/, separate from your browser' },
                    { value: 'other', label: 'Another existing profile', description: 'e.g. a profile shared by several projects' },
                    { value: 'user', label: "Your Chrome profile", description: 'reuses your logged-in sessions' },
                ],
                defaultValue: 'isolated',
            }),
        );
        if (choice === 'other') browserProfile = answered(await inputLine(terminal, { frame: frame(6, 'Project browser'), question: 'Path of the browser profile directory:' }));
        else if (choice === 'user') {
            const ok = answered(await confirm(terminal, { frame: frame(6, 'Project browser'), question: `Agents will act with every session in ${defaultChromeProfile()}, and their actions affect that profile. Use it?`, defaultYes: false }));
            browserProfile = ok ? defaultChromeProfile() : 'isolated';
        } else browserProfile = 'isolated';
        browserMode = answered(
            await selectOne(terminal, {
                frame: frame(6, 'Project browser'),
                question: 'Browser visibility:',
                choices: [
                    { value: 'headless' as const, label: 'Headless', description: 'no window (servers, background work)' },
                    { value: 'headful' as const, label: 'Visible window', description: 'lets you watch and log in on desktops' },
                ],
                defaultValue: 'headless',
            }),
        );
    }

    // Write setup artifacts (only missing ones).
    const tasksDirectory = configBefore ? setting<string>(configBefore, 'paths.tasks') : 'tasks';
    const agentsDirectory = configBefore ? setting<string>(configBefore, 'paths.agents') : 'agents';
    const createdManifest = installation === 'local' && !(await pathExists(join(root, 'package.json')));
    const ignore = await ensureRuntimeIgnore(root, createdManifest || (await pathExists(join(root, 'node_modules'))) ? ['node_modules/'] : []);
    if (ignore) createdPaths.push(ignore);
    for (const path of await ensureCoreAgents(root, agentsDirectory)) createdPaths.push(path);
    for (const path of await ensureDefaultRoles(root, agentsDirectory)) createdPaths.push(path);
    for (const path of await ensureTemplates(root, tasksDirectory)) createdPaths.push(path);
    if (fresh) {
        const readme = join(root, 'README.md');
        if (!(await pathExists(readme))) {
            await writeFile(readme, sampleReadme({ name: project.name, intent }));
            createdPaths.push(readme);
        }
    }

    // Check decision (validated, never an unconditional pass).
    const suppliedCheck = option<string>(context, 'check');
    const existingValidation = await validateCheckCommand(root, check === undefined ? undefined : check, context.env);
    let saveCheck: string | undefined;
    if (existingValidation.ok) {
        alreadyReady.push(`Check: ${check}`);
        if (suppliedCheck && suppliedCheck !== check) summary.push(`Check override for this run only: ${suppliedCheck}`);
    } else if (suppliedCheck) {
        saveCheck = suppliedCheck;
    } else if (fresh) {
        saveCheck = installation === 'global' ? 'ptbk lint' : 'npm run check';
    } else if (interactive) {
        const candidates = await checkCandidates(root, context.env);
        for (;;) {
            const choice = answered(
                await selectOne(terminal, {
                    frame: frame(7, 'Validation'),
                    question: check !== undefined ? `The configured check is not usable: ${existingValidation.ok ? '' : existingValidation.reason} Choose the project check:` : 'Which command validates this project? (it must pass before each task is accepted)',
                    choices: [
                        ...candidates.map((candidate) => ({ value: candidate.command, label: candidate.command, description: candidate.description })),
                        { value: '__custom', label: 'Enter a custom command' },
                        { value: '__defer', label: 'Defer (setup stays incomplete)' },
                    ],
                    defaultValue: candidates[0]?.command ?? '__custom',
                }),
            );
            if (choice === '__defer') break;
            const command = choice === '__custom' ? answered(await inputLine(terminal, { frame: frame(7, 'Validation'), question: 'Check command (runs in the project directory):' })) : choice;
            const validation = await validateCheckCommand(root, command, context.env);
            if (!validation.ok) {
                say(style.warning(`${marks.warn} ${validation.reason}`));
                continue;
            }
            if (answered(await confirm(terminal, { frame: frame(7, 'Validation'), question: `Save \`${command}\` as ptbk.json execution.check?`, defaultYes: true }))) {
                saveCheck = command;
                break;
            }
        }
    }
    if (installation === 'local' || createdManifest) {
        if (await ensureManifest(root, project.name, saveCheck === 'npm run check' && fresh ? { check: 'ptbk lint' } : {})) createdPaths.push(join(root, 'package.json'));
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
        else summary.push(global.note);
    }
    if (saveCheck !== undefined) {
        const validation = await validateCheckCommand(root, saveCheck, context.env);
        if (!validation.ok) unresolved.push(`Check \`${saveCheck}\`: ${validation.reason}`);
        changed.push(`Check: ${saveCheck}`);
        check = saveCheck;
    } else if (!existingValidation.ok) {
        unresolved.push(`Project check not configured${flag(context, 'defer-check') ? ' (deferred)' : ''} → \`ptbk init --check "<command>"\``);
    }
    const instructions = await ensureProjectInstructions(root, project.name, check);
    if (instructions) createdPaths.push(instructions);

    // ptbk.json: selected harnesses, bootstrap routing, browser, check, initialization marker.
    const routingHarness = rawConfig.routing && typeof rawConfig.routing === 'object' ? (rawConfig.routing as Record<string, unknown>).harness : undefined;
    const usableSelected = selected.filter((id) => inspections.get(id)?.usable);
    const settingsChanges: Record<string, unknown> = {};
    if (!routingHarness && (usableSelected[0] ?? selected[0])) settingsChanges['routing.harness'] = usableSelected[0] ?? selected[0];
    if (saveCheck !== undefined) settingsChanges['execution.check'] = saveCheck;
    if (!browserConfigured || option<string>(context, 'browser-profile') !== undefined) settingsChanges['browser.profile'] = browserProfile ?? 'isolated';
    if (!browserConfigured || option<string>(context, 'browser-mode') !== undefined) settingsChanges['browser.mode'] = browserMode ?? 'headless';
    const harnessChanges: Record<string, { enabled: boolean }> = {};
    for (const id of selected) harnessChanges[id] = { enabled: true };
    for (const id of configuredHarnesses) if (!selected.includes(id)) harnessChanges[id] = { enabled: false };
    const configChanged = await updateProjectConfig(project, { settings: settingsChanges, harnesses: harnessChanges });
    if (configChanged) createdPaths.push(project.configPath);

    // First runnable task (or Expert's intent task), never duplicated.
    const timeZone = setting<string>(await loadSettings(project, { env: context.env }), 'timezone');
    const marker = ((await readProjectConfigFile(project)).raw.initialized ?? {}) as { starterTask?: string };
    let intentTask: string | undefined;
    if (intent && !marker.starterTask) {
        const { title, description } = splitTitle(intent);
        const id = generateTaskId(title);
        intentTask = await newTaskPath(join(root, tasksDirectory), `create ${title}`, Date.now(), timeZone);
        await writeFile(intentTask, renderTaskBook({ title: `Create the project: ${title}`, description: [intent.trim(), description ? '' : '', 'Adapt the prepared workspace to this intent: project files, agents and their goals, a meaningful project check, and the initial tasks.'].filter(Boolean).join('\n\n'), id, commitments: ['TASK AGENT @Expert', 'TASK ORIGIN initialization intent'] }), { flag: 'wx' });
        createdPaths.push(intentTask);
        const raw = (await readProjectConfigFile(project)).raw;
        raw.initialized = { engineVersion: ENGINE_VERSION, starterTask: id, installation: installation === 'existing' ? 'local' : installation };
        await writeFile(project.configPath, `${JSON.stringify(raw, null, 4)}\n`);
    } else {
        const starter = await ensureStarterTask({ root, tasksDirectory, agentsDirectory, timeZone, alreadyCreated: Boolean(marker.starterTask) });
        if (starter) createdPaths.push(starter);
        const effectiveInstallation = installation === 'existing' ? 'local' : installation;
        if (!marker.starterTask || (marker as { installation?: string }).installation !== effectiveInstallation) {
            const raw = (await readProjectConfigFile(project)).raw;
            raw.initialized = { ...(raw.initialized as object | undefined), engineVersion: (raw.initialized as { engineVersion?: string } | undefined)?.engineVersion ?? ENGINE_VERSION, starterTask: marker.starterTask ?? STARTER_TASK_ID, installation: effectiveInstallation };
            await writeFile(project.configPath, `${JSON.stringify(raw, null, 4)}\n`);
            createdPaths.push(project.configPath);
        }
    }
    for (const path of createdPaths) {
        const label = toProjectRelative(root, path);
        if (!changed.includes(label)) changed.push(label);
    }

    // Commit authorized setup artifacts only (never unrelated changes).
    let commitSha: string | undefined;
    const uniquePaths = [...new Set(createdPaths)];
    if (uniquePaths.length) {
        if (commit) {
            try {
                const outcome = await commitPaths({ projectRoot: root, repositoryRoot: repository.repositoryRoot, paths: uniquePaths, subject: configBefore ? 'Update project setup' : 'Initialize project', temporaryDirectory: project.runtime.temporary, env: context.env });
                if (outcome.committed) commitSha = outcome.sha;
            } catch (error) {
                unresolved.push(`Setup commit failed: ${errorMessage(error)} → fix the cause and run \`ptbk init\` again (files are preserved)`);
            }
        } else {
            unresolved.push(`Setup is uncommitted (--no-commit): ${uniquePaths.map((path) => toProjectRelative(root, path)).join(', ')} → commit them before an ordinary \`ptbk start\``);
        }
    }
    if (nested?.strategy === 'submodule' && nested.url && commitSha) {
        try {
            const registered = await registerSubmodule(nested.parentRoot, root, nested.url);
            parentChanges.push(...registered);
        } catch (error) {
            unresolved.push(`Submodule registration failed: ${errorMessage(error)}`);
        }
    }
    if (parentChanges.length) summary.push(`Parent repository changes left uncommitted: ${parentChanges.map((path) => toProjectRelative(nested!.parentRoot, path) || '.').join(', ')}`);

    // Readiness from the saved settings a new start will use.
    const savedSettings = await loadSettings(project, { env: context.env });
    const readiness = await assessReadiness(project, savedSettings, context.env);
    const problems: ReadinessProblem[] = [...readiness.problems];
    for (const problem of problems) if (!unresolved.some((item) => item.startsWith(problem.message.slice(0, 30)))) unresolved.push(`${problem.message} → ${problem.action}`);
    const ready = readiness.ready && !unresolved.length;
    const tunnelNote = 'Remote access: `ptbk start` publishes the dashboard through a protected Cloudflare quick tunnel (pairing required); use `--no-tunnel` for local-only access.';
    renderInitSummary(context, { root, ready, changed, alreadyReady, unresolved, commitSha, notes: [...summary.filter((line) => line.startsWith('Parent') || line.startsWith('Check override') || line.startsWith('Update check') || line.includes('PATH')), tunnelNote], intent: Boolean(intentTask) });
    return { outcome: ready ? 'ready' : 'incomplete', project, changed, alreadyReady, unresolved, commit: commitSha, intentTask };
}

/**
 * Renders the final changed / already-ready / unresolved summary.
 */
function renderInitSummary(context: CommandContext, input: { root: string; ready: boolean; changed: readonly string[]; alreadyReady: readonly string[]; unresolved: readonly string[]; commitSha?: string; notes: readonly string[]; intent: boolean }): void {
    const { terminal } = context;
    const { style } = terminal;
    const marks = symbols(terminal.unicode);
    const next = input.ready ? (input.intent ? 'Starting the agenda with Expert’s first task…' : 'Next: ptbk start') : 'Resume with `ptbk init` after resolving the items above.';
    if (!terminal.pretty) {
        const lines = [`${input.ready ? 'Ready to start' : 'Setup incomplete'}: ${input.root}`];
        if (input.changed.length) lines.push('Changed:', ...input.changed.map((item) => `  - ${item}`));
        if (input.alreadyReady.length) lines.push('Already ready:', ...input.alreadyReady.map((item) => `  - ${item}`));
        if (input.unresolved.length) lines.push('Unresolved prerequisites:', ...input.unresolved.map((item) => `  - ${item}`));
        if (input.commitSha) lines.push(`Commit: ${input.commitSha}`);
        lines.push(...input.notes, next);
        terminal.write(`${lines.join('\n')}\n`);
        return;
    }
    const width = Math.min(terminal.columns(), 110);
    const lines: string[] = [];
    const section = (title: string, items: readonly string[], mark: string): void => {
        if (!items.length) return;
        lines.push(style.bold(title));
        for (const item of items) wrap(item, width - 8).forEach((line, index) => lines.push(`${index === 0 ? mark : ' '} ${line}`));
        lines.push('');
    };
    section('Changed', input.changed, style.success(marks.ok));
    section('Already ready', input.alreadyReady, style.muted(marks.dot));
    section('Unresolved', input.unresolved, style.error(marks.fail));
    if (input.commitSha) lines.push(style.muted(`Committed ${input.commitSha.slice(0, 8)} (PTBK: setup)`));
    for (const note of input.notes) for (const line of wrap(note, width - 4)) lines.push(style.muted(line));
    lines.push('', input.ready ? style.bold(style.success(next)) : style.warning(next));
    terminal.write(`${renderPanel({ title: input.ready ? `${marks.ok} Ready to start` : `${marks.warn} Setup incomplete`, titleRight: `ptbk ${ENGINE_VERSION}`, lines, width, tone: input.ready ? 'success' : 'attention', unicode: terminal.unicode, style }).join('\n')}\n`);
}

/**
 * `ptbk init`: prepare the project, then (for an intent) start the agenda.
 *
 * @private command
 */
export default async function init(context: CommandContext): Promise<number> {
    validateCombinations(context);
    let result: InitResult;
    try {
        result = await initializeProject(context);
    } catch (error) {
        if (error instanceof WizardCancelled) {
            context.terminal.write(`${context.terminal.style.warning('Initialization cancelled.')} Completed steps were kept; run \`ptbk init\` to resume.\n`);
            return EXIT.incomplete;
        }
        throw error;
    }
    if (result.outcome === 'updated-engine') return EXIT.success;
    if (result.outcome !== 'ready') return EXIT.incomplete;
    if (result.intentTask && result.project) {
        const { launchDaemon } = await import('../../service/launcher.js');
        const { renderServiceResult } = await import('../service-view.js');
        const overrides = settingOverrides(context);
        const persistent = overrides['service.persist'] !== false;
        const launched = await launchDaemon(result.project, { cli: overrides, persistent, env: context.env });
        const snapshot = await launched.lookup.client.request<import('../../engine/snapshot.js').ServiceSnapshot>('snapshot');
        await renderServiceResult(context, snapshot, { client: launched.lookup.client, outcome: { title: 'Agenda started', message: `Expert is creating the project from your intent (${toProjectRelative(result.project.root, result.intentTask)}).${launched.persistence ? ` ${launched.persistence.note}` : ''}`, tone: 'success' }, next: ['ptbk dashboard', 'ptbk stop'] });
    }
    return EXIT.success;
}
