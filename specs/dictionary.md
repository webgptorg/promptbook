# Dictionary

[Main specification](_main.md) · [Book language](book-language.md) · [Historical specifications](deprecated/_index.md)

This is the index of important terms used in the specs. Definitions below are short; each term links to the file that owns its contract. “Historical” entries retain the older specification's lower authority and do not assert current ptbk support.

## Promptbook and execution

- [Promptbook / ptbk](_main.md): The command-line utility that executes project tasks through coding harnesses; the repository's sole product.
- [Former command namespace / ptbk coder](cli/compatibility.md#deliberate-changes-for-a-better-implementation): The historical command group, replaced by top-level ptbk commands.
- [Agent / agent Book](cli/agent-context.md): A reusable role with instructions, knowledge, inheritance and advisors.
- [Developer / Planner](cli/agent-context.md): Initialized agent roles; Developer is the default, including for plan.
- [Project / workspace](cli/workspace.md): The selected directory and resolved source/configuration paths; distinct from the Git root and package installation.
- [Git preflight](cli/git-preflight.md): Validate the repository before mutating work or initializing execution.
- [Initialization / init](cli/initialization.md): Idempotent creation of missing project configuration and files.
- [Task / TaskDefinition](cli/domain-model.md): A work definition with identity, payload, lifecycle, routing, trigger and source revision.
- [Run](cli/domain-model.md): One invocation of Promptbook.
- [Occurrence / due slot](cli/recurrence.md): An individual scheduled execution of a task; retries keep that occurrence's identity.
- [Attempt / retry budget](cli/retries.md): A bounded execution or repair attempt; check feedback and technical retries have separate counters.
- [Execution lifecycle](cli/execution.md): The ordered phases of claiming, running, checking and finalizing one task.
- [Harness / coding harness](cli/harnesses.md): The interchangeable provider adapter that supplies coding/model capabilities.
- [Model / thinking level](cli/cli.md#configuration-and-precedence): Separate CLI selections for the model and reasoning effort, subject to harness capabilities.
- [TEAM / consultation](cli/team.md): An on-demand advisor call inside the same task, with separate agent instructions and shared limits.
- [Planning / plan](cli/planning.md): A read-only conversation that saves task proposals only after user review.
- [Check / checks / fix](cli/checks.md): Project validation and repair of its failures; fix does not select ordinary backlog tasks.
- [Verify](cli/cli.md#commands): Human review, follow-up and archiving of completed results; distinct from checks.
- [CLI / configuration precedence](cli/cli.md): The user-facing commands, flags and effective-option rules.
- [Eligibility / EligibilityResult / trigger](cli/eligibility.md): The shared evaluation of ready, waiting, blocked, invalid, unsupported or filtered work.
- [Not-before / AFTER](cli/not-before.md): An inclusive earliest-start instant with strict date/time and timezone rules.
- [Recurrence / REPEAT / schedule revision / coalescing](cli/recurrence.md): Fixed-interval slots and deterministic restart, catch-up and schedule-change policy.
- [Claim / lease / ownership token](cli/recovery.md): Coordinated exclusive ownership of an occurrence and mutating workspace operations.
- [Journal / recovery / recover](cli/recovery.md): Durable phase boundaries and explicit resume, retry or acknowledgement.
- [Owned scope / Git persistence](cli/git-persistence.md): Proven task-owned changes, preserving pre-existing work and the user's index.
- [PhaseRecord / phase commit / check commit](cli/git-persistence.md#phase-commits): A recorded phase and its independently persisted content delta.
- [Dirty tree / fail / ignore / continue](cli/git-persistence.md#dirty-tree): Explicit policy for pre-existing changes or recovery of interrupted work.
- [Commit identity / signing](cli/git-persistence.md#commit-identity): Agent Git identity with an explicit fallback to configured user identity.
- [Isolation / worktree](cli/isolation.md): A task execution checkout with mapped sources and verified integration.
- [Synchronization / pull / push](cli/git-synchronization.md): Explicit Git synchronization with an outcome separate from local implementation.
- [Trace / usage / cost](cli/traces.md): Durable run/attempt/phase evidence with actual outcomes and secret redaction.
- [RunResult](cli/domain-model.md#minimum-data-contracts): Separate implementation, validation, persistence, integration and remote-sync outcomes.
- [Persistent mode / server / supervisor](cli/server.md): Local supervision, wake-ups and dashboard over the shared task engine.
- [Normal output / raw output / cancellation](cli/terminal.md): Terminal presentation and controls over one execution stream.
- [Architecture / domain](cli/architecture.md): Module responsibilities and injectable runtime dependencies.
- [Compatibility / exit codes](cli/compatibility.md): Preserved behavior and deliberate external changes.
- [Acceptance scenarios](cli/acceptance.md): Required deterministic verification identified by T, E and U scenario IDs.
- [Definition of Done](cli/delivery.md): Delivery gates, documentation and the conditions for a complete CLI.
- [Audit / source map](cli/audit-and-sources.md): The dated evidence snapshot and references S01–S14.

## Book documents and task sources

- [Book language / dialect](book-language.md): Human-readable documents with distinct agent and task semantics.
- [Commitments](deprecated/commitment-registry.md): Keyword-led blocks that add agent behavior; the detailed agent registry retained here is historical. Task commitments use the task contract below.
- [Task Book / TASK](cli/task-books.md): A Book explicitly declared as a task, rather than an agent.
- [Legacy Markdown / section / status marker](cli/task-markdown.md): Compatible task sections separated by a standalone line of three hyphens, with control metadata on the first nonempty line.
- [Lifecycle / STATUS](cli/task-books.md#commitment-meanings): Public todo, in-progress, done, failed and not-ready state, distinct from internal runtime phases.
- [Priority / PRIORITY / routing / RUNNER](cli/task-markdown.md#priority-and-routing): Stable priority ordering and legacy OR selectors; [typed task routing](cli/task-books.md#commitment-meanings) adds AGENT/HARNESS/MODEL conditions.
- [META ID](cli/task-books.md#commitment-meanings): Stable unique task identity, not a file name or title. Agent META ID has separate historical semantics.
- [PROMPT / payload / task-local RULE](cli/task-books.md#parser-and-lossless-payload): Exact implementation input and task-specific instructions.
- [Literal payload / ptbk-task-literal-json](cli/task-books.md#parser-and-lossless-payload): The lossless fenced JSON-string wrapper used by task migration.
- [SourceReference / source revision / fingerprint](cli/domain-model.md#minimum-data-contracts): Source identity and version checked before writes; [legacy write rules](cli/task-markdown.md#source-changes-during-work).
- [META NOTE / META ORIGIN / provenance](cli/task-books.md#parser-and-lossless-payload): Non-executable notes and validated migration origin metadata.
- [Migration / migrate](cli/migration.md): Deterministic conversion of legacy sections to task Books without a model.
- [Task source / tasks / prompts / --tasks](cli/workspace.md): Resolved top-level discovery directories for Book and legacy tasks.
- [AGENTS.md / context](cli/cli.md#configuration-and-precedence): Additional project instructions selected independently of the agent Book.
- [Operational state / .promptbook/ptbk-coder](cli/initialization.md): Git-ignored locks, journals and check views; the historical directory name is retained for compatibility.

## Historical agent and server terms

All links in this section lead to [historical specifications](deprecated/_index.md).

- [APT / Agent–Project–Task framework](deprecated/whitepaper.md): The historical conceptual model and broader autonomy vision; not a separately exported Promptbook product.
- [Agent source / unresolved source / resolved source](deprecated/agents/source-resolution.md): Authored child source versus the effective source after inheritance and imports.
- [Agent profile / agent model requirements / agent hash](deprecated/agent-compilation.md): Lightweight parsing, compiled model instructions/tools and source-keyed caches.
- [PERSONA / GOAL / KNOWLEDGE / RULE / USE commitments](deprecated/commitment-registry.md): Agent instruction and capability keywords in the older registry.
- [FROM / inheritance / Adam](deprecated/agents/inheritance.md): Parent-source expansion and the implicit ancestor; FROM VOID opts out.
- [IMPORT / IMPORTS / import fallback / cycle detection](deprecated/agents/imports.md): Textual source inclusion and shared safe import mechanics.
- [Agent reference / pseudo-agent / User / Void / book-scoped sub-agent](deprecated/agents/references.md): Reference lookup and special or embedded agent identities.
- [Federation / federated server](deprecated/agents/federation.md): Public read-only discovery and reuse across server instances.
- [Self-learning / OPEN / CLOSED / Teacher / SAMPLE](deprecated/agents/self-learning.md): Append-only learning from conversations and teacher suggestions.
- [Avatar / visual / META IMAGE / META AVATAR / META VISUAL](deprecated/agents/avatars-and-visuals.md): Historical visual identity resolution and generated assets.
- [Generated Book documentation](deprecated/book-documentation.md): Server documentation derived from the commitment registry.
