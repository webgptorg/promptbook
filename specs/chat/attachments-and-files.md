# Attachments and Files

File handling has three parts: **upload** (client → server → object store), **serving** (public content-addressed URLs), and **chat integration** (attachment references + model tools). State lives in `prefix_File` (uploads) and `prefix_Image` (generated images) — see [Data model](../data-model.md#files-and-media).

## Storage

Files live in an object store selected by environment (see [Configuration](../configuration.md#storage-and-integrations-all-optional)):

-   **S3-compatible CDN** — `CDN_PROVIDER`/`PTBK_FILE_STORAGE_MODE` = `s3` | `external-s3` | `self-contained-s3`, with endpoint/bucket/keys and a public base URL (`NEXT_PUBLIC_CDN_PUBLIC_URL`, optional `NEXT_PUBLIC_CDN_PATH_PREFIX`).
-   **Vercel Blob** — when `VERCEL_BLOB_READ_WRITE_TOKEN` is set (reference-implementation fallback).
-   **Self-contained S3** — bundled storage for standalone deployments; public URLs are served through the server itself.

Uploads are unavailable (HTTP 403 with explanation) when the instance has no usable public domain to publish URLs under, unless self-contained storage is selected.

## Upload

`POST /api/upload` — multipart form (`file`, optional `purpose`, default purpose for chat attachments):

1. Size guard: reject files larger than `MAX_FILE_UPLOAD_SIZE_MB` ([server limit](../configuration.md#server-limits), default 50 MB).
2. **Content-addressed key**: the CDN key embeds a hash of the file content (`<a>/<b>/<hash>/<filename>`), so the public URL never exposes internal bucket/paths, identical content deduplicates, and URLs are immutable.
3. The store write records a `prefix_File` row (owner `userId` when signed in, `purpose`, size, type, `storageUrl`, upload `status`).
4. **Security checking** — every configured checker runs against the public URL and the verdicts are stored in `File.securityResult`. The checker registry is extensible; the reference implementation registers VirusTotal when `VIRUSTOTAL_API_KEY` is set. Checker errors are recorded, not fatal.
5. Response: `{ url, pathname, contentType, size }`.

Uploads can be disabled per instance with the `IS_FILE_ATTACHEMENTS_ENABLED` [metadata key](../configuration.md#chat-behavior) (hides the UI affordances).

## Serving

-   `GET /s3/:first/:second/:hash/:filename` — public proxy for stored objects; 404 when absent; `Cache-Control: public, max-age=31536000, immutable` (safe because keys are content-addressed).
-   `GET /api/images/:filename` — serves generated images recorded in `prefix_Image`.
-   `GET /api/browser-artifacts/:artifactName` — serves screenshots/videos captured by the [`run_browser` tool](runtime-tools.md#run_browser); filenames are strictly validated against the artifact naming scheme before touching the filesystem.

## Chat integration

-   Clients upload files first, then send messages carrying **attachment references** (name, URL, type) — never raw bytes ([Stateless chat](stateless-chat.md#request), [User chats](user-chats.md#sending-a-turn)).
-   During execution the server attaches **attachment tools** so the model can work with the referenced files: `read_attached_file` (fetch/convert content) and `search_attached_file` (search within the file). Tool activity streams as [tool-call frames](streaming-protocol.md#3-tool-call-frames).
-   Attachments are persisted as part of messages in durable chats and recorded in [chat history](history-and-feedback.md) entries (except in [private mode](../chats.md#private-mode)).
-   The book editor accepts drag-and-drop uploads through the same upload endpoint (e.g. for `KNOWLEDGE` files); the [PWA share target](../ui/embedding-and-pwa.md#share-target) stores shared files the same way.
