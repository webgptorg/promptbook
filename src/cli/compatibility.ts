import { PtbkError } from '../common/errors.js';
import { compareVersions } from '../common/semver.js';
import { ENGINE_VERSION, detectInstallation } from '../common/version.js';
import { interpretConfig, readProjectConfigFile, updatePolicyOf } from '../project/config.js';
import { installEngineVersion, publishedEngineVersions } from '../project/self-update.js';
import { selectCompatibleUpdate } from '../project/update-policy.js';
import type { Project } from '../project/workspace.js';
import { confirm } from '../ui/prompts.js';
import type { CommandContext } from './context.js';

/**
 * The project was configured by a newer engine: the project is never downgraded or started with an older engine.
 *
 * When the project's saved update policy (`updates`, automatic updates on by default) already allows a compatible
 * release, this installation is updated without another confirmation, interactive or not. A disabled policy can still
 * be overridden by an explicit interactive Yes; a pin or range that excludes every compatible release, an unsupported
 * installation or an unknown registry is reported as the real constraint. Either way the invocation ends and asks for
 * a rerun: the already loaded code never pretends to have changed in place.
 *
 * @private CLI compatibility gate
 */
export async function requireEngineUpdate(context: CommandContext, saved: string, project: Project): Promise<never> {
    const { terminal } = context;
    const installation = detectInstallation();
    const file = await readProjectConfigFile(project).catch(() => undefined);
    const policy = file?.exists ? updatePolicyOf(interpretConfig(file)) : { isAutoUpdateEnabled: true };
    const supported = installation.scope === 'local' || installation.scope === 'global';
    const found = supported ? await publishedEngineVersions(installation, context.env, 15_000) : { problem: `this ${installation.scope} installation cannot be updated by ptbk` };
    const compatible = (found.versions ?? []).filter((version) => (compareVersions(version, saved) ?? -1) >= 0);
    // The policy's own choice among compatible releases (a pin or range may exclude all of them).
    const allowed = selectCompatibleUpdate(ENGINE_VERSION, compatible, policy, saved);
    const update = async (version: string, how: string): Promise<never> => {
        terminal.write(`Updating this ${installation.scope} ptbk installation ${ENGINE_VERSION} → ${version} (${how})…\n`);
        await installEngineVersion(installation, version, { env: context.env, onOutput: (line) => terminal.write(`    ${line}\n`) });
        throw new PtbkError(`Updated this ${installation.scope} ptbk installation to ${version}.`, { kind: 'incomplete', effect: 'Nothing in the project was changed.', next: ['Run the same command again with the updated ptbk.'] });
    };
    if (allowed.target) await update(allowed.target, 'the project’s update policy allows it');
    // Disabled automation is not a pin: an explicit interactive decision may still update to a compatible release.
    const newest = [...compatible].sort((a, b) => compareVersions(b, a) ?? 0)[0];
    if (allowed.constraint === 'disabled' && newest && terminal.interactive) {
        const answer = await confirm(terminal, { frame: { title: 'ptbk', step: 'Update required' }, question: `This project was configured by ptbk ${saved}; this ptbk is ${ENGINE_VERSION} and automatic updates are off. Update this ${installation.scope} installation to ${newest} now?`, defaultYes: true });
        if (answer === true) await update(newest, 'confirmed');
    }
    const constraint = !supported
        ? `This ${installation.scope} installation cannot be updated by ptbk${installation.scope === 'development' ? ' (pull and rebuild the checkout)' : ''}.`
        : found.problem
          ? `Release information is unknown: ${found.problem}.`
          : !compatible.length
            ? `No published release is ${saved} or newer.`
            : allowed.constraint === 'disabled'
              ? 'Automatic updates are off (updates.isAutoUpdateEnabled false).'
              : `The update policy (updates.versionRange ${policy.versionRange ?? 'default'}) allows no compatible release: ${allowed.reason}`;
    throw new PtbkError(`This project was configured by ptbk ${saved}; the running ptbk ${ENGINE_VERSION} is older.`, {
        kind: 'unsupported',
        project: project.root,
        reason: `An older engine never downgrades or rewrites a newer configuration. ${constraint}`,
        effect: 'Nothing was started or changed.',
        next: [`Update ptbk to ${saved} or newer (\`npm install -g ptbk@latest\`, or the project's local dependency), then rerun.`],
    });
}
