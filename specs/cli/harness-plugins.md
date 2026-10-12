# Harness plugins and presentation

[Main specification](../_main.md)

Harness integrations form an extensible internal plugin system. Each harness lives in its own folder and supplies the same contract to Promptbook. The wizard, runtime and update workflow use that contract rather than separate hard-coded flows for each provider. Adding a harness must not require redesigning those common experiences. The project browser is an internal shared capability, not a harness plugin.

## Common contract

Each integration exposes its stable identifier, display name and featured status; installation/authentication/configuration readiness; supported models and execution capabilities; and the operations needed to install globally, guide native setup/login, check its version and update that global installation. Unsupported environments or update mechanisms must return an explicit actionable result, not pretend success.

The execution contract accepts the selected project directory and effective instructions, plus supported model/effort options, and runs the harness in noninteractive exec/autonomous (YOLO-style) mode. Promptbook does not need to reproduce every feature of the harness's own UI. Return actual activity, result, cancellation, failures and exposed diagnostics/usage. Tool-specific execution and setup details stay with the integration.

Autonomous execution does not bypass Promptbook's project boundaries, task constraints, paid-use authorization or human-action requirements. Unsupported required capabilities block the affected work rather than being silently ignored.

## A catalog that can grow

Distinguish featured and ordinary integrations. Default catalog views and pickers show only a small curated set of two or three featured names, initially OpenAI Codex and Claude Code, plus **More** for other supported integrations. A catalog of hundreds must remain usable through searchable or bounded navigation.

Default entries show names, not configuration or model dumps; details are revealed only on request. Selection markers are fine. Preserve access to every supported integration and existing selections. Featured status is presentation, not authorization, automatic selection or permission to install. Runtime views must still identify the active/selected harness even when it is not featured.

See [harnesses](harnesses.md), [updates](harness-updates.md) and [help](help.md).
