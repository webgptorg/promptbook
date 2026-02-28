import { normalizeTo_PascalCase } from '../../../../src/utils/normalization/normalizeTo_PascalCase';

/**
 * Builds a normalized server identifier derived from the host name listed in `SERVERS`.
 *
 * @param serverHost - Host name as configured in the `SERVERS` list.
 * @returns PascalCased server identifier (e.g. `PavolHejny`).
 * @private Multi-server helper that keeps server prefix logic DRY.
 */
export function buildServerNameFromHost(serverHost: string): string {
    const trimmedHost = serverHost.trim();
    const hostWithoutSuffix = trimmedHost.replace(/\.ptbk\.io$/i, '');
    const candidate = hostWithoutSuffix || trimmedHost;
    return normalizeTo_PascalCase(candidate);
}

/**
 * Constructs the Supabase table prefix for a configured server host.
 *
 * @param serverHost - Host name from the `SERVERS` list.
 * @returns Table prefix (e.g. `server_PavolHejny_`).
 * @private Multi-server helper that keeps server prefix logic DRY.
 */
export function buildServerTablePrefix(serverHost: string): string {
    const serverName = buildServerNameFromHost(serverHost);
    return `server_${serverName}_`;
}
