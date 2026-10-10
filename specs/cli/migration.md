# Converting Markdown tasks to Books

[Main specification](../_main.md)

`ptbk migrate` explicitly converts local Markdown task sections into task Books. It performs no model call, harness installation, application implementation or browser action. `--dry-run` previews the plan without writing anything.

Create one Book per section. Preserve title, exact descriptive payload, state, priority, opaque routing alternatives, time restrictions, notes, assets and known completion history. Use task commitments and stable references; do not guess whether an opaque selector names a model or agent. Recalculate relative references without modifying unrelated code or URLs.

Verify equivalent meaning for every section before archiving its original file outside the executable queue. Keep the original bytes recoverable. An unconvertible section, changed source/destination or collision must not cause overwriting or premature removal. Unknown completion time remains explicitly unknown, not invented.

Interruption and rerunning must not produce two runnable copies of the same task. Preserve migration provenance, resolve ambiguity before execution and refuse live tasks. A successful conversion uses one scoped maintenance commit unless `--no-commit` was explicitly selected; push is not implicit.

See [Markdown tasks](task-markdown.md), [task Books](task-books.md), [references](../book-language/references.md) and [recovery](recovery.md).
