# Harness authentication without a server browser

[Main specification](../_main.md) · [Harness tools](harnesses.md) · [Adapter contract](harness-plugins.md) · [VPS onboarding](vps-onboarding.md)

Selected harnesses can be initialized through an attended terminal on a VPS without opening a browser on that server. The owner may use a browser on a phone or computer for provider consent and sign-in. This is remote-compatible native authentication, not unattended login, project-browser automation or a change of billing method.

## Shared login behavior

Init and later tool setup call the same adapter-owned authentication/readiness operations. Reuse a ready instance without another sign-in or paid inference probe. Native subscription and explicitly selected API authentication retain their distinct [account and billing rules](harnesses.md#codex-account-login-and-billing).

The VPS launcher supplies its remote context. Ordinary init/setup also recognizes SSH/no-display environments and selects a supported terminal-compatible flow without a mandatory VPS-mode question. Allow explicit choice when detection is unsuitable; local desktops retain ordinary native login. Display availability and terminal availability are separate: redirected input does not become interactive merely because no display exists.

Run login as the engine user with the same home, selected account context, credential-store configuration and executable discovery the daemon uses. An administrator/root-only sign-in is not that user's readiness. Preserve native credential storage/refresh and unrelated accounts; do not export credentials into a new Promptbook store, copy project-browser cookies or overwrite a shared account to simulate isolation. An inaccessible service credential store is an actionable setup failure.

## Provider-specific flows

Each adapter detects the installed version's real login capabilities; do not invent one common headless-login flag.

- **OpenAI Codex:** prefer `codex login --device-auth` for missing native sign-in on a VPS. Show the returned verification URL and one-time code; the owner opens the URL on another device and enters the code there. Device-code login may need enabling in personal security settings or permission from a workspace administrator. If unavailable/unsupported, explain the limitation and offer a supported alternative such as localhost callback forwarding through SSH, or another explicitly selected integration. Never silently switch to paid API authentication or require an API key for a valid ChatGPT login.
- **Claude Code:** use supported native login (`claude auth login` or the native setup interaction as appropriate). Surface its login URL for opening on another device. Where the native flow offers a return code, let the owner paste it into the terminal prompt and continue that login. Do not invent a Codex-style device-auth flag or assume a remote URL reaches a server-local callback. If the installed flow cannot complete that return, use its documented alternative or report the limitation.
- **Other harnesses:** declare supported terminal/device-code/manual-code/callback methods per authentication type. Otherwise explain what is missing before waiting for impossible input. API keys remain an explicit tool choice through protected secret setup and symbolic environment references, not a universal VPS prerequisite.

Provider references checked 2026-10-29: [Codex authentication](https://developers.openai.com/codex/auth) and [Claude Code authentication](https://code.claude.com/docs/en/authentication). These establish mechanisms, not the owner's entitlement or successful sign-in. Adapters still check installed-version capabilities.

## Attended interaction and completion

Show the selected harness/account and exact human step: open the provider URL, enter a displayed device code on its page, or paste its return code into the terminal. Preserve the native terminal interaction. Keep the URL manually readable/copyable without assuming a shared clipboard. Do not silently launch `xdg-open` on a browserless server and wait forever or require a server desktop merely to show a URL.

Codes and credential-bearing URLs remain transient to attended authentication; redact persisted logs, traces and diagnostics. Tokens, refresh credentials, API keys and returned sign-in codes never enter Books, Git, ordinary task/chat messages or installer arguments. The owner supplies passwords/MFA on the provider's actual page, not to an agent.

Distinguish waiting, actual native success, cancellation, expiry, denial, unsupported method, missing executable and service-context discovery failure. Retry returns to the same setup with intent/completed steps preserved; only explicit deselection removes an incomplete selected integration. No hidden human prompt may be left in a daemon or noninteractive invocation.

After login, recheck the selected instance through its real non-inference readiness mechanism in the service's effective environment. A printed URL, entered code, created file or launcher exit alone is insufficient. Authentication is separate from quota, model entitlement and paid API access. Continue ordinary init/start/dashboard once essential setup is complete. Runtime uses supported autonomous execution without another hidden login; later access loss follows ordinary live-tool waits and attended repair.

## Acceptance scenarios

- Signed-out Codex over SSH without a display offers device login completable on another device. A disabled policy has an honest supported recovery; an ambient API key never changes native billing.
- Signed-out Claude exposes its real URL and supported terminal code return without a VPS browser or shared clipboard. No unsupported device-auth flag is invoked.
- Existing ready native login is reused without paid probes. Administrator-only credentials, inaccessible stores and daemon PATH failures are not accepted as engine-account readiness.
- Expiry, denial or cancellation preserves incomplete setup and its reason; retry continues the same wizard, while removal requires explicit deselection. No duplicate first task or worker results.
- Unsupported remote login is explained promptly; local desktop login and explicit method choice still work. Noninteractive setup never waits on unseen human input.
- Readiness is verified after login in service context. Persisted output/Git contain no tokens, returned sign-in codes or credential-bearing URLs; successful init reaches the ordinary terminal dashboard.
