# Federation (historical)

> Historical specification retained from the older Agents Server specs. It has lower authority, especially for implementation details; see the [archive policy](../_index.md).

[Historical index](../_index.md) · [Dictionary](../../dictionary.md)

Federation lets one Agents Server instance **see and reuse agents hosted on other Agents Servers**. It is configuration-driven and read-only: a federated server is never written to; its agents are referenced by URL or copied on demand.

## Configuration

- `FEDERATED_SERVERS`: Comma-separated base URLs of federated Agents Servers (trimmed, empties dropped). **Store:** Metadata (historical page: `../configuration.md#federation`).
- `SHOW_FEDERATED_SERVERS_PUBLICLY`: Whether anonymous visitors may see the federated list. **Store:** Metadata (default `false`).
- `FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS`: Delay between retries when importing a federated agent's book. **Store:** Server limit (historical page: `../configuration.md#server-limits`).

`GET /api/federated-agents` returns `{ federatedServers: [...] }` — the configured URL list. When the caller is anonymous **and** `SHOW_FEDERATED_SERVERS_PUBLICLY` is `false`, it MUST return an empty list (the configuration is not disclosed).

## What federation provides

1. **Directory listing** — the homepage/dashboard fetches each federated server's public agent list client-side and shows those agents alongside local ones, grouped per server with per-server availability status. Federated agents are rendered from their remote profiles (name, description, avatar; remote profile payloads carry `avatarVisualId` / `defaultAgentAvatarVisualId` so [avatars](avatars-and-visuals.md) render consistently).
2. **Cross-server references** — `FROM`, `IMPORT`, and `TEAM` commitments may reference agents by name/id that only exist on a federated server. The [compact-reference resolver](references.md#compact-reference-resolution) queries federated servers (after local lookup, 1.5 s timeout per lookup, per-server caching) and rewrites the reference to the remote agent URL.
3. **Book import** — resolving a remote reference imports the remote agent's book over HTTP (`GET <agentUrl>/api/book`-equivalent public source), with bounded retries and the [missing-agent fallback](imports.md#import-mechanics-shared-by-from-and-import) when unavailable.
4. **Copy to local** — from the UI a user can import a federated agent, which clones its book into a local agent row (regular creation (historical page: `../agents.md#creation`) flow; the copy is independent afterwards).

## Semantics and constraints

-   Federation trust is one-way and unauthenticated: only **publicly accessible** remote agents can be listed/imported. Private remote agents are invisible to federation.
-   A federated server that is down MUST degrade gracefully: listings show the server as unavailable, reference resolution falls back to "not found" notes, imports fall back per the retry policy.
-   Same-server `TEAM` calls use the team internal token (historical page: `../users-and-authentication.md#team-internal-access-token`); cross-server `TEAM` calls are plain public API calls to the remote server (the remote applies its own access rules).
-   The local server's own URL is excluded from its federated list (self-federation is ignored).

## Related historical specifications

- [Source resolution](source-resolution.md)
- [Agent references](references.md)
- [Commitment registry](../commitment-registry.md)
