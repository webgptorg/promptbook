[ ] !

[✨🐙] Fix Agents server

-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)

# Application Error Report

## Human Summary

A server exception occurred while loading Promptbook Agents Server.

Loading chunk 311 failed.
(timeout: https://s23.ptbk.io/_next/static/chunks/311-c7f5e459a3f6c430.js) - the server for Promptbook Agents Server logged this failure.

## Correlation

-   Server: `Promptbook Agents Server`
-   Variant: `advanced`
-   Digest: `0991226956`
-   Next.js digest: `_Unavailable_`
-   Reported at (UTC): `2026-06-09T16:45:36.999Z`

## Request Context

-   Page URL: `https://s23.ptbk.io/agents/4ScPqrYkPu8oKZ/chat?chat=nQWVVgFPdxTK6w`

## Exception

-   Name: `ChunkLoadError`

### Message

```text
Loading chunk 311 failed.
(timeout: https://s23.ptbk.io/_next/static/chunks/311-c7f5e459a3f6c430.js)
```

### Stack Trace

```text
ChunkLoadError
    at a.f.j (https://s23.ptbk.io/_next/static/chunks/webpack-f2294abed3c15575.js:1:6393)
    at https://s23.ptbk.io/_next/static/chunks/webpack-f2294abed3c15575.js:1:1253
    at Array.reduce (<anonymous>)
    at a.e (https://s23.ptbk.io/_next/static/chunks/webpack-f2294abed3c15575.js:1:1232)
    at c (https://s23.ptbk.io/_next/static/chunks/1902-525a296c674c4d89.js:1:111649)
    at https://s23.ptbk.io/_next/static/chunks/1902-525a296c674c4d89.js:1:126254
    at t (https://s23.ptbk.io/_next/static/chunks/1902-525a296c674c4d89.js:1:127712)
```

## Raw Report Payload

```json
{
    "variant": "advanced",
    "serverName": "Promptbook Agents Server",
    "digest": "0991226956",
    "errorName": "ChunkLoadError",
    "errorMessage": "Loading chunk 311 failed.\n(timeout: https://s23.ptbk.io/_next/static/chunks/311-c7f5e459a3f6c430.js)",
    "errorStack": "ChunkLoadError\n    at a.f.j (https://s23.ptbk.io/_next/static/chunks/webpack-f2294abed3c15575.js:1:6393)\n    at https://s23.ptbk.io/_next/static/chunks/webpack-f2294abed3c15575.js:1:1253\n    at Array.reduce (<anonymous>)\n    at a.e (https://s23.ptbk.io/_next/static/chunks/webpack-f2294abed3c15575.js:1:1232)\n    at c (https://s23.ptbk.io/_next/static/chunks/1902-525a296c674c4d89.js:1:111649)\n    at https://s23.ptbk.io/_next/static/chunks/1902-525a296c674c4d89.js:1:126254\n    at t (https://s23.ptbk.io/_next/static/chunks/1902-525a296c674c4d89.js:1:127712)",
    "pageUrl": "https://s23.ptbk.io/agents/4ScPqrYkPu8oKZ/chat?chat=nQWVVgFPdxTK6w",
    "reportedAt": "2026-06-09T16:45:36.999Z"
}
```
