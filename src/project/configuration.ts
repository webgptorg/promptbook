import { join } from 'node:path';
import { PtbkError, errorMessage } from '../common/errors.js';
import { ensureDirectory, readJsonIfExists, readTextIfExists, writeFileAtomic, writeJsonAtomic } from '../common/fs.js';
import { ENGINE_VERSION } from '../common/version.js';
import { rm } from 'node:fs/promises';
import { canonicalizeConfig, configText, parseConfigText } from './config.js';
import { commitPaths, inspectGit, isPathDirty, readAtHead } from './git.js';
import { applyConfigurationMigration, planConfigurationMigration } from './migrations.js';
import type { Project } from './workspace.js';

/**
 * Recovery record of a configuration pass in progress (crash between writing and committing).
 */
type PendingPass = { readonly version: 1; readonly kind: 'migration' | 'normalization'; readonly from?: string; readonly to?: string; readonly original: string; readonly prepared: string; readonly startedAt: string };

/**
 * Outcome of configuration maintenance.
 *
 * @private configuration coordinator
 */
export type ConfigurationMaintenance = {
    /** A committed migration pass. */
    readonly migrated?: { readonly from: string; readonly to: string; readonly commit?: string; readonly steps: readonly string[] };
    /** Committed deterministic spelling corrections. */
    readonly normalized?: { readonly commit?: string; readonly corrections: readonly string[] };
    /** Corrections kept in memory only (explicit no-commit, or ptbk.json holds someone else's uncommitted edits). */
    readonly deferred?: string;
};

/**
 * Path of the recovery record.
 */
function pendingPath(project: Project): string {
    return join(project.runtime.state, 'configuration-pass.json');
}

/**
 * Finishes or rolls back an interrupted pass: a landed commit is accepted; an unlanded prepared file is restored to
 * its original content (a failed pass never advertises an advanced version).
 */
async function recoverInterruptedPass(project: Project, repositoryRoot: string): Promise<void> {
    const pending = await readJsonIfExists<PendingPass>(pendingPath(project));
    if (!pending) return;
    const committed = await readAtHead(repositoryRoot, project.configPath);
    const working = await readTextIfExists(project.configPath);
    if (committed !== pending.prepared && working === pending.prepared) await writeFileAtomic(project.configPath, pending.original);
    await rm(pendingPath(project), { force: true });
}

/**
 * Writes and commits one prepared configuration pass (its own commit, nothing else included).
 */
async function persistPass(project: Project, repositoryRoot: string, input: { kind: PendingPass['kind']; from?: string; to?: string; original: string; prepared: string; subject: string; body: string; trailers: Readonly<Record<string, string>>; env: NodeJS.ProcessEnv; gitLock: <T>(action: () => Promise<T>) => Promise<T> }): Promise<string | undefined> {
    await ensureDirectory(project.runtime.state);
    await writeJsonAtomic(pendingPath(project), { version: 1, kind: input.kind, from: input.from, to: input.to, original: input.original, prepared: input.prepared, startedAt: new Date().toISOString() } satisfies PendingPass);
    try {
        const outcome = await input.gitLock(async () => {
            await writeFileAtomic(project.configPath, input.prepared);
            return await commitPaths({ projectRoot: project.root, repositoryRoot, paths: [project.configPath], subject: input.subject, body: input.body, trailers: input.trailers, temporaryDirectory: project.runtime.temporary, env: input.env });
        });
        await rm(pendingPath(project), { force: true });
        return outcome.committed ? outcome.sha : undefined;
    } catch (error) {
        // Never leave a partially persisted pass: restore the original and keep the work pending for a retry.
        await writeFileAtomic(project.configPath, input.original).catch(() => undefined);
        await rm(pendingPath(project), { force: true });
        throw new PtbkError(`The configuration ${input.kind} could not be committed.`, {
            kind: 'persistence',
            phase: `configuration ${input.kind}`,
            project: project.root,
            reason: error instanceof PtbkError ? (error.details.reason ?? error.message) : errorMessage(error),
            effect: 'ptbk.json was restored to its previous content; the change stays pending and is retried.',
            next: ['Fix the Git hook/signing/identity problem; ptbk retries automatically (or rerun the command).'],
        });
    }
}

/**
 * Applies required configuration evolution before affected work, as the shared coordinator of every mutating entry
 * point (engine start and reloads, init, tool management):
 *
 * - an older engine than the saved `promptbookVersion` refuses (update ptbk; the project is never downgraded);
 * - a newer engine applies the sparse ordered migration steps, canonicalizes, stamps its version and commits the
 *   whole pass once (also a version-only pass);
 * - an equal version saves deterministic spelling corrections in their own scoped commit.
 *
 * Commits are required for migrations: an explicit no-commit invocation is refused before any write. Normalization
 * under no-commit, or while ptbk.json holds uncommitted edits, stays in memory (never adopting someone's edits).
 *
 * @private configuration coordinator
 */
export async function maintainProjectConfiguration(
    project: Project,
    options: { readonly commit: boolean; readonly env?: NodeJS.ProcessEnv; readonly gitLock?: <T>(action: () => Promise<T>) => Promise<T>; readonly engineVersion?: string; readonly normalize?: boolean },
): Promise<ConfigurationMaintenance> {
    const env = options.env ?? process.env;
    const gitLock = options.gitLock ?? (async <T>(action: () => Promise<T>) => await action());
    const engineVersion = options.engineVersion ?? ENGINE_VERSION;
    const gitInfo = await inspectGit(project.root);
    if (gitInfo.state === 'repository') await recoverInterruptedPass(project, gitInfo.root);
    const original = await readTextIfExists(project.configPath);
    if (original === undefined) return {};
    const file = parseConfigText(original);
    if (file.diagnostics.length) return {};
    const plan = planConfigurationMigration(file.raw, engineVersion);
    if (plan.kind === 'older-engine') {
        throw new PtbkError(`This project was configured by ptbk ${plan.saved}; the running ptbk ${plan.engine} is older.`, {
            kind: 'unsupported',
            project: project.root,
            reason: 'An older engine never downgrades or rewrites a newer configuration.',
            effect: 'Nothing was changed; no new work starts with this engine.',
            next: [`Update ptbk to ${plan.saved} or newer (\`npm install -g ptbk@latest\`, or the project's local dependency), then rerun.`],
        });
    }
    if (plan.kind === 'invalid') throw new PtbkError('ptbk.json has an invalid promptbookVersion.', { kind: 'configuration', project: project.root, reason: plan.reason, next: ['Correct promptbookVersion in ptbk.json.'] });
    if (plan.kind === 'migrate') {
        if (!options.commit) {
            throw new PtbkError(`ptbk.json needs its configuration migration ${plan.from} → ${plan.to}, which must be committed.`, {
                kind: 'configuration',
                project: project.root,
                reason: 'This invocation forbids commits (--no-commit), and a configuration migration is never applied untracked.',
                effect: 'Nothing was changed.',
                next: ['Run any ordinary committed command once (for example `ptbk start` without --no-commit) to apply the migration, then continue.'],
            });
        }
        if (gitInfo.state !== 'repository') throw new PtbkError('The configuration migration needs a Git working tree to commit it.', { kind: 'setup', project: project.root, next: ['Run `ptbk init`.'] });
        if (await isPathDirty(gitInfo.root, project.configPath)) {
            throw new PtbkError(`ptbk.json has uncommitted edits, so its migration ${plan.from} → ${plan.to} cannot be committed on its own.`, {
                kind: 'conflict',
                project: project.root,
                reason: 'The migration commit must contain only the migration, never someone else’s uncommitted edits.',
                effect: 'Nothing was changed.',
                next: ['Commit or discard the ptbk.json edits; ptbk then migrates automatically.'],
            });
        }
        const migrated = applyConfigurationMigration(file.raw, plan);
        const canonical = canonicalizeConfig(migrated.raw);
        const prepared = configText(canonical.raw);
        const lines = [
            `Migrates ptbk.json from ${plan.from}${plan.fromBaseline ? ' (no promptbookVersion: the fixed pre-versioning baseline)' : ''} to ptbk ${plan.to}.`,
            '',
            ...(plan.steps.length ? plan.steps.map((step) => `Applied ${step.target}: ${step.title}`) : ['No registered migration steps apply; only promptbookVersion advances.']),
            ...migrated.notes.flatMap((note) => note.notes.map((text) => `- ${text}`)),
            ...(canonical.corrections.length ? ['', 'Canonical spelling:', ...canonical.corrections.map((correction) => `- ${correction.location}: ${correction.from} → ${correction.to}`)] : []),
            ...(migrated.problems.length ? ['', 'Kept for repair:', ...migrated.problems.map((problem) => `- ${problem.location}: ${problem.message}`)] : []),
        ];
        const commit = await persistPass(project, gitInfo.root, {
            kind: 'migration',
            from: plan.from,
            to: plan.to,
            original,
            prepared,
            subject: `Migrate configuration from ${plan.from} to ${plan.to}`,
            body: lines.join('\n'),
            trailers: { 'PTBK-Configuration-Migration': `${plan.from} -> ${plan.to}` },
            env,
            gitLock,
        });
        return { migrated: { from: plan.from, to: plan.to, commit, steps: plan.steps.map((step) => step.target) } };
    }
    if (options.normalize === false) return {};
    const canonical = canonicalizeConfig(file.raw);
    if (!canonical.corrections.length) return {};
    const corrections = canonical.corrections.map((correction) => `${correction.location}: ${correction.from} → ${correction.to}`);
    if (!options.commit) return { deferred: `Configuration spelling corrections are applied in memory only (--no-commit): ${corrections.join('; ')}.` };
    if (gitInfo.state !== 'repository' || (await isPathDirty(gitInfo.root, project.configPath))) {
        return { deferred: `Configuration spelling corrections wait until ptbk.json has no uncommitted edits: ${corrections.join('; ')}.` };
    }
    const commit = await persistPass(project, gitInfo.root, {
        kind: 'normalization',
        original,
        prepared: configText(canonical.raw),
        subject: 'Normalize project configuration',
        body: ['Deterministic spelling corrections (meaning unchanged):', ...corrections.map((correction) => `- ${correction}`)].join('\n'),
        trailers: {},
        env,
        gitLock,
    });
    return { normalized: { commit, corrections } };
}
