import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { presentNativeLogin } from '../harness/presented-login.js';
import type { HarnessContext, HarnessLoginMethod, HarnessPlugin } from '../harness/types.js';
import type { OnboardingPrompt } from './contract.js';
import { HARNESS_TERMINAL_PATH, HarnessLoginTerminal } from './terminal.js';

/** A presented CLI challenge. Only the live native process receives a returned code. @private onboarding */
export async function presentHarnessChallenge(
    plugin: HarnessPlugin, context: HarnessContext, method: HarnessLoginMethod, signal: AbortSignal,
    diagnostic: string | undefined, offerKey: boolean,
    show: (prompt: OnboardingPrompt, submit?: (code: string) => Promise<void>) => void,
): Promise<string | undefined> {
    signal.throwIfAborted();
    const id = randomUUID();
    const base = {
        id, kind: 'harness-login' as const, title: plugin.displayName + ' sign-in', harness: plugin.displayName,
        canGoBack: true, status: 'waiting' as const, diagnostic: diagnostic ?? null, hint: null, error: null,
        alternatives: [
            ...(offerKey ? [{ id: 'api-key', label: 'Use an API key instead', description: null, href: null }] : []),
            { id: 'native-terminal', label: 'Sign in in a terminal instead', description: null, href: HARNESS_TERMINAL_PATH },
        ],
    };
    if (!method.returnChallenge) {
        const failure = await presentNativeLogin(plugin, { ...context, signal }, method, challenge => {
            if (!signal.aborted) show({ ...base, method: 'device-code', question: 'Open the provider’s sign-in page and enter the one-time code there.', ...challenge });
        });
        return failure?.diagnostic;
    }

    const terminal = new HarnessLoginTerminal(plugin, { ...context, signal }, method);
    const owner = 'presented:' + id;
    const started = Date.now();
    const expires = started + 8 * 60_000;
    let output = '';
    let offset = 0;
    let presented = false;
    try {
        await terminal.command(owner, { id, action: 'start', cols: 200, rows: 24 });
        while (!signal.aborted && Date.now() < expires) {
            const frame = await terminal.command(owner, { id, action: 'read', offset });
            if (signal.aborted || !frame) break;
            offset = frame.offset;
            if (!presented) {
                output = (output + frame.output).slice(-16_384);
                const challenge = method.returnChallenge(output);
                if (challenge) {
                    presented = true;
                    output = '';
                    show({ ...base, method: 'return-code', question: 'Open the provider sign-in page, sign in, then paste its returned code here.',
                        url: challenge.url, userCode: null, expiresAt: new Date(expires).toISOString() },
                    async code => { await terminal.command(owner, { id, action: 'write', data: code + '\r' }); });
                }
            }
            if (frame.done) return undefined;
            if (!presented && Date.now() - started > 25_000) return 'The native CLI did not provide a supported authorization link. Use its sign-in terminal.';
            await delay(125, undefined, { signal });
        }
        return signal.aborted ? undefined : 'The provider sign-in expired. Start again for a fresh code.';
    } catch {
        return signal.aborted ? undefined : 'The native authorization flow could not continue. Use its sign-in terminal.';
    } finally {
        terminal.close();
    }
}
