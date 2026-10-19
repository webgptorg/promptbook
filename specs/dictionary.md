# Dictionary

[Main specification](_main.md)

**Promptbook / ptbk:** One npm package and CLI for operating agents over a project. **Engine version:** The version actually loaded by the service, not the latest release or the viewer's installed version.

**APT:** Agent–Project–Task, a long-term context convention; the concrete project also includes Chat. **Agenda:** Its continuing responsibility, not the expansion of A.

**Project:** The selected workspace, managed files and context, concretely a directory in a Git working tree. See [workspace](cli/workspace.md).

**Agent:** A persistent project-owned role and knowledge. **Core agent:** An ordinary editable required Book: Adam, Manager, Teacher, Fixer or Chatter, initialized only if missing. **Fixer:** OPEN maintenance agent. **Chatter:** Default human-facing entry, with TEAM access to other initialized roles and ordinary specialist consultation/task creation. **Non-agent:** Engine-defined Book-like reference without a project file: Void/Null, User or Expert. See [agents](agents/_index.md).

**Book:** One named Agent, Task or Chat represented by ordered commitments. **Type-and-name commitment:** Opening AGENT/TASK/CHAT whose content names it. **Name resolution:** Normalize that content and apply deterministic single-winner lookup; keywords and filenames are not IDs, and shadowed duplicates are diagnosed. **Commitment:** A line-initial uppercase keyword, possibly multiword, with content using common syntax across entity kinds. See [language](book-language/_index.md).

**Generated task/chat name:** Readable title plus creation date/time and a normalized-distinct discriminator when needed. Preventive [authoring policy](cli/generated-names.md), not mandatory timestamp grammar or a reason to rename existing Books.

**FROM:** Inheritance. **IMPORT:** Instruction inclusion. **TEAM:** Natural-language consultation relationships, not inheritance/reporting hierarchy. Advice can be scoped to a task or linked to a human conversation without inventing a task.

**Task:** Bounded named work with result/completion. **Chat:** Persistent named messages with one user/agent pair or an internal agent/agent pair, with optional work/conversation links. **Occurrence:** One recurring execution. **Attempt:** A try/repair within work. **Task origin:** Provenance, not a separate execution mechanism.

**Harness:** Globally installed execution tool enabled per project, with native authentication/models/capabilities. **Harness plugin:** Common setup/execution/update integration. **Featured:** Prominent in catalog UI, not implicitly enabled. **Model:** Selected inference model. **Thinking level:** Harness/model-supported reasoning/effort setting. Actual execution metadata is distinct from defaults and agent/browser identity.

**Project browser:** Coordinated browser ownership per project, with a reusable global Promptbook profile by default and isolated, personal Chrome or custom alternatives. Independent of harness authentication. Engine-owned diagnosis/recovery has safe manual controls. See [browser](cli/browser.md).

**Engine / service:** Owner of scheduling, task/lifecycle state and execution for one concrete project. **Project lock:** Exclusive engine ownership, independent of installation and dashboard count. **Run:** Finite configured queue execution. **Start:** Ongoing supervisor. **Daemon:** Background placement. **Persistence:** Recovery/startup across restarts, distinct from background placement.

**Service states:** `running` permits new eligible work; `pausing` drains to `pause`; `pause` stays alive without executing/claiming tasks; `stopping` drains to exit. Cancelling pending pause/stop returns to running. Force stop is immediate; hard pause does not exist. Stopped is an observed absence, not a fifth live state. See [lifecycle](cli/service-lifecycle.md).

**Project dashboard:** Lightweight live observer/controller, not engine owner or scheduler. Zero or many clients may attach; leaving one does not stop the service. **Global dashboard:** `ptbk dashboard --global`, a CWD-independent live table of host engines, usable at zero entries, with project-view attachment. It is not a global engine. See [process modes](cli/process-modes.md).

**Interactive/noninteractive:** Whether terminal input/UI is available or choices are supplied in advance. **Wizard:** Finite setup. **Detail panel:** Collapsible execution/browser inspection, separate from visible main lifecycle controls. See [CLI experience](cli/interactive-ui.md).

**Check:** Project-defined verification. **Accepted result:** Work satisfying task/check requirements with truthful persistence; not a guarantee of universal correctness.

**Trace:** Observed evidence under `traces/<task-file-basename>/`, copying the actual source filename literally without final `.book`/`.md`. Declared names and source revisions provide provenance, not the directory name. System diagnostics without a task remain separate. **Human request:** Actionable agent↔User chat message, not a separate stored entity. **Channel:** Terminal, browser, CLI or API over shared engine/chat state.

**ptbk.json:** Versioned human-readable defaults with temporary CLI overrides. **.ptbk:** Ignored runtime/ownership records, logs, recovery, read markers and optional isolated browser profile; not wholly disposable. **Host discovery registry:** Protected local metadata connecting viewers to existing engines across installations, not a project lock, credential store or task queue.

**Internal/external context:** Where APT components reside, independently of role. See the [whitepaper](whitepaper.md) for conceptual and explicitly longer-term directions.
