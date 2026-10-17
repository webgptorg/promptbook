# Dictionary

[Main specification](_main.md)

**Promptbook / ptbk:** One npm package and CLI for operating agents over a project. **Engine version:** The version of the installation actually running, not the newest published version.

**APT:** Agent–Project–Task, a long-term context convention; the concrete project also has a first-class Chat entity. **Agenda:** The responsibility that this whole serves over time; not the expansion of A.

**Project:** The selected workspace, its managed files and referenced context. The concrete CLI works over a directory in a Git working tree. See [workspace](cli/workspace.md).

**Agent:** A lasting project-owned role and knowledge. **Core agent:** A normal editable required project Book (Adam, Manager, Teacher, Fixer), materialized only if missing. **Fixer:** OPEN core maintenance agent. **Non-agent:** An engine-defined Book-like reference without a project file: Void/Null, User or Expert. See [agents](agents/_index.md).

**Book:** Human-readable named Agent, Task or Chat entity with commitments. **Name resolution:** Normalized first-line name and deterministic single-winner lookup; filename is not ID, and shadowed duplicates are diagnosed. **Commitment:** A recognized uppercase keyword at the beginning of a line, possibly with spaces, plus its content. See [language](book-language/_index.md).

**FROM:** Inheritance. **IMPORT:** Instruction inclusion. **TEAM:** Natural-language consultation relationships, not inheritance or a reporting hierarchy.

**Task:** Bounded named work with a result and completion record. **Chat:** Persistent named messages with agent/user or task-scoped agent/agent speakers and optional many-to-many task links. **Occurrence:** One execution instance of recurring work. **Attempt:** A try or repair within that work. **Task origin:** Provenance, not a separate execution type.

**Harness:** A globally installed execution tool enabled/configured per project, with native authentication and supported models/capabilities. **Harness plugin:** Its common setup/execution/update integration. **Featured:** Prominent in catalog presentation, not implicitly enabled or installed. **Model:** The selected inference model. **Thinking level:** Its supported reasoning/effort setting. These are distinct from agent identity and the project browser. See [harnesses](cli/harnesses.md).

**Project browser:** One coordinated browser instance per project; dedicated reusable global Promptbook profile is default, with isolated project, personal Chrome and custom-path alternatives. Independent of harness authentication. See [browser](cli/browser.md).

**Run:** Finite execution of existing work with a chosen configuration. **Start:** The indefinitely operating project supervisor. **Daemon:** Background process mode. **Persistence:** Automatic continuation after restart, separate from merely being in the background.

**Interactive/noninteractive:** Whether the CLI provides terminal UI and input or uses advance configuration and plain output. **Wizard:** Finite setup flow. **Runtime dashboard:** Live execution state, shared by start and run despite their different lifetimes. See [CLI experience](cli/interactive-ui.md).

**Check:** A project-defined verification of required properties. **Accepted result:** Work that met its task and check requirements, with accurately recorded persistence. A successful check does not prove universal correctness.

**Trace:** Observed execution evidence under a name-derived path, plus system diagnostics. **Human request:** An actionable message in an agent↔User chat, not a separate stored entity. **Channel:** Terminal, browser, CLI or API rendering the same chat/control state.

**ptbk.json:** Human-readable, versioned project defaults, overridden temporarily by explicit CLI flags. **.ptbk:** Git-ignored runtime storage, including logs, recovery records and local chat read markers and optional isolated-project browser profile; not all contents are disposable. See [configuration](cli/configuration.md).

**Internal/external context:** Where an APT component resides, independently of its role. See the [whitepaper](whitepaper.md) for the conceptual model and its explicitly longer-term directions.
