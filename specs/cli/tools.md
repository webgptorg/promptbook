# Unified project tools

[Main specification](../_main.md) · [Configuration](configuration.md) · [Tool management](tool-management.md) · [Live tool use](tool-runtime.md)

`ptbk.json.tools` is an ordered JSON array of pluggable project resources. Its initial types are **`BROWSER`** and **`HARNESS`**. They share the same external configuration/management model; their internal adapters may differ. There is no longer a singleton browser setting separate from the harness inventory.

## Common fields and identity

Every tool has required `type`, `variant` and `name`, optional free-text `description`, and `isEnabled` (default true). `type` identifies the category, `variant` the fixed implementation, and `name` an arbitrary user-editable identifier unique across the entire project's tools array. Names are kebab-case; type/variant and other fixed enum values are SCREAMING_SNAKE_CASE. Properties are camelCase and boolean properties begin with `is`; see [naming and tolerant normalization](../coding-standards/naming.md).

`isEnabled: false` retains configuration and credentials but removes that instance from new selections. Enable/disable are the normal reversible actions; removal permanently removes the configuration record, not the browser profile or native account data. Only actual use retained under [in-use rules](tool-runtime.md) may continue after disabling/removal. Supported, configured, enabled, installed, usable and currently used are different states.

Each type/variant has its own typed settings and validation under the [shared domain contract](../coding-standards/shared-logic.md). Do not accept arbitrary incompatible fields as though they worked. Unknown variants or ambiguous names use automatic repair, not silent selection of a different tool.

## Browser records

A browser record includes `profile` and `isHeadless`, plus the supported adapter's non-secret options such as `executable`. `profile.source` is one of `MANAGED_GLOBAL`, `PROJECT`, `USER_EXISTING` or `CUSTOM`; `profile.path` supplies a path where appropriate, required for CUSTOM. Resolve the managed-global location per OS user, and project paths relative to the project. Browser variants identify supported adapters, for example CHROME, CHROMIUM or EDGE where available; never advertise an unsupported adapter as usable.

A normal init creates one browser using the existing simple profile/mode choices. Advanced users may add more: a dedicated agent profile plus an explicitly authorized personal profile, separate Facebook/LinkedIn profiles, or several accounts on one site. All remain independently named and diagnosable. Browser website sessions are independent from harness authentication. Ownership, persistent profile safety and diagnostics are defined in [browser behavior](browser.md).

## Harness records

Initial canonical variants cover the existing integrations: `OPENAI_CODEX`, `CLAUDE_CODE`, `GITHUB_COPILOT`, `CLINE`, `OPENCODE`, `GEMINI` and `QWEN_CODE`. A configured harness grants its actual supported execution capabilities through that connection. Tool setup describes how to connect, authenticate and reach an endpoint; it does not define per-instance model/thinking defaults or model/effort allowlists. Model/thinking defaults belong to the plugin's code, and selection requirements belong to [MODEL](../book-language/commitments/model.md).

`authentication` distinguishes `NATIVE` (reuse the chosen native/global installation's account/subscription context) from `API_KEY`. Native instances may specify a non-secret `accountProfile` reference to their distinct supported login context. API instances require `apiKey`, containing only an [environment reference](environment.md). A reference retained on a NATIVE record is inactive metadata; its presence does not trigger API billing. Global executable installation and authentication mode are separate concepts: using an API key does not require a project-local duplicate of the CLI.

Multiple native subscriptions require genuinely separate adapter-supported authentication contexts. Two records pointing to the same account store are not two independent subscriptions. Do not change a shared global login, overwrite another account's credentials or claim isolation that the adapter cannot provide. Unsupported multi-account isolation is an actionable capability limitation. API credentials are scoped to the selected invocation and must not leak between instances.

An illustrative configuration fragment (other project settings omitted):

```json
{
  "isAutoSync": false,
  "tools": [
    {
      "type": "BROWSER",
      "variant": "CHROME",
      "name": "agent-browser",
      "description": "Dedicated browser for project work",
      "isEnabled": true,
      "profile": { "source": "MANAGED_GLOBAL" },
      "isHeadless": true
    },
    {
      "type": "HARNESS",
      "variant": "OPENAI_CODEX",
      "name": "codex-subscription",
      "isEnabled": true,
      "authentication": "NATIVE"
    },
    {
      "type": "HARNESS",
      "variant": "OPENAI_CODEX",
      "name": "codex-company-api",
      "isEnabled": true,
      "authentication": "API_KEY",
      "apiKey": "${{ env.COMPANY_OPENAI_API_KEY }}"
    }
  ]
}
```

An actual initialized configuration also contains its `promptbookVersion`; this fragment is not a versionless initialization template. Advanced account pooling, additional browsers and fallback chains are configured after init rather than added as mandatory wizard questions.

## Harness endpoints

A harness tool can set its supported `baseUrl` connection target. Accept `default`, `official`, `local` or an explicit base URL in setup; persist the resolved endpoint choice without secrets. `official` is fixed by the plugin/provider and cannot be redefined by a tool's custom URL. `default` uses this tool's configured endpoint, falling back to official when absent. `local` refers to model execution on the engine's host, not the device displaying a dashboard. The adapter declares whether local/custom endpoints are supported and how its local service is reached; do not invent a working endpoint for an unsupported variant.

The engine itself always runs in one environment for one project. These choices identify model execution endpoints, not a fleet of engines called notebook/server. A remote dashboard does not relocate inference. [MODEL](../book-language/commitments/model.md) constrains the desired endpoint independently of connection details; only compatible tools can satisfy it. Resolve `default` to the actual official/local/explicit endpoint before recording a concrete Router decision.

Same-variant fallback must also satisfy the resolved endpoint: two accounts aimed at different services are not interchangeable for `runtime=official`, `runtime=local` or an explicit URL. Show the actual endpoint category/URL with secrets redacted. There is no per-tool filter of allowed model IDs or thinking levels in this change.

## Selection and availability

Agents can use different suitable variants during authorized work, for example combining Claude Code and Codex. Global array position does not require one variant to fail before another variant can be chosen. Within the **same harness variant**, eligible enabled instances form a priority/fallback chain in array order: use the first usable instance, moving to the next only when an earlier one cannot serve the request, such as exhausted quota or a technical failure. Do not load-balance equally usable same-variant accounts arbitrarily.

This supports two subscriptions, subscription then paid API, and multiple API keys ordered company/second company/personal. Explicitly enabling/configuring a paid fallback supplies that route's authorization, subject to task and project spending constraints; merely discovering a key does not. Never override an explicit provider/model/account requirement. After an earlier instance recovers, prefer it on a later selection without interrupting work already using a fallback. Avoid repeated failing probes or hidden paid test calls.

For browsers, use task intent, names/descriptions, profile permissions and known sessions to choose the appropriate instance. Try an explicitly configured alternative when the first lacks the needed login/capability; do not post or pay from a different account merely because it is logged in. Keep actual account identity and effects attributable. Browser selection is not the same rule as same-variant harness quota pooling.

Before every task and whenever availability changes, verify at least one enabled usable browser and harness, plus the task's actual constraints. Missing resources mean the engine is **running but waiting for tools**, not stopped or technically paused. Continue refreshing while idle and resume eligible work when tools become available. See [live runtime behavior](tool-runtime.md).
