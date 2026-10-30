# Adam

[Core agents](../core-agents.md) · [Inheritance](../../book-language/inheritance.md)

Adam exists as the project's common editable instruction foundation for ordinary agents. Initialize only a missing `agents/.core/adam.book`, with `AGENT Adam`, `FROM @Void` and an explicit initial CLOSED policy. It uses normal Book inheritance and does not run a separate supervisor or give inheriting agents extra authority.

Keep its initial Book small. Preserve the project's customized common rules during reinitialization and upgrades; changes to Adam affect descendants through the ordinary inheritance contract.

Adam's small initial common rules include using the ordinary hyphen `-` instead of long typographic dashes in generated prose. This inherited authoring instruction does not change parsing or rewrite verbatim input, identifiers or quotations. Maintain Adam through [shared core template updates](../core-agents.md#shared-preparation-and-template-updates), preserving project-specific common rules.

Common default instructions also include the foundational [autonomy and minimal-interruption principle](../../concepts/minimal-interruption/_index.md): resolve routine technical work within existing authority, use available context/access and ask only for a genuinely necessary human decision/input/action. Make the canonical rules and relevant examples available through normal inherited instructions/knowledge; preserve user customizations and explicit restrictions.
