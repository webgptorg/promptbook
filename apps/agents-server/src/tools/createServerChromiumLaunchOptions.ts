import { locateChrome } from '../../../../src/executables/browsers/locateChrome';

/**
 * Shared Chromium sandbox flags used by server-side browser work.
 */
const SERVER_CHROMIUM_LAUNCH_ARGS = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];

/**
 * Minimal Playwright Chromium launch options shared by local browser providers.
 *
 * @private internal type for server-side browser launch helpers
 */
export type ServerChromiumLaunchOptions = {
    readonly headless: true;
    readonly args: Array<string>;
    readonly executablePath?: string;
};

/**
 * Creates launch options for server-side Playwright Chromium.
 *
 * The system Chrome executable is preferred when it is available. When Chrome is not installed,
 * the `executablePath` field is intentionally omitted so Playwright can use its installed Chromium.
 */
export async function createServerChromiumLaunchOptions(): Promise<ServerChromiumLaunchOptions> {
    const chromeExecutablePath = await resolveSystemChromeExecutablePath();

    return {
        headless: true,
        args: [...SERVER_CHROMIUM_LAUNCH_ARGS],
        ...(chromeExecutablePath ? { executablePath: chromeExecutablePath } : {}),
    };
}

/**
 * Resolves the optional system Chrome path without preventing Playwright's bundled fallback.
 */
async function resolveSystemChromeExecutablePath(): Promise<string | undefined> {
    try {
        return (await locateChrome()) || undefined;
    } catch {
        return undefined;
    }
}
