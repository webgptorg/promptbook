[ ]

[✨🫙] Initialize a self-contained `prompts/README.md` that explains PRDs and the Promptbook Coder workflow.

```bash
ptbk coder init
```

-   Extend `ptbk coder init` to create a useful README inside the prompts directory it initializes.
-   The README must make the directory understandable to a developer or another coding agent without requiring Promptbook Coder to be installed, an account, or access to this Promptbook monorepo.
-   This task is about generating the README in arbitrary initialized projects, not merely writing one README manually in this repository.

## Explain the directory and the workflow

-   Explain that the Markdown files are version-controlled implementation specifications and a work queue: they describe intended changes, not already implemented behavior.
-   Describe the actual initialized layout, including pending PRDs, `done/`, `templates/`, and runtime traces where applicable. Clearly distinguish specifications, reusable templates, completed-task history, and diagnostic artifacts.
-   Explain how filenames, numbering, task titles, emoji tags, multiple sections, and references to repository files fit together. Separate conventions from syntax the runner actually enforces.
-   Include a small realistic example PRD with a goal, concrete requirements, relevant file references, scope boundaries, and acceptance criteria. Explain how a person adapts it to their project.
-   Describe the authoring-to-implementation lifecycle: discuss/write a task, review it, make it runnable, select and implement it, verify the result, record its status, and review/commit the changes.
-   Explain `ptbk coder init`, `add`, `list`, `run`, and applicable verification/archive commands based on current CLI behavior. Include `plan` and its planning-only role once the related planning feature is present; do not advertise unimplemented commands as available.
-   Distinguish a Book agent from a harness and a model. Explain the local role Books, command defaults, and `--agent` override when those features are available, without copying the entire CLI reference into the README.

## Document real annotations

-   Derive the status reference from the parser and tests, not from assumptions based on historical examples.
-   Explain the current recognized markers: pending `[ ]`, in-progress `[^]`, completed `[x]`, failed `[!]`, and not-ready `[-]` / `[.]`, including any accepted case variants and trailing metadata.
-   Explain priorities expressed with `!`, supported runner/model/agent targeting annotations, section separators written as `---`, and how task selection works. State which settings affect scheduling versus task content.
-   Explain implementation attribution, model/harness names, cost/time metadata, and other completion information as observed runner metadata; manual users must not fabricate measurements or mark unverified work as verified.
-   Document placeholders and unfinished drafts, including how to keep incomplete requirements out of the runnable queue. Do not describe `[?]` or another historical marker as a supported skip state unless the actual parser supports it.
-   Keep examples compatible with the current parser, including status-line placement and multiline task sections. Do not change the PRD format simply to make the documentation easier to write.

## Work without Promptbook Coder

-   Provide a complete manual/alternative-agent path: select a ready PRD, read its repository context, implement only the scoped changes, run its acceptance checks, record an accurate result/status, and review the Git diff before committing.
-   Explain that the same Markdown can be handed to another coding assistant or implemented by a person. Promptbook Coder automates the workflow; it is not required to understand the requirements.
-   Keep essential explanations in the generated file so it remains useful offline. External links should add context, not replace the local instructions.
-   Include links to the [Promptbook Coder website](https://coder.ptbk.io), the [Promptbook repository](https://github.com/webgptorg/promptbook), and relevant Coder documentation.
-   Use project-relative paths correctly. A README generated in another repository must not contain broken local links to Promptbook's own `src/` or `scripts/` directories.
-   Keep the README substantial enough to answer these questions but concrete and readable, without generic marketing filler or a frozen list of model versions.

## Initialization and queue safety

-   Generate the README from a maintained, packaged template shared by initialization. Do not scatter copies of the same documentation across unrelated functions.
-   Create it when missing in both fresh and partially initialized projects. Preserve an existing user-owned README rather than replacing or repeatedly appending to it.
-   Report its created/unchanged status in the initialization summary and preserve the existing non-destructive behavior for other project artifacts.
-   The README and its sample status lines must never become runnable prompts. Ensure task discovery, listing, numbering, verification, and archival logic consistently exclude this documentation where relevant.
-   Do not accidentally suppress initial prompt boilerplates because README creation made the prompts directory non-empty. Preserve the intended fresh-init behavior while keeping repeated init idempotent.
-   Do not broadly restrict valid user PRD filenames or change task parsing just to exclude one documentation file.

## Acceptance criteria

-   Fresh and partially initialized projects receive the README; an existing customized README remains unchanged on repeated init.
-   The published CLI package includes the template and creates the same documentation outside the monorepo.
-   Tests verify the recognized status/priority examples against current parser behavior and keep documented commands aligned with the command registry.
-   Adding the README does not create phantom tasks, change existing task numbering/selection, or move the README into `done/`.
-   A clean init still produces the expected boilerplates, and the second init produces no duplicate content.
-   A developer can follow the manual workflow using only the generated Markdown and ordinary repository tools.

## Context and related work

-   Inspect [init](../src/cli/cli-commands/coder/init.ts), [project initialization](../src/cli/cli-commands/coder/initializeCoderProjectConfiguration.ts), [boilerplate templates](../src/cli/cli-commands/coder/boilerplateTemplates.ts), [prompt parsing](../scripts/run-codex-prompts/prompts/parsePromptFile.ts), [prompt status types](../scripts/run-codex-prompts/prompts/types/PromptStatus.ts), and [prompt numbering](../scripts/utils/prompts/getPromptNumbering.ts).
-   Coordinate the workflow text with [planning](2026-09-0410-ptbk-coder-planner-and-plan.md), [default agents](2026-09-0420-ptbk-coder-default-agents.md), and [helper initialization](2026-09-0430-ptbk-coder-helper-agents-init.md) as they become available.
-   Keep in mind the DRY _(don't repeat yourself)_ principle. Update the [Coder landing website](../apps/coder-landing) where the generated documentation is relevant.
-   Add the changes into the [changelog](../changelog/_current-preversion.md).
