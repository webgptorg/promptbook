import { join } from 'node:path';
import { pathExists } from '../common/fs.js';
import type { HarnessInspection } from '../harness/types.js';
import { HarnessPool } from '../engine/harnesses.js';
import type { ToolsView } from '../engine/snapshot.js';
import { inspectInventory } from '../tools/readiness.js';
import { AgentCatalog, learningPolicyOf } from './agents.js';
import { validateCheckCommand } from './checks.js';
import { isCheckPlaceholder, setting, type EffectiveSettings } from './config.js';
import { ignoredPaths, inspectGit } from './git.js';
import type { Project } from './workspace.js';

/**
 * One missing or invalid prerequisite.
 *
 * @private readiness
 */
export type ReadinessProblem = {
    /** Area of the problem. */
    readonly area: 'git' | 'configuration' | 'agents' | 'harness' | 'browser' | 'check' | 'runtime';
    /** What is missing. */
    readonly message: string;
    /** Concrete repair action. */
    readonly action: string;
};

/**
 * Readiness of a project.
 *
 * `ready` covers structural initialization only (Git, configuration, core agents, runtime ignore rules): an initialized
 * project starts even when its tools are missing, disabled or unusable — the running engine then waits for tools.
 *
 * @private readiness
 */
export type Readiness = {
    readonly ready: boolean;
    /** Structural problems that need (re)initialization. */
    readonly problems: readonly ReadinessProblem[];
    /** Live resource waits and nonblocking findings (tools, check placeholder, a broken real check). */
    readonly warnings: readonly ReadinessProblem[];
    /** Inspections of the enabled harness instances. */
    readonly harnesses: readonly HarnessInspection[];
    /** The shared tool inventory. */
    readonly tools: ToolsView;
};

/**
 * Assesses readiness from the saved settings a new start will use (never runs checks, models or browsers).
 *
 * @private readiness
 */
export async function assessReadiness(project: Project, settings: EffectiveSettings & { fileExists?: boolean }, env: NodeJS.ProcessEnv = process.env): Promise<Readiness> {
    const problems: ReadinessProblem[] = [];
    const warnings: ReadinessProblem[] = [];
    const gitInfo = await inspectGit(project.root);
    if (gitInfo.state !== 'repository') {
        problems.push({ area: 'git', message: gitInfo.state === 'missing-git' ? 'Git is not installed or not on PATH.' : `The project is not in a usable Git working tree (${gitInfo.state}).`, action: 'Run `ptbk init`.' });
    }
    if (settings.fileExists === false) problems.push({ area: 'configuration', message: 'ptbk.json is missing.', action: 'Run `ptbk init`.' });
    for (const diagnostic of settings.diagnostics.filter((item) => item.severity === 'error')) {
        const target = diagnostic.location.includes('tools') || diagnostic.location.startsWith('--') ? warnings : problems;
        target.push({ area: 'configuration', message: `${diagnostic.location}: ${diagnostic.message}`, action: diagnostic.location.includes('promptbookVersion') ? 'Update ptbk, then rerun.' : 'Fix ptbk.json (Fixer repairs what it can).' });
    }
    const agentsDirectory = setting<string>(settings, 'paths.agents');
    // Router may still be the former Manager in a project the migration has not converted yet.
    for (const core of ['adam', 'router', 'teacher']) {
        if (!(await pathExists(join(project.root, agentsDirectory, '.core', `${core}.book`))) && !(core === 'router' && (await pathExists(join(project.root, agentsDirectory, '.core', 'manager.book'))))) {
            problems.push({ area: 'agents', message: `The core agent ${agentsDirectory}/.core/${core}.book is missing.`, action: 'Run `ptbk init` to restore missing core agents.' });
        }
    }
    if (!problems.some((problem) => problem.area === 'agents') && gitInfo.state === 'repository') {
        const catalog = await AgentCatalog.load(project.root, agentsDirectory);
        const teacher = await catalog.resolve('@Teacher');
        if (teacher.kind === 'agent' && learningPolicyOf(teacher.definition.document).open) {
            problems.push({ area: 'agents', message: 'Teacher must end with CLOSED.', action: `Add CLOSED to ${teacher.definition.relativePath}.` });
        }
    }
    const pool = new HarnessPool(project.root, settings, env);
    const tools = await inspectInventory(project, settings, env, pool);
    for (const item of tools.items.filter((entry) => entry.isEnabled && entry.state !== 'usable')) {
        warnings.push({ area: item.type === 'HARNESS' ? 'harness' : 'browser', message: `${item.variantLabel} "${item.name}": ${item.summary}`, action: item.nextAction ?? `ptbk tool show ${item.name}` });
    }
    if (tools.waiting) warnings.push({ area: 'harness', message: `Waiting for tools: ${tools.waiting.reason}`, action: tools.waiting.action });
    const check = setting<string | null | undefined>(settings, 'execution.check');
    if (isCheckPlaceholder(check)) {
        warnings.push({ area: 'check', message: 'Real automated validation is not configured (the informational check placeholder is saved).', action: 'Set a real command in ptbk.json execution.check when the project has one.' });
    } else {
        const validation = await validateCheckCommand(project.root, check, env);
        if (!validation.ok) warnings.push({ area: 'check', message: `Project check: ${validation.reason}`, action: 'Fix ptbk.json execution.check (failing checks are repaired through ordinary work).' });
    }
    if (gitInfo.state === 'repository') {
        const ignored = await ignoredPaths(project.root, [join(project.root, '.ptbk', 'state')]);
        if (!ignored.size) problems.push({ area: 'runtime', message: '.ptbk/ is not ignored by Git.', action: 'Run `ptbk init` (adds `.ptbk/` to .gitignore).' });
    }
    const harnesses = pool.all().flatMap((entry) => (entry.tool.isEnabled && entry.inspection ? [entry.inspection] : []));
    return { ready: problems.length === 0, problems, warnings, harnesses, tools };
}
