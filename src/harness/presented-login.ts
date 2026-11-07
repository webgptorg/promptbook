import { runProcess } from '../common/process.js';
import type { HarnessContext, HarnessLoginMethod, HarnessPlugin, LoginFailure } from './types.js';

/**
 * The information an operator needs to finish a native device login on the provider's website.
 *
 * @private harness sign-in
 */
export type DeviceLoginChallenge = {
    readonly url: string;
    readonly userCode: string;
    readonly expiresAt: string;
};

/** How long the native device flow may wait for its owner. */
const LOGIN_TIMEOUT_MS = 15 * 60_000;

/**
 * Runs the adapter's native login under the engine's OS account. Only the device challenge is presented to
 * the client. Native CLI output and credentials are kept out of the transcript, disk and diagnostics.
 *
 * @private harness sign-in
 */
export async function presentNativeLogin(
    plugin: HarnessPlugin,
    context: HarnessContext,
    method: HarnessLoginMethod,
    challenge: (data: DeviceLoginChallenge) => void,
): Promise<LoginFailure | { readonly outcome: 'failed'; readonly diagnostic: string } | undefined> {
    if (!method.deviceChallenge) return { outcome: 'unsupported', diagnostic: 'This login must be completed in the provider’s native terminal.' };
    const controller = new AbortController();
    const signal = context.signal ? AbortSignal.any([controller.signal, context.signal]) : controller.signal;
    const timeout = setTimeout(() => controller.abort(), 25_000).unref();
    const expiresAt = new Date(Date.now() + LOGIN_TIMEOUT_MS).toISOString();
    let output = '';
    let shown = false;
    const inspectLine = (line: string): void => {
        if (shown) return;
        output = (output + '\n' + line).slice(-16_384);
        const data = method.deviceChallenge?.(output);
        if (!data) return;
        shown = true;
        clearTimeout(timeout);
        challenge({ ...data, expiresAt });
    };
    const result = await runProcess(plugin.executable, method.args, {
        cwd: context.projectRoot,
        env: { ...context.env, ...method.env },
        timeoutMs: LOGIN_TIMEOUT_MS,
        signal,
        onStdoutLine: inspectLine,
        onStderrLine: inspectLine,
        maxOutputBytes: 16_384,
    }).finally(() => clearTimeout(timeout));
    if (controller.signal.aborted) return { outcome: 'unsupported', diagnostic: 'The CLI did not provide a device code. Continue in its sign-in terminal.' };
    if (result.timedOut) return { outcome: 'expired', diagnostic: 'The device sign-in timed out. Start it again for a fresh code.' };
    if (result.exitCode === 0 && !result.cancelled) {
        const inspection = await plugin.inspect(context);
        if (inspection.usable && inspection.authenticated === true) return undefined;
    }
    return plugin.classifyLogin?.(result.stdout + '\n' + result.stderr) ??
        { outcome: 'failed', diagnostic: 'The harness did not confirm a usable account. Try again, or sign in on the engine host and recheck.' };
}
