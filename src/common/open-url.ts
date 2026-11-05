import { spawn } from 'node:child_process';

/**
 * Opens a URL in this computer's default browser without a shell (`PTBK_BROWSER` names another command, e.g. for
 * fixtures). Resolves whether a launcher could be started; the page itself reports whether it actually loaded.
 *
 * @private shared helper
 */
export async function openInBrowser(url: string, env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
    const custom = env.PTBK_BROWSER?.trim();
    const [command, args] = custom ? [custom, [url]] : process.platform === 'darwin' ? ['open', [url]] : process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]] : ['xdg-open', [url]];
    return await new Promise<boolean>((resolve) => {
        try {
            const child = spawn(command, args, { stdio: 'ignore', detached: true, windowsHide: true, env });
            child.once('error', () => resolve(false));
            child.once('spawn', () => {
                child.unref();
                resolve(true);
            });
        } catch {
            resolve(false);
        }
    });
}
