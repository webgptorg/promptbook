/**
 * Optional hostname used by the internal Next server.
 *
 * @private internal constant of `startAgentsServer`
 */
const PTBK_HOSTNAME_ENV = 'PTBK_HOSTNAME';

/**
 * Resolves the optional Next hostname from the prepared child environment.
 *
 * @private internal utility of `startAgentsServer`
 */
export function resolveAgentsServerChildHostname(environment: NodeJS.ProcessEnv): string | null {
    const hostname = environment[PTBK_HOSTNAME_ENV]?.trim();

    return hostname || null;
}
