# Engine knowledge and evolving project knowledge

[Project model](project-model.md) · [Core agents](../agents/core-agents.md) · [Expert](../agents/expert.md) · [Configuration migrations](../cli/configuration-migrations.md)

A running Promptbook engine and a user's project evolve on different timelines. **Engine-defined non-agents** such as `@Expert` belong to the invoked engine; their effective Book-like instructions may be internally embedded or generated. They can be comprehensive and change when that engine version changes. Expert describes the currently running Promptbook, not the version that originally initialized the project.

**Project configuration** evolves through the explicit versioned migration chain. `ptbk.json.promptbookVersion` records initialization or the last successful migration to an engine version, not an independent schema counter or permanently fixed creation version. A newer engine applies applicable sparse steps and commits the whole pass once; an older engine offers an update instead of downgrading the project. The fixed versionless baseline and actual first conversion are defined by [configuration migrations](../cli/configuration-migrations.md), not guessed from Book contents.

**Core agents** are ordinary editable project Books required by the engine and initialized only when missing. Defaults are small and comprehensible. They then belong to the project and accumulate instructions, experience and learning like other agents. Reinit/upgrades preserve customized/learned Books; a new missing role may be created individually. A malformed existing file is diagnosed and repaired through normal authorized work, not overwritten with a boilerplate because its engine changed.

**Other project agents** have the same Book, runtime and learning behavior; the engine simply does not require every specialist in every project. Default OPEN/CLOSED semantics apply alike. Fixer is a normal OPEN core whose initial team includes User and Expert, and whose problem-solving/consultation policy can be customized. Teacher is CLOSED by its own policy, not by being core. The cross-system [automatic repair principle](automatic-repair.md) uses this normal Fixer rather than an independent privileged learning or communication subsystem.

*Illustrative analogy only:* a company's general framework may evolve centrally while its accountant learns local practice. This explains coexistence of engine evolution and project knowledge, not a new Promptbook object, service or legal guarantee.
