# Execution evidence and logs

[Main specification](../_main.md)

Retain task-linked evidence of actual agent/harness/model/thinking selection, source context, start/end, actions, outputs, checks, attempts, usage, result commits and integration/synchronization problems. Include the running engine and relevant harness versions. All interfaces expose the same observed status. Label estimates and unknown values; do not fabricate progress, cost or model identity.

Keep diagnostic evidence for initialization, startup, configuration, installation and updates even when no task exists, following [errors](errors.md). Link user-facing failures to their real diagnostic record, including available exception/stack and subprocess diagnostics. A failed attempt remains distinguishable from a retry or successful result.

Runtime logs and recoverable records live in `.ptbk/` and survive restart for recovery and Teacher. Completion and useful durable knowledge belong to versioned project files. Rotating logs must not erase evidence still needed by pending teaching, recovery or external actions. When recording is unavailable or forbidden by read-only operation, report the limitation and available redacted diagnostics rather than invent a saved trace.

Capture reasoning/diagnostic traces only to the extent the harness exposes them. Do not claim access to unavailable hidden reasoning. Teaching uses available evidence and can report insufficiency.

Redact credentials and sensitive session data before recording or displaying them, including raw output. Do not copy browser profiles, passwords or secret environment values into Git or task descriptions. Retention and truncation remain visible and bounded without destroying required pending-work records.

See [learning](../agents/learning.md), [recovery](recovery.md) and [browser](browser.md).
