# Folders and Organization

Agents are organized in a **folder tree** per server instance. Folders group agents in the directory (homepage, header menu, dashboard) and drive bulk operations (visibility, export). State lives in `prefix_AgentFolder` plus `Agent.folderId`/`Agent.sortOrder` ([Data model](../data-model.md#prefix_agentfolder)).

## Folder model

-   `name` — display name. Names starting with `.` mark **hidden folders** (see below).
-   `parentId` — parent folder or `null` (root). The tree has unbounded depth; a folder hidden by an ancestor is hidden too.
-   `sortOrder` — manual ordering among siblings (agents and folders each carry their own `sortOrder`).
-   `icon`, `color` — optional appearance: icon from a fixed identifier set (default `folder`), color as hex (default `#f59e0b`). Unknown icon ids fall back to the default.
-   `userId` — optional creator reference (not used for access control).
-   `deletedAt` — soft deletion, same semantics as agents.

## Hidden folders

A folder whose name starts with `.` (for example the seeded `.core` folder, see [Seeding](../agents.md#seeding)) is excluded — together with all its descendants and their agents — from default listings: homepage directory, header agent menu, and organization snapshots. Direct URLs to the contained agents keep working (hiding is a listing concern, not an access rule). Admin/system surfaces MAY opt in to show hidden folders.

## Endpoints

| Route | Method | Behavior |
| --- | --- | --- |
| `/api/agent-folders` | POST | Create a folder (`{ name, parentId? }`). Signed-in only. |
| `/api/agent-folders/:folderId` | PATCH | Rename / re-parent / set appearance (`icon`, `color`). |
| `/api/agent-folders/:folderId` | DELETE | Soft-delete the folder subtree (agents inside are soft-deleted with it). |
| `/api/agent-folders/:folderId/restore` | POST | Restore a soft-deleted folder (with its restorable contents). |
| `/api/agent-folders/:folderId/visibility` | PATCH | Bulk-set the [visibility](../agents.md#visibility) of **all active agents in the subtree**. Accepts `PRIVATE`, `UNLISTED`, `PUBLIC`; rewrites each agent's source `META VISIBILITY` so source and column stay consistent. |
| `/api/agent-organization` | GET | Current active organization snapshot `{ agents, folders, syncedAt }` (no-store; hidden folders filtered). |
| `/api/agent-organization` | POST | **Batch reorder/move**: `{ folders: [{id, parentId, sortOrder}], agents: [{identifier, folderId, sortOrder}] }`. Signed-in only; agent `identifier` accepts name or permanentId; soft-deleted rows are never touched. Invalidates cached snapshots. |

Moving an individual agent into a folder is also possible through the agent update API (`folderId` field) and drag & drop in the UI (which uses the batch endpoint).

## Recycle bin

The `/recycle-bin` page (signed-in) lists soft-deleted agents and folders and offers restore (`POST /api/agents/:agentName/restore`, `POST /api/agent-folders/:folderId/restore`) — see [Agents § Soft deletion](../agents.md#soft-deletion-and-restore). Deleted items keep their folder placement so restore returns them where they were; restoring an agent whose folder is deleted restores the folder path as needed.

## Presentation rules

-   Directory ordering: folders and agents interleave per `sortOrder` within each parent; ties fall back to creation order.
-   The header agent menu mirrors the same tree (minus hidden folders) — see [Navigation](../ui/navigation.md).
-   Folder-scoped export (download all books of a subtree) is specified in [Transfer and backup](transfer-and-backup.md#agents-export).
