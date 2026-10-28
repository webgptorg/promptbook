# Adam

[Core agents](../core-agents.md) · [Inheritance](../../book-language/inheritance.md)

Adam exists as the project's common editable instruction foundation for ordinary agents. Initialize only a missing `agents/.core/adam.book`, with `AGENT Adam`, `FROM @Void` and an explicit initial CLOSED policy. It uses normal Book inheritance and does not run a separate supervisor or give inheriting agents extra authority.

Keep its initial Book small. Preserve the project's customized common rules during reinitialization and upgrades; changes to Adam affect descendants through the ordinary inheritance contract.

Adam's small initial common rules include using the ordinary hyphen `-` instead of long typographic dashes in generated prose. This inherited authoring instruction does not change parsing or rewrite verbatim input, identifiers or quotations. Maintain Adam through [shared core template updates](../core-agents.md#shared-preparation-and-template-updates), preserving project-specific common rules.
