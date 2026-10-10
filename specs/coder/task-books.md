# Task Books

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

## Canonical example

```book
Fix CSV export

TASK
META ID csv-export-quoting
STATUS todo
PRIORITY 2
AGENT {../agents/developer.book}
HARNESS openai-codex
AFTER 2026-10-30T09:00:00+01:00

PROMPT
Fix the export of cells containing commas, quotation marks and newlines.
Preserve the existing public interface and add a regression test.

RULE
Do not change the delimiter or column names.
```

## Commitment meanings

- **First nonempty line**: Human-readable title. It is not the task identity.
- `TASK`: Explicit document-type declaration in the header immediately after the title.
- `META ID`: Stable unique ID within the workspace. Create once during authoring/migration.
- `STATUS`: `todo`, `in-progress`, `done`, `failed`, `not-ready`.
- `PRIORITY`: Nonnegative integer; default 0.
- `AGENT`: An agent Book requirement using the existing name/path resolver. Relative references resolve against the declaring task Book.
- `HARNESS`: A typed requirement for a coding tool.
- `MODEL`: A typed model requirement; does not inherit the meaning of the agent Book commitment.
- `RUNNER`: Repeatable compatibility selectors for legacy routing, with OR substring matching within the group.
- `AFTER`: Inclusive earliest start instant.
- `REPEAT`: Fixed-interval recurrence; task Books only.
- `PROMPT`: Implementation payload.
- `RULE`: Ordered task-local instructions; do not permanently modify the agent Book.

When present, `AGENT`, `HARNESS` and `MODEL` form separate AND conditions. An optional `RUNNER` OR group is an additional condition. A missing typed field uses valid invocation/default context. A conflict with an explicit CLI choice must appear as an incompatible task; do not silently switch the tool, model or paid account.

**New decision:** a task without `META ID` or `STATUS` is incomplete and non-executable. The read-only parser does not add identity or state. Authoring commands add these values once. A duplicate ID blocks all conflicting definitions.

## Parser and lossless payload

Separate Book-block tokenization from the semantics of the agent and task dialects. An agent Book without a `TASK` header declaration remains an agent Book. Files without a valid task declaration in the task source do not become work.

Require a nonempty title, exactly one `TASK` header and exactly one nonempty `PROMPT`. `META ID`, `STATUS`, `PRIORITY`, `AGENT`, `HARNESS` and `MODEL` are singletons; `RULE` and `RUNNER` may repeat. `AFTER` and `REPEAT` may repeat only with semantically identical normalized values. Implement validation, escape/literal forms and diagnostics with a path and line number. Unrecognized `REPEAT`, `AFTER` or future control fields must not produce an immediately runnable task.

**New decision — exact literal form:** migration writes a fenced block under `PROMPT` with the info string `ptbk-task-literal-json`, containing exactly one valid JSON string. The parser decodes that string as the entire payload, without the wrapper or trimming. JSON escaping preserves newlines, a trailing newline, quotation marks, Unicode, `MODEL`/`RULE` lines, fences and `---`; the surrounding fence must be longer than any colliding backtick sequence in the serialization. An ordinary `PROMPT` without this exact marker remains regular multiline content. Do not confuse this special wrapper with a code block that is itself task content. Test an exact round-trip.

Store notes, historical costs, times and attribution as non-executable metadata rather than new routing instructions. **New decision:** reserve repeatable `META NOTE` for these and singleton `META ORIGIN` for migration provenance, with a validated JSON object (`sourcePath`, `sectionIndex`, `sourceChecksum`, `migrationVersion`). Preserve unknown metadata during round-trip; block unknown executable/control commitments.

## Related specifications

- [Legacy Markdown tasks](task-markdown.md)
- [Agent Books and context](agent-context.md)
- [Task eligibility](eligibility.md)
- [Not-before: earliest start](not-before.md)
- [Recurring task Books](recurrence.md)
- [Migrating Markdown tasks to Books](migration.md)
