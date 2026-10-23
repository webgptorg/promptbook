# Adam

[Core agents](../core-agents.md) · [Inheritance](../../book-language/inheritance.md)

Adam exists as the project's common editable instruction foundation for ordinary agents. Initialize only a missing `agents/.core/adam.book`, with `AGENT Adam`, `FROM @Void` and an explicit initial CLOSED policy. It uses normal Book inheritance and does not run a separate supervisor or give inheriting agents extra authority.

Keep its initial Book small. Preserve the project's customized common rules during reinitialization and upgrades; changes to Adam affect descendants through the ordinary inheritance contract.
