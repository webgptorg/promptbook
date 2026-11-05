# App connection

[Main specification](../_main.md) · [App integration](integration.md) · [Local API](../cli/api.md) · [Dashboard pages](../cli/dashboard-details.md) · [Status view](../cli/status-view.md) · [Updates](../cli/updates.md) · [Git synchronization](../cli/git-synchronization.md)

A project engine connects to the **Promptbook App**: the account dashboard at `app.ptbk.io`, the relays that carry encrypted browser traffic to engines behind NAT, and the signed engine UI the engine serves itself. The App connection replaces the former **Connection** page, which only presented the local dashboard address. Git synchronization is a separate mechanism and stays unchanged.

The wire contract is the platform's engine-integration guide and its contract packages (`@ptbk/protocol`, `@ptbk/engine-api`, `@ptbk/conformance`) in `webgptorg/app`. On wire details the contract code wins over this page. This page defines how Reborn maps that contract onto projects, what is implemented and how it is presented. The engine implements the contract natively, because the published `ptbk` package has no runtime dependencies and the contract packages are not published. The platform's golden vectors pin every signed and framed byte.

## One project, one App engine

Each project engine is one App engine with its own **engine identity**: an Ed25519 key, the **engine ID** derived from it (26 lowercase base32 characters of the SHA-256 of the raw public key), the default hostname `<engineId>.<engine domain>` and the 20-character **fingerprint** code (`XXXX-XXXX-XXXX-XXXX-XXXX`) that the App dashboard shows for comparison. There is no host-wide or global App engine. A computer with five projects can link five App engines, and an unreachable server with twenty projects shows twenty unavailable projects.

The identity and the registration live in ignored project runtime state, `.ptbk/app/`: the directory is mode 0700 and owned by the engine's user, and the key file is created once with exclusive create and mode 0600, then flushed to disk with its directory before first use. A concurrent first use loads the key that won instead of overwriting it. A key that exists but cannot be read is an error, never a reason to make a new one. Loose modes, a foreign owner or a symbolic link refuse the App connection and name the path and mode, never the key. The key is used only for the `ptbk-register-v1`, `ptbk-heartbeat-v1`, `ptbk-tunnel-v1` and `ptbk-hostname-v1` signing contexts, never for TLS or ACME. Nothing in `.ptbk/app/` is committed, synchronized, traced, reported or sent to an agent.

Moving the project directory keeps its identity. A Git clone does not carry `.ptbk/`, so it becomes a new engine that needs its own link. Copying the directory together with `.ptbk/` duplicates the identity; the relays then replace one copy's tunnel with the other's. On `REPLACED` the engine stops dialling that relay and shows that another process holds the key, instead of reconnecting in a loop. A lost key is a new engine: link it again and revoke the old one in the App.

## Linking with a link code

The App dashboard gives the owner a one-time link code and the command `ptbk connect --link <code>`, run in the project directory. The command creates the identity when missing, registers it with a request signed over `ptbk-register-v1` (proof of key possession, mode `tunnel`), and checks the answer: the engine ID must be the one its own key derives, and the hostname must be exactly `<engineId>.<engine domain>`. It stores the engine ID, hostname, relay list, dashboard origin, engine domain and the dashboard member key, then asks a running engine to connect. A refused answer stores nothing. A registration grants nothing inside the engine; it ties the engine to an account for routing and billing only.

The link code is a secret. It is sent once, dropped after the request and never written to disk, logs, traces, chats, briefs or snapshots. `PTBK_LINK_CODE` is accepted instead of the argument for automation. Each registration problem code becomes a sentence with a next step:

| Code | Meaning for the owner | Retry |
| --- | --- | --- |
| `invalid-link-code` | The code is unknown, expired or already used. Get a new one in the App. | Never |
| `bad-signature` | A bug in the engine; report it. | Never |
| `engine-exists` | This identity belongs to another App account. | Never |
| `engine-suspended` | The engine was suspended or revoked in the App. | Never |
| `engine-limit`, `not-entitled` | The account has no room for another engine or no plan with engines. | Never |
| `rate-limited`, 5xx, no answer | The App is busy or unreachable. | After at least 5 s, then exponential backoff, within the command's bounded attempt |

An unknown code is treated like 5xx. An already linked project makes no network call: `connect --link` reports the existing link. `ptbk disconnect` stops the project's tunnels and heartbeat and forgets the registration while keeping the identity, so a new link code from the same account links the same engine ID again. It does not revoke the engine in the App; the owner does that in the dashboard.

Configuration comes from the environment of the engine and the command. `PTBK_DASHBOARD_URL` is an `https://` origin, `https://app.ptbk.io` by default. `PTBK_ENGINE_DOMAIN` sets the engine domain. Until the platform publishes its production engine domain, an unset engine domain is pinned from the first verified registration: the hostname's first label must be the engine's own engine ID, and the domain is stored with the registration and checked on every start. A stored dashboard origin or engine domain that differs from the configuration refuses to connect instead of re-registering silently. `PTBK_RELAYS` (comma-separated `wss://` relay URLs) replaces the registration's relays for development and tests. `HTTPS_PROXY`, `NO_PROXY` and `NODE_EXTRA_CA_CERTS` apply to registration, heartbeats and tunnels; certificate verification is never switched off, and `NODE_TLS_REJECT_UNAUTHORIZED=0` refuses the App connection with a pointer to `NODE_EXTRA_CA_CERTS`.

## The running connection

A running, linked project engine keeps its App connection: one signed heartbeat a minute and one tunnel to every relay. The connection starts with the daemon or foreground engine, not in maintenance runs. It is independent of `--no-server`, of Pause (a paused engine stays reachable for chat and controls) and of any open client. It never delays engine start, task work or shutdown, and a failure is shown on the App page, never a lifecycle state. Stopping the engine closes its tunnels and stops its heartbeats, so the App shows the project unavailable. Reaching stopped projects needs the later [host control service](integration.md#ownership-and-the-simple-host-service).

**Heartbeat.** Every 60 seconds, directly to the dashboard API (never through a relay), the engine sends numbers only: the engine version, uptime, disk and memory use rounded to tens, a CPU load class, the update state of the shared [engine self-update](../cli/updates.md) (`none`, `available`, `pending` or `installing`), the number of project agents and the number of people who can sign in to the engine through the App (0 until App sign-in exists). The body is signed over the SHA-256 of its exact bytes with `ptbk-heartbeat-v1`. Its strictly increasing sequence number is persisted before sending. A failed beat is shown and not retried before the next tick; a stale-timestamp answer shows the clock skew and asks the owner to fix the clock. The last body sent is kept verbatim, so the owner can see everything the App learns.

**Tunnels.** For each relay the engine dials `wss://<relay>/v1/tunnel` with the `ptbk-tunnel` subprotocol and verifies the relay's certificate for its hostname, also through a proxy. It signs the relay's challenge over `ptbk-tunnel-v1` only when the challenge names the relay it dialled, and checks that the relay's `ready` chose the highest common version and exactly the common features, so nothing can downgrade the session. Frames, stream IDs, flow-control windows, 25-second pings and close codes follow the contract. Tunnels are independent; one failing relay never delays another. Every close or reject other than `REPLACED` reconnects with exponential backoff and full jitter, and `SUSPENDED` or `AUTH_FAILED` are shown as the App refusing the engine.

**Browser streams.** A relay passes each browser's encrypted TLS through a stream; the engine ends that TLS itself, so the platform never sees plaintext. Serving the App UI needs the remaining engine work below. Until it exists the engine refuses each stream with `CLOSE REFUSED`, and the App page says that opening the project from the App is not available yet. The local HTTP API is never reachable through a tunnel.

## Presentation

The **App** tile and page replace Connection in the terminal dashboard, the browser and desktop dashboard, the status view and raw output. They show:

- the state: **Not linked**, **Linked** (with connected relays), **Connecting**, **Refused** or **Problem**, with the next step;
- the engine ID, the fingerprint code to compare with the App dashboard, and the project's App address `https://<hostname>/`;
- each relay with its state, its last problem and next retry, and "Connected to n of m relays";
- the last heartbeat time and outcome, and a clock skew when the dashboard reported one;
- whether opening the project from the App works yet.

An unlinked project is neutral, not attention. Attention is raised only for something the owner can act on: an unreadable or unsafe identity, a tunnel replaced by another copy of the key, an engine the App suspended or refused, or a clock skew. `ptbk connect` without a link code prints the same status once, and `--json` prints it as data. `ptbk start` and init report one compact App line: the linked address, or that the project is not linked and how to link it.

The local dashboard address is no longer presented as a connection: no tile, page, status panel or start line shows it. The loopback API remains the private transport of local clients (the terminal dashboard, the desktop app, the local browser dashboard and tests), which read its address from the process record and the snapshot's technical `localApi` field, with the unchanged [local protections](../cli/api.md).

## Privacy boundary

The platform receives only the registration request, heartbeat numbers and tunnel handshakes; relays see only TLS bytes. Books, chats, tasks, files, Wallet records, traces and terminal content never go to the dashboard or a relay. Logs and errors never contain the engine key, signatures, the link code or proxy credentials; they name codes, statuses and IDs.

## Remaining engine work

The platform's implementation plan orders what makes a project usable from the App. Each part keeps the boundaries above:

1. **TLS inside the tunnel and certificates:** a ClientHello router, TLS 1.3 by SNI and ACME TLS-ALPN-01 through the relay, with the ACME account key separate from the engine key.
2. **Gateway:** passkey sign-in on the engine's own hostname, an owner setup link printed only in the project's terminal (`https://<hostname>/setup#<secret>`), server-side sessions, step-up, Fetch Metadata checks and the exact security headers.
3. **Engine API v1:** the platform's routes over Reborn's domain operations. Agents carry their [origin](../agents/_index.md) (content, core or system), chats are `CHAT` threads with real authors, `wallet@1` maps onto the [Wallet](../cli/wallet.md) operations, `tasks@1` is the read-only task inventory, and `onboarding@1` is the pending App-started init. Unsupported capabilities are not advertised.
4. **UI loader:** fetching, Sigstore verification, the release delay, revocation and serving the signed UI bundle.
5. **Host control service** for stopped projects and the conformance build with `conformance-session`.

Until then the App shows the project linked and online, and the project is used through the terminal and the desktop app.
