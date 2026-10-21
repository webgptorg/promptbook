# FROM

[Commitments](_index.md) · [Syntax](../syntax.md)

**Document:** Agent.

Names one inheritance parent using the shared [reference rules](../references.md): `FROM @Developer` for a single-word name, `FROM {Frontend Developer}` for a multiword name. A bare name (`FROM Developer`) is accepted for compatibility. Double braces (`FROM {{Developer}}`) are a malformed reference, not another form. If omitted, inherit Adam. `FROM @Void` (equally `@Null`, `{Void}`, `{Null}` or the legacy `0`) ends inheritance; `FROM @User` is invalid; `FROM @Expert` uses the running engine's expertise. Cycles are invalid. See [inheritance](../inheritance.md).
