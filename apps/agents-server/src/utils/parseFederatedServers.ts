import type { string_promptbook_server_url } from '@promptbook-local/types';

/**
 * Parses a comma-separated federated-server metadata value.
 *
 * @param value - Raw stored metadata value.
 * @returns Normalized non-empty server URL values.
 */
export function parseFederatedServers(value: string | null | undefined): Array<string_promptbook_server_url> {
    return (value || '')
        .split(',')
        .map((serverUrl) => serverUrl.trim())
        .filter((serverUrl): serverUrl is string_promptbook_server_url => serverUrl !== '');
}
