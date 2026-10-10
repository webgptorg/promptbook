# Core agents and hidden definitions

[Agents](_index.md)

The engine expects three editable core agents: **Adam**, **Manager** and **Teacher**, materialized as `agents/.core/adam.book`, `manager.book` and `teacher.book`.

On initialization and execution setup, create each missing definition from the installed engine's defaults. An incomplete core directory is repaired individually, not replaced wholesale. Existing customized files must not be overwritten, including when the package is updated. An invalid existing definition needs a diagnostic, not silent replacement.

Adam supplies the default inherited foundation. Its supplied definition ends inheritance with `FROM Void`. Manager inherits Adam by the usual default. Teacher is supplied with `FROM Expert` and ends with `CLOSED`; its parent can be customized, but its closure requirement remains.

Any hidden directory inside `agents/`, not only `.core/`, contains supporting definitions rather than ordinary automatic task candidates. They remain discoverable for inheritance, imports, TEAM and explicit/internal assignments. Adam normally provides shared instructions, Manager handles assignment tasks and Teacher handles learning tasks. Hidden placement is not an access-control boundary.

See [inheritance](../book-language/inheritance.md), [non-agents](non-agents.md) and [consistency](consistency.md).
