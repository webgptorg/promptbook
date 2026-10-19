# Expandable execution and browser detail panels

[Main specification](../_main.md) · [Panel layout](dashboard-layout.md) · [Browser behavior](browser.md) · [Shared status](status-view.md)

Keep the main project dashboard focused on attention, current work and service controls. Detailed execution configuration and browser diagnostics belong in separate, initially collapsed panels, reachable through labelled keyboard shortcuts in the terminal and equivalent accessible controls in the browser. Opening them is inspection, not a runtime mutation. Help/legends reveal how to open and close them; shortcuts never intercept a composer or picker. Exact keys and grid placement are presentation choices.

## Execution detail

For the selected current task/run, display the agent and the effective harness, model identifier/name and thinking level together. These are separate fields, not a provider label masquerading as a model or an agent masquerading as a harness. Include applicable overrides, phase and attempt/consultation attribution. When execution involves different harnesses/models/levels, show the active context and distinguish its task-scoped consultations/attempts; do not flatten them into one misleading configuration.

Use actual execution metadata, not merely configured defaults. Preserve the harness's own thinking-level terminology rather than inventing equivalence between providers. Distinguish unknown/not reported, automatic/default selection whose concrete resolution is unavailable, and genuinely unsupported/not applicable. Refresh with execution changes and label completed/last-run metadata as historical rather than presenting it as idle-time activity. Raw/API/detail snapshots retain the same information without requiring a decorative pane.

## Browser detail and diagnostics

Show the project's effective browser/profile source: managed global, isolated project, personal Chrome or custom. Include the resolved profile path for authorized inspection, the actual browser/mode, connection/launch health, and known ownership/busy state. Distinguish active configuration from a pending next-task change or saved defaults. Explain when a shared profile belongs to another project, without exposing cookies, credentials or private profile contents.

Show the last real startup/connection failure, redacted diagnostic evidence, automatic recovery progress, attempts and next retry when known. Expose the shared actions to recheck diagnostics, retry startup and restart the project browser, with the intended effect and its observed outcome. If an action must wait for a safe ownership/task boundary, display that pending condition instead of claiming that it already happened. Restarting the browser is not restarting or stopping the engine.

[Automatic browser recovery](browser.md) is the default, not a workflow requiring the user to keep this panel open or routinely press Restart. A compact actionable browser failure stays visible in the main attention/activity area while verbose details remain collapsed. Available manual recovery respects the same profile ownership, task safety, session preservation and authorization as automatic recovery; it never offers a blanket kill-all-browsers or destructive profile reset as routine repair.

## Acceptance outcomes

Start with both detail panels collapsed, open each by its discoverable shortcut, inspect it and return without changing the service. Test differing agent defaults and effective run overrides, multiple consultation contexts, unavailable model/level metadata and task changes. Test all four profile sources, a launch failure, busy shared profile, automatic retry and a manual browser restart. Confirm accurate paths and outcomes, no secret disclosure, no restart of unrelated browsers or engine, stable focus/resize and equivalent browser/API/raw information. Lifecycle controls remain visible outside these detail panels.
