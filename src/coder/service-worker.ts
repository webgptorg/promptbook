import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolveWorkspace, requireGit } from './workspace.js';
import { runService, type ServiceOptions, readServiceRecord } from './service.js';
import { installDaemonLogging } from './logging.js';
import { reportDiagnostic } from './diagnostics.js';
import type { Workspace } from './domain.js';
import { restoreServiceEnvironment, type ServiceEnvironment } from './service-environment.js';

/** The worker retains its selected project for truthful startup diagnostics. */
let diagnosticWorkspace: Workspace | undefined;

/** Execute only the project and installation pinned in the saved service configuration. */
async function worker(): Promise<void> {
    const index = process.argv.indexOf('--config');
    if (index < 0 || !process.argv[index + 1]) throw new Error('Service worker requires a saved --config path.');
    const config = JSON.parse(await readFile(process.argv[index + 1]!, 'utf8')) as { version: number; project: string; tasks: string; installation: string; desired: string; options: ServiceOptions; environment?: ServiceEnvironment };
    if (config.version !== 1 || config.installation !== fileURLToPath(new URL('../..', import.meta.url))) throw new Error('The saved service configuration belongs to another ptbk installation.');
    if (config.desired === 'stopped') return;
    restoreServiceEnvironment(config.environment);
    const workspace = await resolveWorkspace({ path: config.project, tasks: config.tasks });
    diagnosticWorkspace = workspace;
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
await worker().catch(async error => {
    await reportDiagnostic(error, { command: 'start', phase: 'daemon startup or shutdown', projectPath: diagnosticWorkspace?.projectPath || process.cwd(), workspace: diagnosticWorkspace });
    process.exitCode = 1;
});
