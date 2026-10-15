import { join } from 'node:path';
import { pathExists } from '../common/fs.js';
import { harnessPlugin } from '../harness/registry.js';
import type { HarnessInspection } from '../harness/types.js';
import { AgentCatalog, learningPolicyOf } from './agents.js';
import { validateCheckCommand } from './checks.js';
import { enabledHarnesses, setting, type EffectiveSettings } from './config.js';
import { ignoredPaths, inspectGit } from './git.js';
import type { Project } from './workspace.js';

/**
 * One missing or invalid prerequisite of ready-to-start operation.
 *
 * @private readiness
 */
export type ReadinessProblem = {
    /** Area of the problem. */
    readonly area: 'git' | 'configuration' | 'agents' | 'harness' | 'check' | 'runtime';
    /** What is missing. */
    readonly message: string;
    /** Concrete repair action. */
    readonly action: string;
};

/**
 * Readiness of a project for plain `ptbk start`.
 *
 * @private readiness
 */
export type Readiness = {
    readonly ready: boolean;
    readonly problems: readonly ReadinessProblem[];
    /** Inspections of the enabled harnesses. */
    readonly harnesses: readonly HarnessInspection[];
};

/**
 * Assesses readiness from the saved settings a new start will use (never runs checks or models).
 *
 * @private readiness
 */
export async function assessReadiness(project: Project, settings: EffectiveSettings & { fileExists?: boolean }, env: NodeJS.ProcessEnv = process.env): Promise<Readiness> {
    const problems: ReadinessProblem[] = [];
    const gitInfo = await inspectGit(project.root);
    if (gitInfo.state !== 'repository') {
        problems.push({ area: 'git', message: gitInfo.state === 'missing-git' ? 'Git is not installed or not on PATH.' : `The project is not in a usable Git working tree (${gitInfo.state}).`, action: 'Run `ptbk init`.' });
    }
    if (settings.fileExists === false) problems.push({ area: 'configuration', message: 'ptbk.json is missing.', action: 'Run `ptbk init`.' });
    for (const diagnostic of settings.diagnostics.filter((item) => item.severity === 'error')) {
        problems.push({ area: 'configuration', message: `${diagnostic.location}: ${diagnostic.message}`, action: 'Fix ptbk.json.' });
    }
    const agentsDirectory = setting<string>(settings, 'paths.agents');
    for (const core of ['adam', 'manager', 'teacher']) {
        if (!(await pathExists(join(project.root, agentsDirectory, '.core', `${core}.book`)))) {
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
    const harnesses: HarnessInspection[] = [];
    const enabled = enabledHarnesses(settings);
    if (!enabled.length) problems.push({ area: 'harness', message: 'No harness is selected for this project.', action: 'Run `ptbk init` and select at least one harness.' });
    for (const id of enabled) {
        const plugin = harnessPlugin(id);
        if (!plugin) {
            problems.push({ area: 'harness', message: `Unknown harness "${id}" in ptbk.json.`, action: 'Remove it or use a supported identifier.' });
            continue;
        }
        const inspection = await plugin.inspect({ projectRoot: project.root, env, settings: settings.harnesses[id] });
        harnesses.push(inspection);
        if (!inspection.usable) problems.push({ area: 'harness', message: `${plugin.displayName}: ${inspection.summary}`, action: inspection.nextAction ?? `Run \`ptbk init\` to finish ${plugin.displayName} setup.` });
    }
    const check = await validateCheckCommand(project.root, setting<string | null | undefined>(settings, 'execution.check'), env);
    if (!check.ok) {
        problems.push({ area: 'check', message: `Project check: ${check.reason}`, action: 'Configure it with `ptbk init --check "<command>"` or set ptbk.json execution.check.' });
    }
    if (gitInfo.state === 'repository') {
        const ignored = await ignoredPaths(project.root, [join(project.root, '.ptbk', 'state')]);
        if (!ignored.size) problems.push({ area: 'runtime', message: '.ptbk/ is not ignored by Git.', action: 'Run `ptbk init` (adds `.ptbk/` to .gitignore).' });
    }
    return { ready: problems.length === 0, problems, harnesses };
}
