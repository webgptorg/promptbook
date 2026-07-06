# Admin

Admin surfaces are available only to authenticated administrators unless a route explicitly supports global bootstrap behavior.

## Administrator Identity

A user is an administrator when the resolved identity has `isAdmin = true`. The environment admin authenticated by `ADMIN_PASSWORD` is an administrator and may also be a global admin during bootstrap flows.

Admin checks MUST use the shared current-user resolution described in [Authentication](authentication.md).

## Admin Areas

The admin UI and APIs cover:

- metadata
- server limits and tool limits
- users
- API tokens
- registered servers
- server logs
- backups
- update/self-update
- task manager
- custom CSS and JavaScript
- images and uploads
- code runners and CLI access
- Shibboleth configuration and audit
- GitHub App and calendar integration setup

## Metadata Management

Administrators can view and update metadata values. Values MUST be validated before being stored.

Metadata import/export:

- Export includes Promptbook version and metadata values/notes that differ from built-in defaults.
- Import compares incoming values with current values and lets administrators keep current or imported values.
- Missing built-in keys resolve to current defaults instead of being stored redundantly.

See [Configuration](configuration.md).

## Server Limits

Administrators can update numeric limits. Updates MUST normalize all known limits and maintain legacy metadata mirrors where required.

See [Configuration](configuration.md).

## User Administration

Admin user APIs MUST return public user projections and MUST NOT expose `passwordHash`.

Administrators can manage local users and inspect linked external identities where supported.

## Server Registry

Global admin/server setup pages manage `_Server` records. These records control domain routing and table prefixes. See [Server Routing](server-routing.md).

Bootstrap behavior for raw IP hosts is defined in [Server Routing](server-routing.md).

## Backups

Server backups export a ZIP archive with a versioned manifest and selected sections such as:

- metadata
- agents and folders
- conversations
- users
- files
- messages

Backups MUST redact wallet secrets and avoid leaking sensitive credential material.

## Task Manager

The admin task manager shows durable chat jobs, chat timeouts, local/external runner state, page-preview sessions, and standalone self-update sessions where present.

Task rows SHOULD support filtering, pagination, status summaries, and row actions where the underlying task type supports cancellation or retry.

## Custom Styling and JavaScript

Administrators can configure custom CSS and JavaScript. These records affect client rendering and MUST be treated as privileged content.

Custom code MUST NOT be editable by non-admin users.

## Standalone VPS Update

Standalone deployments MAY expose a self-update page that:

- shows current deployment state
- checks available target environments
- runs blue/green updates
- streams logs/status
- exposes the update session in task-manager views

Update flows MUST avoid leaving multiple active server processes after success or failure.

