# Agent Books and context

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

Use existing Book semantics for persona/rules, `FROM`, `IMPORT`, knowledge and `TEAM`. Reusing the existing compilation may be a narrow library dependency; there is no reason to adopt the entire historical runtime. Title, path and supported aliases provide routing identity rather than replacing a stable task ID.

The request separates orchestration rules, effective agent instructions, task payload, task-local rules and additional project context. The coder owns status and Git finalization; instruct the harness not to commit itself. Load agent-file changes from disk at a clearly documented point, at least at each new invocation; one running attempt has an immutable snapshot.

Initialization provides `agents/.core/adam.book`, `agents/developer.book`, `agents/planner.book`, `agents/lawyer.book` and `agents/copywriter.book`. Add missing local Lawyer/Copywriter TEAM references to Developer/Planner without overwriting other instructions; leave a conflicting or invalid Book intact with diagnostics. Rerunning init must not overwrite local edits. Report missing or ambiguous references with the declaring file.

## Related specifications

- [User and CLI contracts](cli.md)
- [Project initialization](initialization.md)
- [Task Books](task-books.md)
- [TEAM consultations](team.md)
- [Coding harnesses](harnesses.md)
- [Book language](../book-language.md), including explicitly marked historical principles of inheritance and imports.
