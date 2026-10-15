import { rm, writeFile } from 'node:fs/promises';
import { clockTime } from '../../common/time.js';
import { join } from 'node:path';
import { EXIT, PtbkError } from '../../common/errors.js';
import { ensureDirectory } from '../../common/fs.js';
import { shortId } from '../../common/ids.js';
import { loadSettings, setting, type ThinkingLevel } from '../../project/config.js';
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
    const settings = await loadSettings(project, { env: context.env });
    const harness = option<string>(context, 'harness') ?? setting<string | undefined>(settings, 'routing.harness');
    if (!harness) throw new PtbkError('Select a harness with --harness.', { kind: 'usage' });
    const plugin = harnessPlugin(harness);
    if (!plugin) throw new PtbkError(`Unknown harness "${harness}".`, { kind: 'usage' });
    const period = option<number>(context, 'period');
    const { terminal } = context;
    let failures = 0;
    for (;;) {
        const inspection = await plugin.inspect({ projectRoot: project.root, env: context.env });
        if (!inspection.usable) throw new PtbkError(`${plugin.displayName} is not usable.`, { kind: 'setup', harness, reason: inspection.summary, next: inspection.nextAction ? [inspection.nextAction] : [] });
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
                    model: option<string>(context, 'model'),
                    thinkingLevel: option<ThinkingLevel>(context, 'thinking-level'),
                    readOnly: plugin.capabilities.readOnly,
                    env: context.env,
                    timeoutMs: 180_000,
                    allowCredits: false,
                    authentication: inspection.authentication,
                    readableDirectories: [],
                },
                inspection.executablePath ?? plugin.executable,
            );
            const ok = result.outcome === 'completed' && /PONG/i.test(result.finalMessage);
            if (!ok) failures++;
            terminal.write(`${clockTime()} ${plugin.displayName}${result.model ? ` (${result.model})` : ''}: ${ok ? 'PONG' : result.diagnostic} in ${(result.durationMs / 1000).toFixed(1)}s\n`);
        } finally {
            await rm(promptFile, { force: true });
        }
        if (!period) break;
        await new Promise((resolve) => setTimeout(resolve, period));
    }
    return failures ? EXIT.failure : EXIT.success;
}
