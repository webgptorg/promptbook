import { AsyncLocalStorage } from 'node:async_hooks';
import type { ProvidedServer } from './$provideServer';

/**
 * Async-local storage carrying an explicit server routing context.
 *
 * Detached background workers on a multi-server VPS have no request `host` header to
 * resolve the current server from, so they run per-server work inside an explicit
 * override that `$provideServer` honors.
 *
 * @private internal state of Agents Server server-context routing
 */
const serverContextOverrideStorage = new AsyncLocalStorage<ProvidedServer>();

/**
 * Runs one callback with an explicit server routing context so every `$provideServer`
 * call inside it resolves to the given server instead of the request-header server.
 *
 * @param server - Server routing context to activate for the callback.
 * @param callback - Work to run inside the overridden server context.
 * @returns Result of the callback.
 *
 * @private internal utility of Agents Server server-context routing
 */
export function runWithServerContextOverride<TResult>(
    server: ProvidedServer,
    callback: () => Promise<TResult>,
): Promise<TResult> {
    return serverContextOverrideStorage.run(server, callback);
}

/**
 * Reads the active server routing override, if any background worker set one.
 *
 * @returns Overriding server routing context, or `undefined` when the request-header
 *          server should be used.
 *
 * @private internal utility of Agents Server server-context routing
 */
export function getServerContextOverride(): ProvidedServer | undefined {
    return serverContextOverrideStorage.getStore();
}
