# Harness tools: setup, accounts and execution

[Main specification](../_main.md) · [Unified tools](tools.md) · [Live tool use](tool-runtime.md)

A harness provides model/tool execution, not agent identity or browser website sessions. Supported canonical variants are `OPENAI_CODEX`, `CLAUDE_CODE`, `GITHUB_COPILOT`, `CLINE`, `OPENCODE`, `GEMINI` and `QWEN_CODE`, behind the common [plugin contract](harness-plugins.md). `tools` may contain several named instances of any variant, not just one configuration per provider.

## Global executables, per-instance authentication

The project's ordered tool records select enabled instances and non-secret setup. Supported, installed, configured, enabled and usable are different states. An installed unselected integration is not an implicit fallback. CLI overrides follow [configuration precedence](configuration.md) and cannot authorize an otherwise forbidden route.

Install harness CLIs globally in the user's environment, not as per-project copies under `.ptbk/` or project dependencies. Discover the actual executable, version, models, capabilities and the selected instance's authentication context. Reuse healthy existing setup. A native account or credential context may be instance-specific even though the executable is shared. Coordinate updates of that shared executable rather than updating it separately for every configured account.

For `authentication: NATIVE`, reuse the selected native account/subscription context; `accountProfile` identifies a distinct supported context when needed. For `authentication: API_KEY`, resolve only that instance's symbolic `apiKey` reference and explicitly select API authentication. Never let an unrelated active global account override an explicitly selected API tool or let an ambient API key turn a native tool into paid API execution. Do not overwrite a shared global login to simulate multiple independent subscriptions. Unsupported account isolation is a capability error, not successful pooling.

The service uses the same non-secret executable/native-store discovery paths that passed setup, including version-manager bins. A shell login working while the daemon cannot find its executable is discovery failure, not signed-out status. Preserve discovery through [persistent startup](persistence.md) and expose the real repair action.

## Simple setup and continuous readiness

Use the existing featured/More picker. Users may select one or several integrations; initialize/configure only their choices and only missing prerequisites. Normal init does not ask them to build advanced fallback chains or multiple account profiles. Every selected initial tool must actually complete installation, login and authorized noninteractive readiness; opening a login page is not completion. A cancelled/deferred initial integration remains incomplete unless the user explicitly removes it from the selection.

Once the project is initialized, later resource loss does not mean the service has failed to start or exited. Check before every task, on inventory changes and during waits; display missing executables, credentials, quotas or capabilities and use configured alternatives. No usable harness means running/controllable but waiting for tools. Fixer can help when execution resources exist; no imaginary agent runs without them. Readiness inspection is not an implicit paid model call. Read-only commands do not install, update or authenticate.

On SSH/browserless hosts, use the shared [remote-compatible authentication](harness-authentication.md): the adapter selects an installed-version-supported terminal flow, the owner completes provider sign-in on another device when needed, and readiness is rechecked under the actual engine user's service context. Local desktop setup keeps ordinary native login. A headless project browser is not a harness authentication method.

Browser website sessions and native harness authentication remain independent even when a harness opens its own login page. Never transfer project-browser cookies into a harness or put account secrets in versioned configuration.

## Selection and fallback

Different variants may be chosen for their strengths even while the first listed variant is healthy. Within the same variant, use the first eligible usable enabled tool in array order; later instances are fallback for unavailable earlier ones, not arbitrary load-balancing. Supported chains include multiple subscriptions, subscription then API, and multiple authorized billing accounts. A recovered earlier instance regains priority on a future selection without terminating work already using a fallback.

Preserve explicit task/model/account requirements. Respect configured paid-use limits; newly discovered keys do not authorize spending. After a known quota failure, use a configured authorized fallback promptly rather than waiting unnecessarily or retrying the exhausted account forever. If no candidate is usable, retain the actual wait and recheck opportunity. Never replay completed external effects when changing harness/account.

Run the selected global integration over the project with effective [agent context](agent-context.md) in its supported autonomous exec mode. Return actual success, failure, missing login, quota, cancellation and effective model/effort plus the named tool instance. Completion-looking text cannot override a failed turn/process. Unknown provider metadata remains unknown; model catalogs come from integrations, not fixed examples.

## Codex account login and billing

For a native Codex tool, prefer/reuse its active native ChatGPT login. With executable and required capabilities present, `Logged in using ChatGPT` is readiness evidence without another login, API key, `--allow-credits` or model probe. Ordinary subscription execution, TEAM and planning must not depend on a missing credit-control flag. Authentication, subscription quota, account credits and API billing remain distinct.

`--allow-credits` authorizes supported explicit account-credit fallback, not API billing and not a requirement to reuse a subscription. Apply provider controls only when actually supported; do not invent flags or promise credit-free execution that the provider cannot guarantee. Hard account-credit limits remain subject to provider-supported controls.

The unified API tool's explicit `authentication: API_KEY` and configured reference replace reliance on the legacy `PTBK_OPENAI_CODEX_USE_API_KEY` opt-in for that instance. A native tool remains native even when environment keys exist. An explicitly configured/enabled API fallback may be used after earlier same-variant instances become unavailable, within project/task spending authority. Quota failures are quota outcomes, not a reason to log out or request another native login. See [environment safety](environment.md), [Router](../agents/core-agents/router.md), [TEAM](team.md), [retries](retries.md) and [planning](planning.md).

Tool setup grants the connection's supported model capabilities without per-instance model/thinking defaults or allowlists. Plugin code owns those defaults; [MODEL](../book-language/commitments/model.md) describes independent execution constraints. Endpoint matching must survive same-variant account fallback; see [harness endpoints](tools.md#harness-endpoints).

Fresh init preselects detected installed/configured usable variants, or OpenAI Codex if none exist, preserving explicit selections/deselections. Every selected adapter then performs a [real request/response check](harness-plugins.md#real-functional-check). At least one must pass before new-project completion; failed additional selections are visible and nonfatal. Native login reuse avoids another sign-in, not this functional check. Small preparatory test/name usage is accepted outside project accounting. Each adapter also supplies finest available [usage and current price-list retrieval](usage.md), with subscription/API distinctions and honest unknowns.
