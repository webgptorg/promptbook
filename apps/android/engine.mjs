import { join } from 'node:path';
import { initializeProject } from './dist/cli/commands/init.js';
import { createCommandContext } from './dist/cli/context.js';
import { parseInvocation } from './dist/cli/parser.js';
import { COMMANDS } from './dist/cli/registry.js';
import { errorMessage } from './dist/common/errors.js';
import { pathExists, writeFileAtomic } from './dist/common/fs.js';
import { installPausedStart } from './dist/engine/operator-intent.js';
import { projectAt } from './dist/project/workspace.js';
import { ServiceHost } from './dist/service/host.js';

/** The Android service owns this process and the private pipe carrying its bootstrap state. */
const dashboardAccessKey = process.env.PTBK_ANDROID_DASHBOARD_KEY;
delete process.env.PTBK_ANDROID_DASHBOARD_KEY;
const project = projectAt(process.cwd());
const geminiKey = process.env.PTBK_ANDROID_GEMINI_KEY;
let host;
let stopping = false;
let serving = false;

/** A closed owner pipe or a termination signal lets the agenda checkpoint before exiting. */
function stop() {
    stopping = true;
    if (serving) host.agenda.requestStop({ signal: true });
}

process.stdin.resume();
process.stdin.on('end', stop);
process.on('SIGTERM', stop);

try {
    if (!/^[a-f0-9]{64}$/.test(dashboardAccessKey ?? '')) throw new Error('The Android service did not supply a dashboard key.');
    if (!(await pathExists(join(project.runtime.root, 'android-initialized')))) {
        const argv = ['init', '--path', project.root, '--raw', '--non-interactive', '--installation', 'global', '--no-harness', '--no-auto-sync', '--no-record-video'];
        const invocation = parseInvocation(argv, COMMANDS);
        if (invocation.kind !== 'command') throw new Error('Could not prepare the Android project initializer.');
        const context = createCommandContext({ ...invocation, argv });
        const result = await initializeProject(context, {
            embeddedHarness: {
                type: 'HARNESS',
                variant: 'GEMINI',
                name: 'gemini',
                isEnabled: true,
                authentication: 'API_KEY',
                apiKeyEnv: 'PTBK_ANDROID_GEMINI_KEY',
            },
        });
        if (result.outcome !== 'ready') throw new Error(result.unresolved.join(' ') || 'Project setup is incomplete.');
        // The initializer may preserve a partial setup after a failure. Only a ready project gets this marker.
        await writeFileAtomic(join(project.runtime.root, 'android-initialized'), '1\n');
    }
    if (!stopping) {
        // Reopening the service never silently authorizes pending work after Android stopped the process.
        installPausedStart(project, 'start-paused');
        host = new ServiceHost({
            project,
            mode: 'foreground',
            env: process.env,
            cli: { 'server.isEnabled': true, 'service.isPersistent': false, 'service.harnessUpdates': 'off', 'updates.isAutoUpdateEnabled': false },
            persistent: false,
            persistenceNote: 'The Android foreground service owns this engine.',
            dashboardAccessKey,
        });
        try {
            await host.start();
            serving = true;
            if (stopping) host.agenda.requestStop({ signal: true });
            process.stdout.write(`PTBK_ANDROID_READY ${new URL(host.httpUrl).port}\n`);
            await host.runAgenda();
        } finally {
            serving = false;
            await host.shutdown();
        }
    }
} catch (error) {
    const message = errorMessage(error);
    process.stderr.write(`PTBK_ANDROID_ERROR ${(geminiKey ? message.replaceAll(geminiKey, '[redacted]') : message).replace(/\s+/g, ' ')}\n`);
    process.exitCode = 1;
} finally {
    process.stdin.pause();
    process.off('SIGTERM', stop);
}
