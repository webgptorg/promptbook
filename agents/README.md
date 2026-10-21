# Agents for the Promptbook project

This is the draft team that maintains Promptbook using Promptbook itself. The owner can edit each Book directly. The four project roles end with `CLOSED` so automatic learning does not rewrite these drafts before that review.

| Agent | Responsibility | Book |
| --- | --- | --- |
| Pavol | Turn recorded product intent into scope, priorities and acceptance criteria; coordinate the specialists. This agent does not speak or approve decisions as the human owner. | [pavol.book](pavol.book) |
| Developer | Implement and verify bounded changes against `specs/`; identify documentation impact. | [developer.book](default/developer.book) |
| Spec-keeper | Maintain authorized specification changes, consistent terminology and acceptance scenarios; identify implementation gaps. | [spec-keeper.book](spec-keeper.book) |
| Community | Keep `README.md` and existing presentation and community materials aligned with verified behavior. | [community.book](community.book) |

All four inherit shared project instructions from [Adam](.core/adam.book). They consult one another through `TEAM`; this is advice, not inheritance or task scheduling. [Manager](.core/manager.book) fills missing execution choices and routes work to the appropriate role. [Chatter](.core/chatter.book) remains the default human conversation partner and can consult the team. Existing [Fixer](.core/fixer.book) and [Teacher](.core/teacher.book) retain their repair and evidence-based learning roles. The engine supplies Expert.

## Working together

1. Pavol frames a bounded outcome from recorded intent, consulting Spec-keeper about requirements and Developer about feasibility.
2. Manager assigns ordinary task Books. Spec-keeper provides specification paths and acceptance criteria; Developer implements and verifies the assigned behavior.
3. Community reviews affected README examples and presentation claims using implementation and verification evidence. Separate implementation and documentation tasks use explicit dependencies when order matters; `TEAM` alone does not order work.
4. Each task reports evidence and updates [the changelog](../changelog/_current-preversion.md). The engine owns checks, task completion stamps and commits.

The source of intended behavior is [specs/_main.md](../specs/_main.md) and its relevant linked specifications. A specification is not evidence that a feature has shipped. Preserve the original task brief and linked initial specification; add supporting material alongside them.

## Model and validation

[ptbk.json](../ptbk.json) selects native Claude Code with `claude-opus-5-5` both as the routing default and on the tool instance, so consultations use the same model. The project policy permits only Opus 5.5 or newer Opus. The model identifier is listed in [Anthropic's model overview](https://platform.claude.com/docs/en/models/overview); the installed Claude Code CLI accepts full model names. Codex remains configured but disabled for future selection. Model availability still depends on the native account; an unavailable required model is a blocker, not permission to use a weaker fallback. A future model upgrade should use a verified identifier and update both routing and tool settings together.

The real project check is `npm run check` (typecheck, tests and package checks), replacing init's informational placeholder. Book validation is separate: `node bin/ptbk.js lint --json`.

## Existing bases

Developer reuses [the existing Developer Book](default/developer.book) and coding practices from [Promptbook Developer](.legacy/coding/developer.book). Pavol draws on [Product Manager](.legacy/default/product-manager.book). Community draws on [Copywriter](.legacy/default/copywriter.book), [Aktualizátor prezentací](.legacy/default/aktualizator-prezentaci.book) and [Social Media Manager](.legacy/default/social-media-manager.book). Their reusable principles were adapted to the current repository and canonical Book language.

## Legacy reference

[.legacy/](.legacy/) keeps the former Agents Server sample Books as inactive reference: the Czech business demos with their `knowledge/` documents and generating `_prompt.md`, old copies of Adam, Teacher and Creator, Promptbook Developer and Unslopper. Their content is unchanged except for the `AGENT` opening keyword, so their `META`, `INITIAL MESSAGE` and `USE` lines still produce lint warnings without any effect. Because the folder is hidden, Manager does not route work to these Books and goal discovery does not ask them for tasks; the active definitions in `agents/.core/` take precedence over the duplicate names. Moving a Book out of `.legacy/` activates it as an ordinary agent, so convert it to the current language first.
