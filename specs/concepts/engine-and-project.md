# Engine knowledge and evolving project knowledge

[Project model](project-model.md) · [Core agents](../agents/core-agents.md) · [Expert](../agents/expert.md)

A running Promptbook engine and a user's project evolve on different timelines. **Engine-defined non-agents** such as `@Expert` belong to the invoked engine; their effective Book-like instructions may be internally embedded or generated. They can be comprehensive and change when that engine version changes. Expert therefore describes the *currently running* Promptbook, not the version that originally initialized the project.

**Core agents** are ordinary editable project Books that the engine expects to find and initializes only when missing. Defaults should be deliberately small, understandable and extensible. After creation they belong to the project and accumulate project-specific instructions, experience and learning just like any other agent. Reinitialization and engine upgrades preserve those modified Books, never replacing them merely because newer boilerplates exist. A newly required core role may be initialized separately. An existing invalid file is diagnosed and repaired through normal authorized work, not silently overwritten.

**Other project agents** are also editable project Books. Their distinction from core agents is not a special learning or runtime mechanism; the engine simply does not require every project to have those specialist roles. Default OPEN/CLOSED learning semantics apply to core and non-core Books alike. `@Fixer` is a core agent with normal open learning; `@Teacher` is closed by its own policy, not because it is core.

*Illustrative analogy only:* the general rules of a company may evolve centrally, while its accountant learns that company's particular workflow. The analogy explains how engine upgrades and local specialization coexist; it does not define a new Promptbook object, runtime service or legal guarantee.
