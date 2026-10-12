# Dictionary

[Main specification](_main.md)

**Promptbook / ptbk:** One npm package and CLI for operating agents over a project. **Engine version:** The version of the installation actually running, not the newest published version.

**APT:** Agent–Project–Task, a convention for organizing connected long-term context. **Agenda:** The responsibility that this whole serves over time; not the expansion of A.

**Project:** The selected workspace, its managed files and referenced context. The concrete CLI works over a directory in a Git working tree. See [workspace](cli/workspace.md).

**Agent:** A lasting role, goal, rules and knowledge. **Core agent:** An editable supporting Book materialized when missing. **Non-agent:** An engine-defined reference without a project file: Void/Null, User or Expert. See [agents](agents/_index.md).

**Book:** Human-readable text with commitments, used for agent and task definitions. **Commitment:** A recognized uppercase keyword at the beginning of a line, possibly with spaces, plus its content. See [language](book-language/_index.md).

**FROM:** Inheritance. **IMPORT:** Instruction inclusion. **TEAM:** Natural-language consultation relationships, not inheritance or a reporting hierarchy.

**Task:** Bounded work with a result and completion record. **Occurrence:** One execution instance of recurring work. **Attempt:** A try or repair within that work. **Task origin:** Provenance, not a separate execution type.

**Harness:** A globally installed execution tool enabled/configured per project, with native authentication and supported models/capabilities. **Harness plugin:** Its common setup/execution/update integration. **Featured:** Prominent in catalog presentation, not implicitly enabled or installed. **Model:** The selected inference model. **Thinking level:** Its supported reasoning/effort setting. These are distinct from agent identity and the project browser. See [harnesses](cli/harnesses.md).

**Project browser:** One shared browser/profile configuration per project, independent of harness authentication; isolated by default or explicitly shared. See [browser](cli/browser.md).

**Run:** Finite execution of existing work with a chosen configuration. **Start:** The indefinitely operating project supervisor. **Daemon:** Background process mode. **Persistence:** Automatic continuation after restart, separate from merely being in the background.

**Interactive/noninteractive:** Whether the CLI provides terminal UI and input or uses advance configuration and plain output. **Wizard:** Finite setup flow. **Runtime dashboard:** Live execution state, shared by start and run despite their different lifetimes. See [CLI experience](cli/interactive-ui.md).

**Check:** A project-defined verification of required properties. **Accepted result:** Work that met its task and check requirements, with accurately recorded persistence. A successful check does not prove universal correctness.

**Trace:** Observed execution evidence, including diagnostics outside a task. **User request:** A durable question, confirmation or requested human action. **Channel:** A way to convey state, control or answers, such as terminal, page or REST API.

**ptbk.json:** Human-readable, versioned project defaults, overridden temporarily by explicit CLI flags. **.ptbk:** Git-ignored runtime storage, including logs, recovery records and the default persistent browser profile; not all contents are disposable. See [configuration](cli/configuration.md).

**Internal/external context:** Where an APT component resides, independently of its role. See the [whitepaper](whitepaper.md) for the conceptual model and its explicitly longer-term directions.
