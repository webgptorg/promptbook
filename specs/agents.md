# Agents

An agent is a persisted book-language source plus resolved metadata, visibility, folder placement, ownership, runtime preparation state, and chat-facing behavior.

## Identity

Agents have two public identifiers:

- `agentName`: human-readable name derived from the book title line.
- `permanentId`: stable identifier that survives renames and is preferred for durable links.

Routes MUST accept both when resolving an agent unless a specific route states otherwise. Canonical local URLs SHOULD use:

```text
/agents/<permanentId-or-agentName>
```

When both a name and permanent id could match different agents, the implementation MUST avoid ambiguous writes and SHOULD return a conflict error for management operations.

## Source of Truth

The agent source is book-language text stored in `Agent.agentSource`. Derived columns such as `agentProfile`, `agentHash`, `preparedModelRequirements`, and `visibility` are mirrors or caches.

`META VISIBILITY` in book source is the source of truth for agent visibility. The server MUST normalize it to:

- `PRIVATE`
- `UNLISTED`
- `PUBLIC`

and mirror the normalized value into `Agent.visibility`.

When the source does not declare visibility, `DEFAULT_VISIBILITY` applies. See [Configuration](configuration.md).

## Ownership

Agents MAY be owned by a `User` through `userId`.

Write access requires an authenticated user with write permission to that agent. Administrator privileges MAY grant broader write access where existing admin routes define it. Management API routes are owner-scoped by API token user. See [Management API](management-api.md).

Read access depends on visibility:

- `PUBLIC`: visible in public lists and public profile pages.
- `UNLISTED`: reachable by direct URL but not generally indexed.
- `PRIVATE`: visible only to authorized users, owner, admin, or valid same-server team calls.

## Folder Organization

Agents MAY belong to an `AgentFolder`. Folders form a tree through `parentId`.

Folder behavior:

- Names MUST be nonempty.
- Names MUST NOT contain `/`.
- Active folder names MUST be unique within the same parent and owner.
- New folders are appended by `sortOrder`.
- Deleting a folder soft-deletes that folder, descendants, and agents in those folders.
- Hidden folders whose name starts with `.` are hidden from the homepage by default.

The `.core` folder contains local core agents and is hidden by default.

## Creation

Agent creation MUST:

1. Validate book source.
2. Normalize/pad source according to book-language rules.
3. Resolve the display name from the source title.
4. Apply visibility from `META VISIBILITY` or `DEFAULT_VISIBILITY`.
5. Assign `permanentId`.
6. Assign owner and folder if provided and authorized.
7. Assign `sortOrder` to the next available position when not provided.
8. Store current agent state and any required derived profile/runtime fields.

## Updating

Agent updates MAY change:

- source
- name
- visibility
- folder
- sort order

Source, name, and visibility changes MUST update book source and preserve a history snapshot. Folder and sort-order changes MAY update columns directly.

Renaming an agent MUST update the book title line through book-language-safe transformation, not by blindly changing database columns.

## Soft Delete and Restore

Deleting an agent MUST mark `deletedAt` instead of removing the row.

Restore behavior MUST clear `deletedAt` and place the agent back into an active organization context when possible.

Public lists and normal resolver paths MUST ignore soft-deleted agents. History and administrative recovery surfaces MAY include them.

## Cloning

`POST /api/agents/<agentName>/clone` clones an existing agent for the current authenticated user.

Clone behavior:

- The caller must be signed in.
- The source agent must be readable.
- The clone receives a new `permanentId`.
- The clone source title is replaced with the requested name or a generated copy name.
- Generated names follow the pattern `<name> (Copy)`, `<name> (Copy 2)`, and so on.
- The clone inherits the source folder when the caller can use it.
- The clone uses default visibility rules for new agents.

## Import and Export

Administrators can import `.book` files and ZIP archives.

Import behavior:

- Accept direct `.book` files.
- Accept ZIP files with `.book` entries.
- Ignore or warn about non-book ZIP entries.
- Allow targeting a folder.
- Support conflict resolution modes: `ASK`, `SKIP`, and `DUPLICATE`.
- Return a conflict response when `ASK` is used and conflicting names require a user decision.

Exports SHOULD produce `.book` files arranged in the folder hierarchy so a fresh server can recreate agents and folders.

## Seeding

On an empty server, the default-agent seeder MAY create bundled default agents from `PTBK_DEFAULT_AGENTS_DIR` or built-in defaults.

Core agents MUST be ensured on every server start:

- A `.core` folder exists.
- Well-known agents such as Adam and Teacher exist locally.
- Missing core agents are inserted without depending on an external core server.

Core agents provide local defaults for inheritance and teacher behavior.

## Federation

Federation allows one server to discover agents from configured remote servers.

`FEDERATED_SERVERS` defines remote server URLs. `SHOW_FEDERATED_SERVERS_PUBLICLY` controls whether those servers are exposed in public listing responses.

Default federated-agent synchronization is deprecated in favor of local core seeding, but `DefaultFederatedAgent` records may still exist for compatibility.

## Custom Domains

An agent MAY claim a custom domain through book metadata such as `META DOMAIN` or `META LINK`. The routing behavior is defined in [Server Routing](server-routing.md).

## Preparation

Agent preparation computes external runtime artifacts for an agent/source fingerprint. Preparation state is stored in `AgentPreparation`.

Chat runtime SHOULD wait for a running preparation for the same fingerprint when required, and MAY use cached model requirements or external artifacts when they match the current fingerprint.

## Public Agent List

`GET /api/agents` returns public organization data:

- active public/unlisted agents according to visibility filtering rules
- folders visible in the public organization tree
- federated server metadata when allowed
- default avatar visual id

Private agents MUST NOT be included in anonymous public lists.

