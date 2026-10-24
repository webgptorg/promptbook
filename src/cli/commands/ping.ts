import { rm, writeFile } from 'node:fs/promises';
import { clockTime } from '../../common/time.js';
import { join } from 'node:path';
import { EXIT, PtbkError } from '../../common/errors.js';
import { ensureDirectory } from '../../common/fs.js';
import { shortId } from '../../common/ids.js';
import { enabledHarnesses, loadSettings, type ThinkingLevel } from '../../project/config.js';
import { HarnessPool } from '../../engine/harnesses.js';
import { harnessRequirement } from '../../engine/routing.js';
import { harnessPlugin } from '../../harness/registry.js';
import { runHarness } from '../../harness/run.js';
import { selectedProject } from '../common.js';
import { option, type CommandContext } from '../context.js';

/**
 * `ptbk ping`: an explicit small harness/model call (optionally repeated with `--period`).
 *
 * @private command
 */
export default async function ping(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const saved = await loadSettings(project, { env: context.env });
    const harness = option<string>(context, 'harness') ?? enabledHarnesses(saved)[0];
    if (!harness) throw new PtbkError('Select a harness with --harness.', { kind: 'usage' });
    // The explicit call uses the same named instance selection (and credentials) as ordinary work.
    const settings = await loadSettings(project, { env: context.env, cliHarnesses: [harness] });
    const pool = new HarnessPool(project.root, settings, context.env);
    const requirement = harnessRequirement(harness, pool);
    const plugin = requirement ? harnessPlugin(requirement.variant) : undefined;
    if (!plugin || !requirement) throw new PtbkError(`Unknown harness "${harness}".`, { kind: 'usage', next: ['Use a variant such as openai-codex or a harness tool name from `ptbk tool list`.'] });
    const period = option<number>(context, 'period');
    const { terminal } = context;
    let failures = 0;
    for (;;) {
        await pool.refresh(undefined, true);
        const instance = pool.select(requirement.variant, { tool: requirement.tool });
        const inspection = instance ? pool.inspectionOf(instance.name) : pool.inspection(requirement.variant);
        if (!instance || !inspection?.usable) throw new PtbkError(`${plugin.displayName} is not usable.`, { kind: 'setup', harness, reason: inspection?.summary ?? 'No enabled instance is configured.', next: inspection?.nextAction ? [inspection.nextAction] : [] });
        const directory = await ensureDirectory(project.runtime.temporary);
        const promptFile = join(directory, `ping-${shortId()}.md`);
        const prompt = 'This is a connectivity check. Do not use any tools or read any files. Reply with exactly the word PONG.';
        await writeFile(promptFile, prompt);
        try {
            const result = await runHarness(
                plugin,
                {
                    projectRoot: project.root,
                    cwd: project.root,
                    prompt,
                    promptFile,
                    // Unspecified choices use the plugin's coded defaults (tool settings never define them).
                    model: option<string>(context, 'model') ?? (await pool.defaults(requirement.variant)).model,
                    thinkingLevel: option<ThinkingLevel>(context, 'thinking-level') ?? (await pool.defaults(requirement.variant)).thinkingLevel,
                    baseUrl: pool.baseUrl(instance),
                    readOnly: plugin.capabilities.readOnly,
                    env: pool.environment(instance),
                    timeoutMs: 180_000,
                    allowCredits: false,
                    authentication: inspection.authentication,
                    readableDirectories: [],
                },
                inspection.executablePath ?? plugin.executable,
            );
            const ok = result.outcome === 'completed' && /PONG/i.test(result.finalMessage);
            if (!ok) failures++;
            terminal.write(`${clockTime()} ${plugin.displayName} [${instance.name}]${result.model ? ` (${result.model})` : ''}: ${ok ? 'PONG' : result.diagnostic} in ${(result.durationMs / 1000).toFixed(1)}s\n`);
        } finally {
            await rm(promptFile, { force: true });
        }
        if (!period) break;
        await new Promise((resolve) => setTimeout(resolve, period));
    }
    return failures ? EXIT.failure : EXIT.success;
}
