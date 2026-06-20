[x] ~$0.00 an hour by OpenAI Codex `gpt-5.5`

[✨🐙] Fix Agents server

-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)

# Application Error Report

## Human Summary

A server exception occurred while loading Promptbook Agents Server.

The browser could not load the latest application files for Promptbook Agents Server. Refreshing the page usually resolves this after a deployment or stale cached shell.

## Correlation

-   Server: `Promptbook Agents Server`
-   Variant: `advanced`
-   Digest: `2920498923`
-   Next.js digest: `_Unavailable_`
-   Reported at (UTC): `2026-06-11T12:45:42.008Z`

## Request Context

-   Page URL: `https://s23.ptbk.io/admin/api-tokens`

## Exception

-   Name: `ChunkLoadError`

### Message

```text
Loading chunk 626 failed.
(timeout: https://s23.ptbk.io/_next/static/chunks/app/admin/api-tokens/page-8c66b7cc6477e932.js)
```

### Stack Trace

```text
ChunkLoadError
    at a.f.j (https://s23.ptbk.io/_next/static/chunks/webpack-59544f8f0ad0d809.js:1:6393)
    at https://s23.ptbk.io/_next/static/chunks/webpack-59544f8f0ad0d809.js:1:1253
    at Array.reduce (<anonymous>)
    at a.e (https://s23.ptbk.io/_next/static/chunks/webpack-59544f8f0ad0d809.js:1:1232)
    at c (https://s23.ptbk.io/_next/static/chunks/1902-525a296c674c4d89.js:1:111649)
    at https://s23.ptbk.io/_next/static/chunks/1902-525a296c674c4d89.js:1:126254
    at t (https://s23.ptbk.io/_next/static/chunks/1902-525a296c674c4d89.js:1:127712)
```

## Raw Report Payload

```json
{
    "variant": "advanced",
    "serverName": "Promptbook Agents Server",
    "digest": "2920498923",
    "errorName": "ChunkLoadError",
    "errorMessage": "Loading chunk 626 failed.\n(timeout: https://s23.ptbk.io/_next/static/chunks/app/admin/api-tokens/page-8c66b7cc6477e932.js)",
    "errorStack": "ChunkLoadError\n    at a.f.j (https://s23.ptbk.io/_next/static/chunks/webpack-59544f8f0ad0d809.js:1:6393)\n    at https://s23.ptbk.io/_next/static/chunks/webpack-59544f8f0ad0d809.js:1:1253\n    at Array.reduce (<anonymous>)\n    at a.e (https://s23.ptbk.io/_next/static/chunks/webpack-59544f8f0ad0d809.js:1:1232)\n    at c (https://s23.ptbk.io/_next/static/chunks/1902-525a296c674c4d89.js:1:111649)\n    at https://s23.ptbk.io/_next/static/chunks/1902-525a296c674c4d89.js:1:126254\n    at t (https://s23.ptbk.io/_next/static/chunks/1902-525a296c674c4d89.js:1:127712)",
    "pageUrl": "https://s23.ptbk.io/admin/api-tokens",
    "reportedAt": "2026-06-11T12:45:42.008Z"
}
```

