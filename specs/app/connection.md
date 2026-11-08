# App connection

[Main specification](../_main.md) · [App integration](integration.md) · [Local API](../cli/api.md) · [Dashboard pages](../cli/dashboard-details.md) · [Status view](../cli/status-view.md) · [Updates](../cli/updates.md) · [Git synchronization](../cli/git-synchronization.md)

A project engine connects to the **Promptbook App**: the account dashboard at `app.ptbk.io`, the relays that carry encrypted browser traffic to engines behind NAT, and the signed engine UI the engine serves itself. The App connection replaces the former **Connection** page, which only presented the local dashboard address. Git synchronization is a separate mechanism and stays unchanged.

The wire contract is the platform's engine-integration guide and its contract packages (`@ptbk/protocol`, `@ptbk/engine-api`, `@ptbk/conformance`) in `webgptorg/app`. On wire details the contract code wins over this page. This page defines how Reborn maps that contract onto projects, what is implemented and how it is presented. The engine implements the contract natively, because the published `ptbk` package has no runtime dependencies and the contract packages are not published. The platform's golden vectors pin every signed and framed byte.

## Four interfaces, one engine

| Interface | Role | Authority |
| --- | --- | --- |
| Interactive terminal dashboard | Primary operator interface | Full local engine control |
| Non-interactive `ptbk` commands | Scriptable equivalent of the dashboard | Full local engine control |
| Native local console on macOS, Windows and Android | Graphical equivalent of the dashboard, for an engine on the same device | Full local engine control |
| Remote Promptbook App | Control an already paired engine through the relay | Engine operations permitted by the signed-in member's role |

The first three interfaces are peers in capability. They expose the same engine operations and observe the same state, with presentation and input adapted to each interface. An operation added to one local interface must have equivalents in the other two. The interactive terminal dashboard defines the primary operator workflow.

The machine running the engine is the final authority over its pairing. An operator on that machine can paste a one-time App URL, remove the pairing, or pair again with a different App or account. These operations apply to a running engine without restarting it. The remote App can issue a pairing URL and manage its own account records. Only local interfaces can apply that URL or remove or replace the engine's pairing. The engine must enforce this boundary at its local control entry points. Losing access to the remote App must still leave the local operator able to cut off its relay access.

## One project, one App engine

Each project engine is one App engine with its own **engine identity**: an Ed25519 key, the **engine ID** derived from it (26 lowercase base32 characters of the SHA-256 of the raw public key), the default hostname `<engineId>.<engine domain>` and the 20-character **fingerprint** code (`XXXX-XXXX-XXXX-XXXX-XXXX`) that the App dashboard shows for comparison. There is no host-wide or global App engine. A computer with five projects can link five App engines, and an unreachable server with twenty projects shows twenty unavailable projects.

The identity and the registration live in ignored project runtime state, `.ptbk/app/`: the directory is mode 0700 and owned by the engine's user, and the key file is created once with exclusive create and mode 0600, then flushed to disk with its directory before first use. A concurrent first use loads the key that won instead of overwriting it. A key that exists but cannot be read is an error, never a reason to make a new one. Loose modes, a foreign owner or a symbolic link refuse the App connection and name the path and mode, never the key. The key is used only for the `ptbk-register-v1`, `ptbk-heartbeat-v1`, `ptbk-tunnel-v1` and `ptbk-hostname-v1` signing contexts, never for TLS or ACME. Nothing in `.ptbk/app/` is committed, synchronized, traced, reported or sent to an agent.

Moving the project directory keeps its identity. A Git clone does not carry `.ptbk/`, so it becomes a new engine that needs its own link. Copying the directory together with `.ptbk/` duplicates the identity; the relays then replace one copy's tunnel with the other's. On `REPLACED` the engine stops dialling that relay and shows that another process holds the key, instead of reconnecting in a loop. A lost key is a new engine: link it again and revoke the old one in the App.

## Pairing with App

The App dashboard gives the owner a one-time **link URL**, `https://<dashboard host>/link#<link code>`, and the command `ptbk connect --link '<link URL>'`, run in the project directory. A link code stays valid for 30 days and is single use. The command creates the identity when missing, registers it with a request signed over `ptbk-register-v1` (proof of key possession, mode `tunnel`), and checks the answer: the engine ID must be the one its own key derives, and the hostname must be exactly `<engineId>.<engine domain>`. It stores the engine ID, hostname, relay list, dashboard origin, engine domain and the dashboard member key, then asks a running engine to connect. A refused answer stores nothing. A registration grants nothing inside the engine; it ties the engine to an account for routing and billing only.

`--link` accepts the link URL or a bare link code, by the contract's rules: `https:` only, no user name, password or query, the path exactly `/link` and a valid code as the fragment. A refusal names the broken rule, never the value. The link URL supplies the dashboard origin, which the command prints before it sends anything; a `PTBK_DASHBOARD_URL` naming another origin is refused with both origins named. A bare code goes to `PTBK_DASHBOARD_URL` or the default. Registration retries stay within about 30 minutes; a code's 30-day lifetime is no reason to retry for weeks. Use [pending initialization](onboarding.md) to pair an engine before project setup. The link code is a secret. It is sent once, dropped after the request and never written to disk, logs, traces, chats, briefs or snapshots. `PTBK_LINK_CODE` is accepted instead of the argument for automation. Each registration problem code becomes a sentence with a next step:

| Code | Meaning for the owner | Retry |
| --- | --- | --- |
| `invalid-link-code` | The code is unknown, expired or already used. Get a new one in the App. | Never |
| `bad-signature` | A bug in the engine; report it. | Never |
| `engine-exists` | This identity belongs to another App account. | Never |
| `engine-suspended` | The engine was suspended or revoked in the App. | Never |
| `engine-limit`, `not-entitled` | The account has no room for another engine or no plan with engines. | Never |
| `rate-limited`, 5xx, no answer | The App is busy or unreachable. | After at least 5 s, then exponential backoff, within the command's bounded attempt |

An unknown code is treated like 5xx. An already linked project makes no network call and keeps the supplied URL unused. In the interactive terminal dashboard, open **App** and press **L** to paste the URL or **U** to confirm unpairing. The native console's **App** page offers the same actions. On the command line use `ptbk connect --link '<link URL>'` and `ptbk disconnect`. The local actions use the same serialized operations for a running engine.

Unpairing forgets the stored registration, closes the tunnels and stops heartbeats. The engine identity remains available for pairing again. The App can still list the old account record. The current registry binds an engine identity to one account and refuses to move it through registration. Re-pairing that identity across accounts on the same registry requires a platform operation that releases or transfers the account binding.

Configuration comes from the environment of the engine and the command. `PTBK_DASHBOARD_URL` is an `https://` origin; without it a linked engine uses the origin stored with its registration, so a restart after a reboot or from the service keeps working, and an unlinked one uses `https://app.ptbk.io`. `PTBK_ENGINE_DOMAIN` sets the engine domain. Until the platform publishes its production engine domain, an unset engine domain is pinned from the first verified registration: the hostname's first label must be the engine's own engine ID, and the domain is stored with the registration and checked on every start. A stored dashboard origin or engine domain that differs from the configuration refuses to connect instead of re-registering silently. `PTBK_RELAYS` (comma-separated `wss://` relay URLs) replaces the registration's relays for development and tests. `HTTPS_PROXY`, `NO_PROXY` and `NODE_EXTRA_CA_CERTS` apply to registration, heartbeats and tunnels; certificate verification is never switched off, and `NODE_TLS_REJECT_UNAUTHORIZED=0` refuses the App connection with a pointer to `NODE_EXTRA_CA_CERTS`.

## The running connection

A running, linked project engine keeps its App connection: one signed heartbeat a minute and one tunnel to every relay. The connection starts with the daemon or foreground engine, not in maintenance runs. It is independent of `--no-server`, of Pause (a paused engine stays reachable for chat and controls) and of any open client. It never delays engine start, task work or shutdown, and a failure is shown on the App page, never a lifecycle state. Stopping the engine closes its tunnels and stops its heartbeats, so the App shows the project unavailable. Reaching stopped projects needs the later [host control service](integration.md#ownership-and-the-simple-host-service).

**Heartbeat.** Every 60 seconds, directly to the dashboard API (never through a relay), the engine sends numbers only: the engine version, uptime, disk and memory use rounded to tens, a CPU load class, the update state of the shared [engine self-update](../cli/updates.md) (`none`, `available`, `pending` or `installing`), the number of project agents and the number of people who can sign in to the engine through the App (0 until App sign-in exists). The body is signed over the SHA-256 of its exact bytes with `ptbk-heartbeat-v1`. Its strictly increasing sequence number is persisted before sending. A failed beat is shown and not retried before the next tick; a stale-timestamp answer shows the clock skew and asks the owner to fix the clock. The last body sent is kept verbatim, so the owner can see everything the App learns.

**Tunnels.** For each relay the engine dials `wss://<relay>/v1/tunnel` with the `ptbk-tunnel` subprotocol and verifies the relay's certificate for its hostname, also through a proxy. It signs the relay's challenge over `ptbk-tunnel-v1` only when the challenge names the relay it dialled, and checks that the relay's `ready` chose the highest common version and exactly the common features, so nothing can downgrade the session. Frames, stream IDs, flow-control windows, 25-second pings and close codes follow the contract. Tunnels are independent; one failing relay never delays another. Every close or reject other than `REPLACED` reconnects with exponential backoff and full jitter, and `SUSPENDED` or `AUTH_FAILED` are shown as the App refusing the engine.

**Browser streams.** A relay passes each browser's encrypted TLS through a stream; the engine ends that TLS itself, so the platform never sees plaintext. Each stream is routed by its ClientHello: TLS-ALPN-01 challenges go to the certificate manager, the engine's own hostname to the [engine origin](#the-engine-origin), and anything else (no SNI, another name, a malformed or oversized hello) is closed without an answer. Until the engine holds a certificate for its hostname it refuses streams with `CLOSE REFUSED`. The local HTTP API is never reachable through a tunnel.

## Presentation

The **App** tile and page replace Connection in the terminal dashboard, the browser and desktop dashboard, the status view and raw output. They show:

- the state: **Not linked**, **Linked** (with connected relays), **Connecting**, **Refused** or **Problem**, with the next step;
- the engine ID, the fingerprint code to compare with the App dashboard, and the project's App address `https://<hostname>/`;
- each relay with its state, its last problem and next retry, and "Connected to n of m relays";
- the last heartbeat time and outcome, and a clock skew when the dashboard reported one;
- whether opening the project from the App works, or what it still waits for: a connected relay, the engine's own certificate (with the issuing problem and next retry), or an owner passkey (with the `ptbk connect --setup-link` step);
- the certificate state and whether an owner is set up.

An unlinked project is neutral, not attention. Attention is raised only for something the owner can act on: an unreadable or unsafe identity, a tunnel replaced by another copy of the key, an engine the App suspended or refused, or a clock skew. `ptbk connect` without a link code prints the same status once, and `--json` prints it as data. `ptbk start` and init report one compact App line: the linked address, or that the project is not linked and how to link it.

The local dashboard address is no longer presented as a connection: no tile, page, status panel or start line shows it. The loopback API remains the private transport of local clients (the terminal dashboard, packaged clients and tests), which read its address from the process record and the snapshot's technical `localApi` field, with the existing [local protections](../cli/api.md). The App connector replaces the [deprecated standalone browser dashboard](../cli/dashboard.md#standalone-entry-deprecation) as the browser entry for full project control.

## Privacy boundary

The platform receives only the registration request, heartbeat numbers and tunnel handshakes; relays see only TLS bytes. Books, chats, tasks, files, Wallet records, traces and terminal content never go to the dashboard or a relay. Logs and errors never contain the engine key, signatures, the link code or proxy credentials; they name codes, statuses and IDs.

## The engine origin

The engine serves its App address itself, inside the tunnel. Nothing on this origin is reachable on the loopback API, and nothing on the loopback API is reachable here.

**TLS and certificates.** TLS 1.3 only, by SNI, with HTTP/1.1. The certificate for `<hostname>` comes from ACME (Let's Encrypt by default, `PTBK_ACME_DIRECTORY_URL` for another directory) with the TLS-ALPN-01 challenge answered through the relay, so no port is opened. The ACME account key is its own P-256 key in the App data directory, never the engine key. The certificate is renewed a third of its lifetime before expiry, a failed order retries with backoff and the App page shows the state, the problem and the next retry. The browser-facing certificate's SHA-256 and expiry are what `GET /security` reports.

**Owner access and the gateway.** Members sign in with passkeys only (WebAuthn on the engine's own hostname, user verification required). The first owner registers a passkey through the **setup link** `https://<hostname>/setup#<secret>`: a 128-bit secret that is single use, valid 30 minutes and stored only as its hash; each request replaces the previous secret. `ptbk connect --setup-link` prints it only to an interactive terminal (or as `--json`) and only once the address works; it waits up to 10 minutes for that, or with `--no-wait` says what is missing and exits 3. The link is never logged, traced or shown in the dashboards; the engine log says only "No owner yet. Run `ptbk connect --setup-link` …" and, once a relay and the certificate work, "Ready: https://<hostname>/". `ptbk connect --reset-owner` (confirmed by typing the start of the engine ID, or `--yes`) ends every passkey and session, then prints a new setup link; agents and project data stay. Sessions are server-side (an opaque `__Host-` cookie resolved on every request), step-up asks for a fresh assertion before sensitive routes, state-changing requests must be same-origin by `Origin` and Fetch Metadata, and every response carries the contract's exact security headers and `ENGINE_UI_CSP`. The heartbeat's `members` counts members with at least one passkey.

**Launch settings.** For an operator or the platform's harness, `PTBK_DATA_DIR` replaces `.ptbk/app/` (created 0700; a loose mode or a symbolic link refuses to start and names the path), `PTBK_LINK_CODE` registers once when there is no registration, and `PTBK_MODE=tunnel` makes any App problem a refusal to start instead of a status. The engine exits within 10 seconds of `SIGTERM`.

## Engine API

The origin serves the platform's engine API v1 (`/api/v1`) over Reborn's own domain operations, every request validated strictly against the contract's schemas, with permission checks and contract problem codes:

- **Engine, me, members, passkeys, sessions, settings and security.** `GET /security` reports the engine version, the update state of the shared [engine self-update](../cli/updates.md), the served UI, the certificate, relays, hostnames, the last heartbeat body and the clock skew.
- **Agents** are the project's Books with their [origin](../agents/_index.md) (content, core or system). Creating an agent writes a validated Book to the agents folder (former syntax converted first; diagnostics on `invalid-book`) and commits "Add agent - <name>"; deleting removes an editable content agent and commits "Remove agent - <name>", while core and system agents are `agent-engine-owned`. Folders, visibility and who created an agent are App metadata in `engine-api.json` in the App data directory (0600), never in the Books.
- **Chats** are `CHAT` threads with real authors. Every author joins before writing, a User message records which member sent it, `requestKey` makes a send idempotent (another content under the same key is `request-key-reused`), replies stream as SSE deltas that resume by `Last-Event-ID`, and a chat without an agent is Chatter's. Read and seen marks are shared with the other clients.
- **Events** stream agent, status and chat changes.

Initialized engines serve `onboarding@1` as completed. Pending initialization serves active prompts and advertises `files@1` for onboarding uploads. Other optional capabilities (`runs@1`, `triggers@1`, `integrations@1`, `wallet@1`, `tasks@1`, audit) are not advertised yet, so each of their routes answers `capability-not-supported`.

## Engine UI

The engine serves the App's signed UI bundle itself. Its **UI loader** fetches releases from the release store in mirror layout v1 (`ui/latest.json`, `release-log/ui-<version>.json`, `release-log/revocations.json`, `ui/<version>/<artifact>`, below `PTBK_UI_RELEASE_URL`) with size caps and timeouts. It installs a release only when the contract's `verifyRelease` accepts it: the release-key signature (and the maintainer threshold for security releases), Sigstore provenance from the release workflow with a transparency log entry, a valid and not rolled-back revocation list, no downgrade and the release delay fro