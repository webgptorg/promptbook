# TEAM consultations

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

TEAM references, including inherited/imported declarations, create tools for individual advisors. The primary agent decides whether and when to ask. An advisor runs with its own Book and returns a labeled answer to the same task; its rules are not merged into the main system prompt.

Distinguish names precisely and explain ambiguity errors. Resolve relative references from the declaring Book, including during inheritance. Repeated references to the same Book mean one advisory tool. A local advisor does not require Agent Server. Do not send local credentials to remote Books or allow a remote source to reference the host-local filesystem.

All supported execution harnesses use a shared temporary tool bridge. Verify availability/discovery before work; text in the prompt alone must not falsely imply TEAM support. Without a consultation, no additional paid call occurs. Enforce shared depth, consultation-count, timeout and cancellation limits; an exhausted limit is a concrete result rather than infinite recursion.

Preserve default TEAM limits: a 5-minute consultation timeout, depth 4, 24 calls in total and at most 128,000 response characters. Count each actual inference in usage exactly once. An advisor must not independently claim the queue, commit or perform database migrations.

## Related specifications

- [Agent Books and context](agent-context.md)
- [Coding harnesses](harnesses.md)
- [Read-only planning](planning.md)
- [Attempts, retries and provider limits](retries.md)
