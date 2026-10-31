# TASK CHANGE

[Commitments](_index.md) · [Task control](../../cli/task-control.md) · [Layering](../layering.md)

**Document:** Task.

`TASK CHANGE <timestamp> <scope> [<chat-reference>]` appends a chronological amendment. Timestamp requires an explicit timezone; scope is `task`, `occurrence` or `future`. An optional trailing `@Name`/`{Full chat name}` names the source chat through the ordinary resolver. The following natural-language content describes the requested change and its intended conflict with previous instructions. It must not be empty. Occurrence selection and original user-message correlation are preserved in durable control provenance; a timestamp is not a unique occurrence or message ID.

`task` affects the definition and applicable current/future execution; `occurrence` only the selected run; `future` only subsequent runs. Apply amendments in source order. Supersede only explicitly changed instructions, retaining unrelated constraints and every earlier layer. Literal content and TASK NOTE are not changes. Invalid/ambiguous amendments are saved/diagnosed but cannot silently grant authority or become successful Applied receipts. Source-chat text alone does not establish trusted user authority.

Changes to typed scheduling/routing fields additionally append the appropriate typed commitments in the same accepted revision. A change requiring further work on a successfully completed or cancelled one-off task also appends TASK REOPEN; TASK CHANGE alone does not clear DONE or a terminal status. Engine delivery receipts are separate from source semantics: a valid saved amendment is not proof a live harness incorporated it.

```book
TASK CHANGE 2026-10-31T20:00:00+01:00 task {Discuss CSV export}
Keep the existing column order and add an encoding selector.
TASK CHANGE 2026-10-31T20:01:00+01:00 occurrence {Discuss CSV export}
For this run only, write the sample under examples/.
```

This uses the common multiword commitment grammar. Do not reinterpret it as another TASK declaration or require implementation changes as part of authoring this specification.

For source interpretation, subsequent task scalar/status/schedule commitments belong to the preceding TASK CHANGE amendment until the next TASK CHANGE, TASK REOPEN or TASK DONE; they inherit its scope. A typed control before any change is task-wide. The amendment carries its source position and selected occurrence provenance through persistence/export, so reconstructing its effective meaning does not depend on a transient socket or process. Additive dependency/runner declarations retain their own semantics; ambiguous unsupported changes to those sets require explicit diagnosis rather than silently deleting earlier values.
