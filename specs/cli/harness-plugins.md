# Harness adapters and tool presentation

[Main specification](../_main.md) · [Tools](tools.md) · [Shared domain logic](../coding-standards/shared-logic.md)

Harness integrations form an extensible internal plugin system. Each integration supplies the same harness contract to Promptbook, used by wizard, runtime and update workflows rather than provider-specific copies of business logic. Browsers are a different tool type, not pretend LLM harnesses; both categories participate in the same external named-tool configuration and management model. Adding an adapter must not require redesigning those common experiences.

## Common adapter contract

Expose a stable canonical variant, display name and featured status; installation/authentication/configuration readiness; supported models/execution capabilities; and operations for global installation, guided native setup/login, version checks and updates. Distinguish shared executable state from the authentication/configuration of a particular named instance. Declare support or limitations for separate native account contexts rather than pretending two records isolate one shared login.

Authentication accepts attended local/remote context and the selected instance's effective service-user environment. Declare supported installed-version login methods and expose their transient URL/code instructions, required native terminal interaction and actual waiting/success/cancel/expiry/denial/unsupported outcomes through the shared setup flow. Recheck readiness in that environment after login. Keep provider commands/parsing in the adapter rather than duplicate them in init, an installer or dashboard; follow [remote authentication](harness-authentication.md), including protected output and noninteractive behavior.

The plugin code supplies its default model and thinking level, supported model/effort combinations, model manufacturer/origin metadata where known, the immutable official endpoint and support for local/custom base URLs. Use this common capability description for MODEL matching, Router context, setup and actual execution. Defaults are properties of the plugin implementation, not user-configurable defaults on each named tool. Native provider limitations remain real capabilities; do not add Promptbook model/effort allowlists to tool setup. Unknown metadata stays unknown.

Execution accepts the project directory, selected named tool and its scoped authentication context, effective instructions and supported model/effort options, and runs in supported noninteractive/autonomous mode. Never leak an API key or native account selection between simultaneous clients or retained uses. Promptbook need not reproduce every feature of a harness's own UI. Return actual activity, result, cancellation, failures and exposed diagnostics/usage; setup/execution details stay with the adapter.

Expose available full output/diagnostics to the owning task's consolidated [harness trace](traces.md), with attempt boundaries, actual variant and instance attribution. Include reasoning only where actually exposed, never promise hidden reasoning or replace the available stream with only a final summary. Redact secrets before persistence and distinguish interrupted/missing capture from empty successful output.

Follow [unattended operation](autonomous-operation.md): resolve known execution permissions during attended setup rather than hidden prompts in a daemon. Detect unexpected input waits and recover or explain them. Autonomous operation does not bypass task constraints, project authority, paid-use limits or genuine human actions. Unsupported capabilities are explicit, not silently ignored.

Readiness and variant-specific parsing feed the shared tool domain layer. Init, commands and dashboard use those same types, validators and management operations; they must not independently implement provider branches or environment editing. See [DRY](../coding-standards/shared-logic.md).

## A catalog that can grow

Default integration catalogs show a small curated featured set, initially OpenAI Codex and Claude Code, plus **More**. All other supported variants remain reachable through bounded/searchable navigation even with hundreds of adapters. Default entries show names, not model/configuration dumps; reveal details on request and preserve selections.

Featured status is presentation, not installation, enablement or paid-use authorization. The configured-tool inventory is different from the adapter catalog: it must distinguish several named instances of the same variant, their order, enabled state, availability and current uses. An active nonfeatured variant remains visible. See [harnesses](harnesses.md), [updates](harness-updates.md), [tool management](tool-management.md) and [help](help.md).

## Usage and current price lists

Every adapter preserves the finest available provider-native usage, timestamps, token-category semantics, actual model and nonsecret named-account/billing context under [usage](usage.md). Distinguish cumulative snapshots from deltas and unavailable from zero. Include failed/interrupted attempts and tool/consultation provenance without leaking secrets.

Each adapter can retrieve its current price list and retain independent timestamped observations in ignored internal storage, with source and effective dates when known. Do not bind raw usage to one price snapshot, assume today's rate applied historically or add an automatic historical backfill mechanism. Unsupported/unavailable usage or pricing is explicit and never a reason to fabricate a precise subscription percentage.

## Real functional check

Every harness adapter supplies a minimal actual request/response check through the shared setup contract. Executable discovery, version parsing and native-auth status alone are not proof of usable inference. Run with the selected instance's real service-user authentication and supported noninteractive execution/runtime/sandbox setup so relevant execution failures are detected, not hidden by a different test path. Return verified response/success or a concrete redacted cause, plus honest available usage.

Initialization tests every selected harness; at least one must pass, additional failures remain visible without blocking a working selection. Zero passes returns to harness configuration. The check and later project-name generation are separate preparatory calls outside a not-yet-created project, with accepted small usage excluded from project totals under [init](initialization.md#draft-confirmation-and-project-creation). Use a temporary non-project context without creating/touching the destination. Reuse this adapter operation in supported setup/test entry points, not provider-specific initializer copies.
