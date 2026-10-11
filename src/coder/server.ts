import type { Workspace } from './domain.js';
import type { RunOptions } from './engine.js';
import { runService } from './service.js';

/** Serve the compatibility foreground workflow through the project's shared supervisor.
 * @private Internal legacy command adapter; all controls and ownership use the common runtime.
 */
export async function startCoderServer(workspace: Workspace, options: RunOptions & { port?: number }): Promise<void> {
    await runService(workspace, { ...options, automatic: false, mode: 'raw', noPersist: true, noQr: true });
}
