/**
 * Builds the deterministic per-server table prefix from a normalized domain.
 *
 * The prefix doubles as the stable namespace key of one server:
 * - In Supabase mode it prefixes the server tables inside the shared database.
 * - In standalone SQLite mode it selects the isolated per-server database file.
 *
 * Note: Keep in sync with `build_domain_table_prefix` in `install.sh`.
 *
 * @param domain - Normalized server domain such as `client.example.com`.
 * @returns Prefix such as `server_client_example_com_`.
 */
export function buildDomainTablePrefix(domain: string): string {
    const prefixSuffix = domain
        .toLowerCase()
        .replace(/-/gu, '_dash_')
        .replace(/\./gu, '_')
        .replace(/:/gu, '_port_')
        .replace(/[^a-z0-9_]/gu, '_')
        .replace(/_+/gu, '_')
        .replace(/^_+|_+$/gu, '');

    return `server_${prefixSuffix}_`;
}
