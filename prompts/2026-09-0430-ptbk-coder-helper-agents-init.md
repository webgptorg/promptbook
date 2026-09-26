[ ]

[✨🪈] Initialize Lawyer and Copywriter as reusable teammates of both Developer and Planner.

```bash
ptbk coder init
```

-   Add two supporting Book agents: Lawyer and Copywriter. Neither needs a dedicated CLI command.
-   Both must be available by default in the TEAM of Developer and in the TEAM of Planner.
-   This task owns the bundled definitions, project initialization, and TEAM declarations. Actual runtime consultation is a separate task, [TEAM support for Coder](2026-09-0440-ptbk-coder-team-runtime.md).

## Project-owned agent sources

-   Add bundled `agents/default/lawyer.book` and `agents/default/copywriter.book`, and initialize editable copies as `agents/lawyer.book` and `agents/copywriter.book`.
-   Together with the planning work, a normally initialized project must have Developer, Planner, Lawyer, Copywriter, and the shared Adam core Book. Use the existing `agents/` layout; do not create a competing `agents/coding/` layout for these defaults.
-   Reuse the established Book/core mechanism for shared instructions. Keep role-specific behavior in the corresponding Book, not hardcoded into individual harness adapters.
-   Ship the new Books with the published CLI package and resolve them using the existing bundled-asset mechanism.

## Responsibilities

-   Lawyer helps identify legal and compliance questions relevant to the particular application, such as licensing, privacy, handling personal data, third-party terms, and user-facing legal requirements.
    -   It should distinguish identified requirements, assumptions, uncertainty, and matters requiring qualified legal review.
    -   It must ask for relevant jurisdiction or product context when that changes the answer rather than inventing legal certainty or claiming that an application is certified compliant.
-   Copywriter helps make the application's text clear, useful, and consistent: labels, navigation, buttons, onboarding, errors, empty states, and other user-facing copy.
    -   It should respect the product's audience, language, terminology, and tone.
    -   Prefer meaningful text over generic supporting copy, redundant explanations, or promotional filler.
-   These are advisers available to the primary agent. Declaring them in TEAM must not force both agents to run for every unrelated task.

## Idempotent initialization and existing repositories

-   `ptbk coder init` must ensure the default agent files independently of whether a package script was added during that invocation. This explicitly extends the current referenced-artifact-only behavior for these standard role files.
-   Cover clean repositories, older initialized repositories containing only Adam/Developer, and partially initialized repositories with any subset of the default agents.
-   Create missing Books, but never replace an existing Lawyer, Copywriter, Developer, Planner, or Adam Book with a fresh template.
-   New Developer and Planner definitions must contain valid TEAM references to both helpers. References must resolve inside the initialized project without depending on this monorepo's absolute paths or a running Agents Server.
-   Upgrade existing valid Developer and Planner Books additively: add a missing default helper TEAM reference while preserving the user's persona, rules, existing teammates, and other content.
-   Use the current Book syntax and resolution semantics. Insert commitments where they remain valid, including around `CLOSED` or other structural elements, rather than blindly appending text after the end of an agent definition.
-   Recognize already present references to the same helper and avoid duplicate declarations or duplicate generated tools, including equivalent supported reference forms.
-   An unreadable, invalid, or conflicting target must produce a clear diagnostic rather than being overwritten. Preserve user content and explain any TEAM reference that could not be safely added.
-   Preserve existing package scripts, VS Code settings, PRDs, and context files. Report created, augmented, unchanged, and unresolved artifacts clearly.
-   A second successful initialization of an unchanged project must produce no further content changes.

## Acceptance criteria

-   A fresh init creates both helpers and valid TEAM declarations for both primary roles.
-   Re-running init in an older or partially initialized project adds exactly the missing default files and references, even when all package scripts already exist.
-   Customized helper Books are byte-for-byte preserved. Existing primary-agent rules and unrelated TEAM members are preserved during additive augmentation.
-   Repeated initialization does not duplicate TEAM entries, scripts, or files.
-   Both role Books resolve their helpers through the normal local Book resolver; tests cover supported equivalent references and structural edge cases.
-   Packaged-CLI tests verify that every initialized Book is actually distributed and available outside the Promptbook repository.
-   No new Lawyer/Copywriter CLI commands or teammate execution engine are introduced by this task.

## Context and related work

-   Build on [Planner initialization](2026-09-0410-ptbk-coder-planner-and-plan.md). Keep helper initialization distinct from [TEAM runtime support](2026-09-0440-ptbk-coder-team-runtime.md), which will verify real consultations.
-   Inspect [project initialization](../src/cli/cli-commands/coder/initializeCoderProjectConfiguration.ts), [referenced artifacts](../src/cli/cli-commands/coder/coderReferencedArtifacts.ts), [Developer initialization](../src/cli/cli-commands/coder/ensureCoderDeveloperAgentFile.ts), [default Books](../agents/default), and [local agent resolution](../src/cli/cli-commands/common/resolveLocalAgentSource.ts).
-   Keep in mind the DRY _(don't repeat yourself)_ principle. Share initialization logic instead of copying one ensure-function implementation for every agent.
-   Update init help and the [Coder landing website](../apps/coder-landing) where the default team is described.
-   Add the changes into the [changelog](../changelog/_current-preversion.md).
