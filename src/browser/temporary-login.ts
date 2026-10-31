import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { projectAt } from '../project/workspace.js';
import type { BrowserToolRecord } from '../tools/model.js';
import type { LoginContext } from '../wallet/wallet.js';
import { ProjectBrowser } from './browser.js';

/**
 * A separate login context for a Wallet credential test before a project exists: a browser with a temporary profile
 * outside the target folder, closed and removed when the context is disposed. Initialization's draft writes nothing
 * into the project this way, and none of the owner's existing browser sessions is touched.
 *
 * @private project browser
 */
export async function temporaryLoginContext(origin: string, options: { readonly isHeadless: boolean; readonly env: NodeJS.ProcessEnv }): Promise<LoginContext> {
    const directory = await mkdtemp(join(tmpdir(), 'ptbk-login-test-'));
    const tool: BrowserToolRecord = { type: 'BROWSER', variant: 'CHROME', name: 'login-test', isEnabled: true, profile: { source: 'PROJECT' }, isHeadless: options.isHeadless };
    const browser = new ProjectBrowser(projectAt(directory), tool.name, () => ({ tool, overridden: false }), options.env, undefined, () => false);
    const close = async (): Promise<void> => {
        await browser.disconnect().catch(() => undefined);
        await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }).catch(() => undefined);
    };
    try {
        const login = await browser.session(tool.name).isolatedLogin(origin);
        return {
            page: login.page,
            dispose: async () => {
                await login.dispose();
                await close();
            },
        };
    } catch (error) {
        await close();
        throw error;
    }
}
