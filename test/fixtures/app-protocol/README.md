# Promptbook App protocol golden vectors

Copied unchanged from [webgptorg/app](https://github.com/webgptorg/app) `packages/protocol` (MIT License, Copyright (c) 2026 The Promptbook Authors) at commit `606b7440f33d8d0356b7fe8938ffd9d6ea9a0840`:

| File here                     | Source                                                |
| ----------------------------- | ----------------------------------------------------- |
| `signed-message-vectors.json` | `packages/protocol/src/signed-message-vectors.json`   |
| `fingerprint-vectors.json`    | `packages/protocol/src/fingerprint-vectors.json`      |
| `tunnel-vectors.json`         | `packages/protocol/src/tunnel/vectors.json`           |

They were computed independently of any implementation (Python's standard library and OpenSSL, see each file's description). `test/app-connection.test.mjs` checks the engine's native implementation against them: registration and heartbeat signatures, the engine fingerprint, the tunnel handshake and the tunnel frame codec. Refresh them from the same paths when the contract changes; never edit them here.
