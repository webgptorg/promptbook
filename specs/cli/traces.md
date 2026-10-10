# Execution evidence and logs

[Main specification](../_main.md)

Retain task-linked evidence of actual agent/harness/model/thinking selection, source context, start/end, actions, outputs, checks, attempts, usage, result commits and any integration or synchronization problem. Expose the same observed status through all interfaces. Label estimates and unknown values; do not fabricate progress, cost or model identity.

Runtime logs and recoverable execution records live in `.ptbk/`. They survive process restart and remain available to recovery and Teacher. Task completion and useful durable project knowledge belong to versioned project files. A rotating diagnostic stream must not erase evidence still needed by pending teaching, recovery or an external action.

Capture reasoning/diagnostic traces only to the extent the harness actually exposes them. Do not claim access to unavailable hidden reasoning. Teaching uses available evidence and can report that evidence is insufficient.

Redact credentials and sensitive session data before recording or displaying them. Raw output is not an exception. Do not copy browser profiles, passwords or secret environment values into Git or task descriptions. Retention and truncation must be visible and bounded without destroying required pending-work records.

See [learning](../agents/learning.md), [recovery](recovery.md) and [browser](browser.md).
