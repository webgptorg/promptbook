# Harness authentication without a server browser

[Main specification](../_main.md) · [Harness tools](harnesses.md) · [Adapter contract](harness-plugins.md) · [VPS onboarding](vps-onboarding.md)

Selected harnesses can be initialized through an attended terminal on a VPS without opening a browser on that server. The owner may use a browser on a phone or computer for provider consent and sign-in. This is remote-compatible native authentication, not unattended login, project-browser automation or a change of billing method.

The target [version-zero App](../app/integration.md) reuses these adapter operations during initial setup. Expose a straightforward protected App interaction where possible; otherwise surface the actual CLI/dashboard login through the agreed protected fallback. No full later harness/browser-management UI is required for that App. Preserve real service-user readiness and transient secret handling whichever client presents the attended step.

## Shared login behavior

Init and later tool setup call the same adapter-owned authentication/readiness operations. Reuse a ready native authentication instance without another sign-in; init still performs its separate minimal real functional inference check. Native subscription and explicitly selected API authentication retain their distinct [account and billing rules](harnesses.md#codex-account-login-and-billing).

The VPS launcher supplies its remote context. Ordinary init/setup also recognizes SSH/no-display environments and selects a supported terminal-compatible flow without a mandatory VPS-mode question. Allow explicit choice when detection is unsuitable; local desktops retain ordinary native login. Display availability and terminal availability are separate: redirected input does not become interactive merely because no display exists.

Run login as the engine user with the same home, selected account context, credential-store configuration and executable discovery the daemon uses. An administrator/root-only sign-in is not that user's readiness. Preserve native credential storage/refresh and unrelated accounts; do not export credentials into a new Promptbook store, copy project-browser cookies or overwrite a shared account to simulate isolation. An inaccessible service credential store is an actionable setup failure.

## Provider-specific flows

Each adapter detects the installed version's real login capabilities; do not invent one common headless-login flag.

- **OpenAI Codex** uses `codex login --device-auth` where the installed CLI and account allow it. The provider's page receives the one-time code. The native terminal offers ordinary browser login with localhost callback forwarding through SSH if needed.
- **GitHub Copilot** uses `copilot login --device-code` where supported. Its terminal can handle prompts from the CLI, including credential-store decisions. Older releases can use the CLI's interactive `/login`.
- **Gemini CLI** offers a Google AI Studio key. The terminal can use the CLI's own account and cloud authentication options. On remote hosts it sets `NO_BROWSER=true` for manual Google authorization.
- **Qwen Code** offers a QwenCloud Singapore pay-as-you-go key. The CLI's `/auth` supports its other providers and subscription modes in the terminal.
- **OpenCode** offers an OpenCode Console key. Its `opencode auth login` terminal supports its provider selection and native account flows.
- **Claude Code** runs its native `claude auth login` or `/login` interaction. Anthropic's terms reserve Claude.ai account sign-in for its own flow. Promptbook forwards the unmodified CLI's terminal, so the user pastes any return code directly into Claude Code's prompt.

[Codex](https://learn.chatgpt.com/docs/auth) · [Copilot](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/authenticate-copilot-cli) · [Gemini](https://geminicli.com/docs/get-started/authentication/) · [Qwen](https://docs.qwencloud.com/api-reference/preparation/api-key) · [OpenCode](https://opencode.ai/docs/cli/providers) · [Anthropic](https://code.claude.com/docs/en/legal-and-compliance#authentication-and-credential-use)

## Attended interaction and completion

Show the selected harness/account and exact human step: open the provider URL, enter a displayed device code on its page, or paste its return code into the terminal. Preserve the native terminal interaction. Keep the URL manually readable/copyable without assuming a shared clipboard. Do not silently launch `xdg-open` on a browserless server and wait forever or require a server desktop merely to show a URL.

The native terminal is the common fallback. It forwards input and output through the engine's private local control channel or the existing encrypted relay connection. Remote access requires the engine owner's passkey session. The engine runs the adapter's sign-in invocation in a temporary directory and limits each attempt to one attachment. Closing the terminal, leaving the step or timing out drops the transcript.

API-key setup is an explicit authentication choice. The engine verifies the key with the corresponding CLI before retaining it in its private setup area, then moves it into the project's ignored `.env`. Project configuration holds an environment-variable reference. Provider account sign-in continues to use the provider's own credentials and storage.

Codes and credential-bearing URLs remain transient to attended authentication; redact persisted logs, traces and diagnostics. Tokens, refresh credentials, API keys and returned sign-in codes never enter Books, Git, ordinary task/chat messages or installer arguments. The owner supplies passwords/MFA on the provider's actual page, not to an agent.

Distinguish waiting, actual native success, cancellation, expiry, denial, unsupported method, missing executable and service-context discovery failure. Retry returns to the same setup with intent/completed steps preserved; only explicit deselection removes an incomplete selected integration. No hidden human prompt may be left in a daemon or noninteractive invocation.

After login, recheck the selected instance through its real non-inference readiness mechanism in the service's effective environment. A printed URL, entered code, created file or launcher exit alone is insufficient. Authentication is separate from quota, model entitlement and paid API access. Continue ordinary init/start/dashboard once essential setup is complete. Runtime uses supported autonomous execution without another hidden login; later access loss follows ordinary live-tool waits and attended repair.

## Acceptance scenarios

- Signed-out Codex over SSH without a display offers device login completable on another device. A disabled policy has an honest supported recovery; an ambient API key never changes native billing.
- Signed-out Claude exposes its real URL and supported terminal code return without a VPS browser or shared clipboard. No unsupported device-auth flag is invoked.
- Existing ready native login is reused without another sign-in; the distinct real inference test is still required for new initialization. Administrator-only credentials, inaccessible stores and daemon PATH failures are not accepted as engine-account readiness.
- Expiry, denial or cancellation preserves incomplete setup and its reason; retry continues the same wizard, while removal requires explicit deselection. No duplicate first task or worker results.
- Unsupported remote login is explained promptly; local desktop login and explicit method choice still work. Noninteractive setup never waits on unseen human input.
- Readiness is verified after login in service context. Persisted output/Git contain no tokens, returned sign-in codes or credential-bearing URLs; successful init reaches the ordinary terminal dashboard.

## Preserve authentication across session transports

[Session control](harness-sessions.md) must use the selected instance's supported native subscription or API route. Authentication mechanism and payment model are separate: a key may represent a provider plan rather than generic API billing. Verify eligibility for the chosen CLI/server/SDK and deployment context; native attachment to one backend does not prove SDK/subscription interchangeability. Preserve provider, endpoint, native profile, account and billing provenance on reconnect. Missing capability cannot trigger silent API spending, login replacement or cross-account execution. Viewing common session detail requires no new login by itself.
