[-]

[🔐] Fix unauthenticated file uploads to Agents Server CDN storage

-   The generic upload endpoint [`apps/agents-server/src/app/api/upload/route.ts`](apps/agents-server/src/app/api/upload/route.ts) accepts multipart uploads without requiring a signed-in user, API key, upload token, or admin session. Any anonymous client can store arbitrary files through the server's configured CDN/storage backend and create upload records with `userId: null`.
-   The route reads the entire uploaded file into memory with `Buffer.from(await file.arrayBuffer())`, uploads it via `$provideCdnForServer().setItem(...)`, and only then runs the optional VirusTotal security check. A failed scan is recorded in the database, but the content has already been written to storage. This creates a public storage-abuse and resource-exhaustion path: attackers can burn bandwidth/storage, host unwanted content, fill audit tables, and repeatedly force memory-heavy uploads up to the configured maximum size.
-   The vulnerable code path also trusts caller-controlled metadata:
    -   `pathname`, `contentType`, and `purpose` are accepted from the request body.
    -   [`apps/agents-server/src/utils/getUserIdFromRequest.ts`](apps/agents-server/src/utils/getUserIdFromRequest.ts) currently resolves only the signed session cookie and has a TODO for API keys, so anonymous uploads are not tied to a billable/authenticated identity.
    -   [`apps/agents-server/src/utils/upload/createBookEditorUploadHandler.ts`](apps/agents-server/src/utils/upload/createBookEditorUploadHandler.ts) points browser upload flows at `/api/upload`, so legitimate book/chat/admin upload callers need a compatible authenticated path.
-   The fix should require an authenticated or explicitly delegated identity before accepting uploads:
    1.  For normal book editor, admin metadata, server image, and authenticated chat uploads, require `getCurrentUser()` or API-key authentication and persist the resolved `userId`.
    2.  If anonymous public-agent chat attachments must remain supported, issue short-lived scoped upload tokens from an already-authorized chat/profile context. Tokens should bind `purpose`, target agent/chat/session, maximum size, content type, and expiration, then `/api/upload` should verify the token before storing anything.
    3.  Reject unknown `purpose` values with an allowlist instead of trusting arbitrary caller-provided strings.
    4.  Add per-user / per-token / per-IP rate limits and storage quotas.
    5.  Enforce request size and content type as early as possible, and consider quarantine storage or blocking public availability until malware scanning passes.
-   Add tests that anonymous uploads are rejected, signed-in uploads still work for the existing UI flows, API-key or token-based uploads resolve the correct owner, oversize files are rejected before storage, and dangerous or unknown `purpose` values are rejected.
-   Do a proper analysis of the current functionality before you start implementing. Search all callers of `bookEditorUploadHandler`, `chatFileUploadHandler`, and `/api/upload` so the fix does not break legitimate upload flows.
-   Keep in mind the DRY _(don't repeat yourself)_ principle and the SOLID principles. Share validation and identity resolution helpers instead of adding one-off upload checks in the route body.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

