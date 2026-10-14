# Remote dashboard access

[Main specification](../_main.md) · [Service API](api.md) · [Provider decision](tunnel-options.md)

## Default and CLI controls

When start enables HTTP, it also enables a managed outbound tunnel by default. A user scanning the terminal QR code on a phone using mobile data can reach this same project's dashboard without a VPN client, port forwarding, a second terminal or a separate frontend deployment. The local listener remains loopback-only; tunneling is not permission to bind every interface or expose arbitrary local ports.

`--no-tunnel` disables remote publishing, provider contact and tunnel processes for that invocation while keeping local HTTP available. `--tunnel` explicitly enables it. `--no-server` implicitly disables the tunnel; explicit enablement together with no-server is an error. `--no-qr` changes presentation only. Enablement, provider and non-secret provider options follow project configuration and CLI precedence; raw/noninteractive output does not change the exposure policy. Report whether remote access is enabled, disabled, connecting, ready or degraded and name the relay provider.

Use `cloudflare-quick` as the initial account-free local-development default. Support an explicitly configured `cloudflare-named` connection for a stable user-managed hostname; `--tunnel-provider <provider>` selects an available integration. Unknown or incomplete explicit configurations are diagnosed, not silently replaced. The [comparison](tunnel-options.md) is not a requirement to implement every evaluated provider.

Supply the necessary supported tunnel client through normal package/setup handling and reuse a compatible installation; no manual command should be needed after successful setup. Missing prerequisites have an actionable setup outcome. Read-only commands never install or start it. Do not alter unrelated provider configuration, create an account/domain/DNS route, accept paid terms or upgrade a plan automatically. Init prepares configured prerequisites and explains the default exposure and opt-out; it does not publish a service unless the user requested an intent workflow that starts it.

## Authentication before exposure

A public hostname is not authorization. Before opening the tunnel, protect both project data and every control endpoint with project-scoped authentication. An unauthenticated browser may obtain only the minimal app/pairing shell, never agent/task content, logs, request details, settings or control authority. Fail closed if this protection cannot be established; continuing locally must not expose an unprotected service.

Use a short-lived, single-use pairing link for the initial trusted local terminal QR and its identical readable link. Redeeming it establishes an authenticated, expiring, revocable device session for that project. A pairing capability is a secret, not the service's public identifier: carry it outside URL query/path logging, remove it from the browser address after exchange, and do not persist it in ordinary logs, traces, Git, analytics or referrers. Provide a trusted local way to renew expired/consumed pairing and revoke paired devices. Merely knowing the hostname cannot obtain a new pairing capability.

Startup may prepare the initial capability. Read-only status/show and automatic dashboard refresh only display its existing availability, never silently mint or rotate credentials. Renewing pairing is an explicit trusted local control; a consumed or expired code is labeled unusable with that action available. Pairing details may live only in access-controlled ignored runtime state, not versioned configuration or ordinary status telemetry.

Ordinary API/status output and the remote browser's connection panel expose the public base URL, not reusable credentials or a way for an unauthenticated visitor to mint access. A locally displayed pairing code/link is clearly labeled sensitive and time-limited. Raw/redirected output preserves the public URL without automatically dumping pairing secrets. Direct API clients use explicitly issued project-scoped credentials, not browser-only provider email login. Pairing and API authentication are rate-limited; use protected sessions, origin/CSRF checks and exact trusted proxy/origin handling rather than trusting every loopback-looking forwarded request.

Remote clients receive only existing authorized project capabilities; the tunnel is not a shell, filesystem server or permission escalation. Provider credentials stay outside versioned configuration. Disclose third-party relay trust and do not claim end-to-end confidentiality from the relay merely because the URL uses HTTPS.

## Lifecycle, compatibility and failures

The project service owns one tunnel to its actual HTTP port, independent of dashboard clients. Repeated start, status/show, additional clients and page refresh do not create another tunnel or worker. Service stop closes its owned tunnel; restart/reboot recovery restores the configured policy. Finite run with HTTP follows the same enabled policy only for that invocation and tears it down when finished. Disablement and credential revocation must not leave old remote sessions with authority.

Do not block agent execution indefinitely on DNS, provider availability or internet connectivity. Start makes a bounded connection attempt, reports local-service and remote-access outcomes separately, and retries transient tunnel failures with backoff while local controls and safe work continue. Never advertise a localhost QR as remote access, report a stale address as ready, switch providers/accounts without permission or open the service without authentication to recover availability.

Only publish a verified assigned HTTPS endpoint pointing to the correct protected project service. Keep the current public address, local address, connection health and pairing expiry coherent across clients. A changed hostname invalidates stale connection/pairing information; restore paired access only when its project identity and authorization remain valid. Do not promise permanent URLs or production availability for an ephemeral provider.

All required SPA/API operations must work through the chosen tunnel. Remote live state cannot depend exclusively on a streaming transport that the provider does not support; provide a compatible update path, including bounded polling when necessary. Handle disconnection and reconnect without duplicate mutations or answers. Authentication and status responses must not be cached publicly by the relay.

## Acceptance outcomes

After default startup on supported, connected systems, scan the pairing QR on a phone outside the local network: complete pairing, see live state, answer a request and observe the same result locally. The bare public URL without authorization discloses no project data and cannot control work. Verify expired/reused pairing, explicit renewal, session revocation, cross-origin attempts, raw output and credential redaction. Repeated inspection or refresh cannot rotate credentials or create another pairing opportunity.

Test no-tunnel, no-server, provider failure, blocked outbound network, non-default local port, multiple projects, repeated start, client closure and service restart. Local work remains usable during tunnel failure; no duplicate worker/tunnel or stale-ready URL appears. Verify live updates with the selected provider's actual transport limits and show a new URL honestly after an ephemeral tunnel is replaced.
