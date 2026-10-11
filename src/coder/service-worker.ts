import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolveWorkspace, requireGit } from './workspace.js';
import { runService, type ServiceOptions, readServiceRecord } from './service.js';
import { installDaemonLogging } from './logging.js';

/** Execute only the project and installation pinned in the saved service configuration. */
async function worker(): Promise<void> {
    const index = process.argv.indexOf('--config');
    if (index < 0 || !process.argv[index + 1]) throw new Error('Service worker requires a saved --config path.');
    const config = JSON.parse(await readFile(process.argv[index + 1]!, 'utf8')) as { version: number; project: string; tasks: string; installation: string; desired: string; options: ServiceOptions };
    if (config.version !== 1 || config.installation !== fileURLToPath(new URL('../..', import.meta.url))) throw new Error('The saved service configuration belongs to another ptbk installation.');
    if (config.desired === 'stopped') return;
    const workspace = await resolveWorkspace({ path: config.project, tasks: config.tasks });
    installDaemonLogging(workspace);
    const record = await readServiceRecord(workspace);
    if (process.argv.includes('--resume') && record?.desired === 'stopped') return;
    await requireGit(workspace);
    const controller = new AbortController();
    const abort = () => controller.abort(); process.once('SIGINT', abort); process.once('SIGTERM', abort);
    try {
        await runService(workspace, { ...config.options, signal: controller.signal });
        if ((await readServiceRecord(workspace))?.desired === 'running') process.exitCode = 1;
    }
    finally { process.removeListener('SIGINT', abort); process.removeListener('SIGTERM', abort); }
}
await worker().catch(error => { process.stderr.write(`ptbk service failed: ${(error as Error).message}\n`); process.exitCode = 1; });
