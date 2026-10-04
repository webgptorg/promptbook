[ ]

[✨🧭] Reposition the main README around autonomous agendas and the Agent–Project–Task framework

Make the owner's new whitepaper the conceptual basis of Promptbook's primary project introduction. The central proposition is no longer merely creating persistent agents, a company knowledge base, or a better interface for assigning prompts. Promptbook is a framework for long-term autonomous management of projects and agendas: move the human from repeatedly assigning subtasks toward owning the purpose, rules and delegated authority of an ongoing agenda.

This task owns the main README narrative, its imported source sections, and a concise positioning reference. The [following marketing-consistency PRD](2026-10-0090-unify-autonomous-agenda-marketing-claims.md) propagates that positioning to runtime claims, package metadata and other active marketing surfaces. These are documentation/positioning changes, not permission to implement the capabilities described by the whitepaper.

## Source and editorial authority

-   Use Pavol Hejný's supplied Czech whitepaper, *Promptbook — Od úkolování AI k autonomním agendám*, APT Framework, version 0.1, October 2, 2026, 13 pages. The conversation attachment is named `promptbook-whitepaper.cs(1).pdf`; that attachment name is not a repository path or a public URL.
-   The source-derived requirements below preserve the parts needed to implement this PRD without access to the chat attachment. Attribute the whitepaper by title, author, version and date. Link to a full copy only when an actual maintained repository or public destination has been established; do not invent a `/whitepaper` route or link to a local sandbox/attachment ID.
-   Preserve the source's terminology, conceptual distinctions and caveats. The document explicitly is not an independent code audit, benchmark, guarantee of autonomy, or trademark validation of the working name APT.
-   Separate three kinds of statements: the whitepaper's conceptual model; capabilities demonstrated by the inspected implementation/version; and planned extensions or long-term vision. Do not silently rewrite the whitepaper to resolve differences with code, or treat author-described behavior as proof that every deployment supports it.

## Proposed canonical copy

Use this proposed English copy as the common editorial baseline. Wording can be polished without changing the proposition or replacing it with another agent/chatbot slogan:

-   Main headline / short claim: **From AI tasks to autonomous agendas.**
-   Product descriptor: **A framework for long-term autonomous management of projects and agendas.**
-   Supporting explanation: **Define the purpose, rules and context of an ongoing agenda. Promptbook connects agents, project materials and tasks so work can be identified, carried out, checked and recorded within delegated authority.**
-   Framework name: **APT Framework — Agent–Project–Task**.
-   Source-language headline: **Od úkolování AI k autonomním agendám.**
-   Source-language descriptor: **Framework pro dlouhodobou autonomní správu projektů a agend.**

Explain an agenda as an ongoing area of responsibility, not a meeting agenda, a single task or merely a backlog. Keep the README in English, consistent with the current project documentation. This PRD does not require translating the entire README or inventing a new brand name.

## Required source-derived narrative

-   **The shift in responsibility** — whitepaper abstract and section 1, pages 2–3: a human assigns an ongoing agenda rather than initiating every next action. The intended difference is where meaningful work originates, not whether a single agent call lasts an hour or several days. Appropriate inactivity when there is no useful authorized work is part of the model.
-   **A means Agent, not Agenda** — sections 1–3, pages 3–5: agents carry roles, goals, rules and reusable expertise; the project is the context container and maintained materials; tasks describe concrete work. These are interacting parts of context, not a fixed A-then-P-then-T workflow, a hierarchy, or three separate products. An agenda is the combined system in continuing operation.
-   **The project need not be software** — section 3: it can contain code, documentation, accounting records, customer-communication material or references to external systems. A folder is the general context container; a Git repository enables the described common history. Do not imply the CLI supports every non-Git mode merely because the conceptual model does.
-   **Continuity belongs to maintained context** — sections 3 and 8, pages 4–5 and 8–9: intent, agent definitions, tasks, accepted results and relevant decisions remain useful when the model or harness changes. This is not a promise that providers are interchangeable without evaluation, that output is deterministic, or that an uninterrupted chat remembers everything.
-   **A controlled working cycle** — sections 5–6, pages 6–7: observe the state, select eligible work, perform a change, verify it and record the accepted state. Explain the difference between agents doing the work and deterministic orchestration selecting work, running checks and recording results. Passing checks validates what those checks measure; it does not prove complete correctness or professional compliance.
-   **Work can have more than one origin** — section 7, pages 7–8: human requests, findings from ongoing work, and agent goals or external events can lead to tasks. In the conceptual model an agent can create a follow-up task rather than expand its mandate silently. A goal alone does not wake a process; an actual trigger and operational controls are necessary. Running a prepared queue on a server is not by itself the full long-term-autonomy vision.
-   **Three implementation layers, distinct from A–P–T** — section 9, page 9: the APT framework organizes context; the executable engine/CLI acts on a workspace; the Agent Server provides a continuing runtime and interaction surface. Do not keep presenting the Agent Server as the entire definition of Promptbook or make the CLI seem unrelated to the framework. Preserve their legitimate individual purposes.
-   **Authority and human control** — section 10, page 10: goals are not unlimited permissions. Explain delegated scope and escalation for exceptions without claiming every recommended safeguard is already enforced. Do not market irreversible external actions, payments or formal submissions as consequences of a successful check or Git commit.

## README structure and reader journey

-   Rework the top-level title, opening paragraphs and section order so the first screen answers what Promptbook is, which ongoing problem it addresses and why continuity matters. Do not simply prepend an APT paragraph to the old server/knowledge-base pitch and leave contradictory messaging below it.
-   Start with the short claim and plain-language value proposition, followed by a compact illustration of the change from repeated task assignment to an ongoing agenda. Introduce technical vocabulary after its user benefit, not as an unexplained slogan.
-   Give three short, clearly illustrative use cases matching section 11, page 11: maintaining and developing a web application; organizing/reviewing accounting materials with expert escalation; and customer communication that can also generate documentation or product improvements. Do not turn these scenarios into claims of ready-made accounting, email, monitoring or payment integrations.
-   Introduce A, P and T with a small table or concise text example. A conceptual workspace example may use existing lowercase `agents/` and `prompts/` conventions, while labeling any future `tasks/*.book` example as planned until verified. The source's appendix is illustrative, not an instruction to rename directories to `Agents/`.
-   Explain context continuity, verification and common versioning with enough substance for a developer to understand the architecture. Keep detailed Book syntax, provider matrices and deployment internals in appropriate linked documentation rather than reproducing a 13-page paper or the complete language guide in the opening README.
-   Provide clear entry points to the current Coder/CLI workflow, Agent Server deployment and deeper Book/framework documentation. Verify command names, flags, package paths and prerequisites against the actual version before presenting a runnable quick start. Preserve fresh-server warnings and authentication requirements for deployment examples.
-   Retain discoverable installation, developer documentation, contributing, support, security and license information. Preserve useful badges and existing destinations. If sections move, update active internal links and preserve compatibility anchors where practicable; do not remove information merely to shorten the page.
-   Add a concise current-capabilities / planned-extensions / long-term-vision distinction near the relevant explanatory material. It should support a confident main proposition, not bury it in disclaimers or advertise roadmap items as ready to run.

## Explicit source/version discrepancies

-   The whitepaper's section 12 reports some time conditions, assignment and external-input behavior as existing according to its author. At this PRD's inspected baseline, the following PRDs remain pending: [date annotations](2026-10-0050-ptbk-coder-prompt-not-before.md), [task Books and migration](2026-10-0060-ptbk-coder-task-books-and-migration.md), and [recurring Books](2026-10-0070-ptbk-coder-recurring-task-books.md). Inspect the implementation when writing availability claims; a pending PRD or a whitepaper sentence is not an implementation test.
-   Keep task Books, recurrence, natural-language/event triggers, agent review and an installable agent catalog in the appropriate status category based on evidence. Do not add unsupported `TASK`, `REPEAT`, `--tasks`, `coder migrate` or unified-server quick-start commands simply to make the new positioning appear complete.
-   Section 6 describes recording a task's result and completion together in one commit. The newly requested [separate check commits](2026-10-0040-ptbk-coder-separate-check-commits.md) add phase-specific commits. Explain the shared-versioning principle and explicitly qualify actual commit boundaries when discussing that workflow; do not silently claim the source specifies separate commits or use this documentation change to override that PRD.
-   Reverting repository content is not a rollback of an email, payment or production action. Do not promise that every revert automatically restores a safely executable task or that all historical/intermediate commits satisfy the final checks.
-   The long-term vision includes agents independently identifying useful work and a project continuing beyond an owner's workstation. Describe this as the direction of the system where not demonstrated, not universal unattended operation or measured productivity.

## Source ownership and maintainability

-   The current `README.md` opens with `Promptbook: Invisible AI Agents` and imports `book/ABSTRACT.md`, which still centers the story on persistent agents and the Agents Server. Rewrite the authoritative imported narrative as well as the handwritten top-level introduction; do not edit only an imported copy that the next generation overwrites.
-   Inspect and preserve the `<!--Import ...-->` boundaries, generator warnings, package-insertion marker and badge generation in the current README pipeline. Keep deeper Book language material accessible at its authoritative documentation location if it is removed from the short project introduction.
-   Record the canonical proposition, terminology, approved short/long copy and availability rules in one small maintained positioning reference; `specs/product-positioning.md` is a proposed location, not an existing file. This reference is editorial source material for the companion PRD, not another competing whitepaper or marketing app.
-   Avoid duplicate long explanations across README, abstract and new documentation. Reuse existing import/generation mechanisms and link to detail. The companion PRD owns propagation through package generation and the runtime `CLAIM`; coordinate changes without a circular prerequisite.
-   Do not edit the supplied whitepaper to hide discrepancies, rewrite historical changelogs or past PRDs, rename commands/packages, change licenses, add autonomous runtime behavior, redesign the logo, or redesign another repository's website. A linked external landing page is not automatically part of this repository's write scope.

## Acceptance criteria

-   The rendered first screen identifies Promptbook as a framework for ongoing autonomous agendas, presents the user benefit and leads to real next steps. The old invisible-agent/knowledge-base framing is no longer its primary explanation.
-   The README correctly explains Agent–Project–Task, including the meaning of A, non-software project context, and the distinction between APT's three concepts and framework/engine/server layers.
-   All three source use cases appear with honest implementation/integration boundaries. Continuity, scoped authority and verification are explained without invented benchmarks, guaranteed correctness or effortless provider interchangeability.
-   Current capabilities, the author's source description, planned features and long-term vision are distinguishable. The pending scheduling/task-Book work is not advertised through unverified runnable examples, and the single-commit/check-commit difference is acknowledged rather than silently reconciled.
-   The top-level README and its authoritative imported narrative agree. Run the relevant existing documentation/import generation in a safe local workflow and confirm a repeat run does not restore old copy or create duplicate sections. Do not run deployment/release commands to verify a README change.
-   Review the Markdown rendering, headings, anchors, relative links, badges, code fences and installation/navigation paths. Use local/static checks and mocked or non-executing CLI validation where appropriate; no paid model calls, real server installation or autonomous jobs are required.
-   The diff is limited to documentation and necessary source/generation adjustments for that documentation. Record exact verification performed and any limitations, and add the implemented documentation change to the current changelog without implying the roadmap features shipped.

## Context

-   Inspect [main README](../README.md), [imported abstract](../book/ABSTRACT.md), [getting-started source](../book/GET_STARTED.md), [project instructions](../AGENTS.md), [Coder documentation](../scripts/run-codex-prompts/README.md), and current CLI/Agent Server entrypoints before writing examples.
-   Coordinate with [shared claim configuration](../src/config.ts), [package documentation generation](../scripts/generate-packages/generatePackageReadmesAndMetadata.ts), and [marketing consistency](2026-10-0090-unify-autonomous-agenda-marketing-claims.md).
-   Keep the implementation DRY, preserve source attribution and update the [changelog](../changelog/_current-preversion.md) when this PRD is implemented.
