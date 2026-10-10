# FROM

[Commitments](_index.md) · [Syntax](../syntax.md)

**Document:** Agent.

Names one inheritance parent using the shared [reference rules](../references.md). If omitted, inherit Adam. `FROM Void` (Null or `0`) ends inheritance; `FROM User` is invalid; `FROM Expert` uses the running engine's expertise. Cycles are invalid. See [inheritance](../inheritance.md).
