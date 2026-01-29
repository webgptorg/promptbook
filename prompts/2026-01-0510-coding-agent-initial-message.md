[x] ~$0.34

[✨📎] Change the coding agent initial message

-   Remove prompts that need to be written from the upcoming tasks
-   You are working with the [coding agent script](./scripts/run-codex-prompts/run-codex-prompts.ts)
-   Note: In the samples below only 2 @ not 3 were used to avoid triggering to be written logic
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

**Change this:**

```bash
ts-node ./scripts/run-codex-prompts/run-codex-prompts.ts --agent opencode
Running prompts with opencode
Done: 20 | For agent: 1 | To be written: 6
Following prompts need to be written:
  1) prompts/2025-12-1240-agents-server-better-agents-graph.md#22: Agents graph on home page should be redesigned using @@ library
  2) prompts/2025-12-1280-agents-server-linking-agents.md#1: @@
  3) prompts/2026-01-0250-client-baraja.md#104: And better and more expressive samples to prompt notation page @@
  4) prompts/2026-01-0340-show-result-before-self-learning.md#1: Show result before self-learning @@
  5) prompts/2026-01-0370-agents-server-uploading-lot-of-files.md#1: @@
  6) prompts/2026-01-0500-spacetrim.md#1: @@

Upcoming tasks (grouped by priority):
Priority 2:
 1. prompts/2025-12-1240-agents-server-better-agents-graph.md#22 - Agents graph on home page should be redesigned using @@ library
 2. prompts/2025-12-1280-agents-server-linking-agents.md#1 - @@
Priority 0:
 1. prompts/2026-01-0250-client-baraja.md#104 - And better and more expressive samples to prompt notation page @@
 2. prompts/2026-01-0340-show-result-before-self-learning.md#1 - Show result before self-learning @@
 3. prompts/2026-01-0360-agents-server-images.md#13 - Images are cached BUT other parameters besides `prompt` isn't considered.
 4. prompts/2026-01-0370-agents-server-uploading-lot-of-files.md#1 - @@
 5. prompts/2026-01-0500-spacetrim.md#1 - @@
```

**To this:**

```bash
ts-node ./scripts/run-codex-prompts/run-codex-prompts.ts --agent opencode
Running prompts with opencode
Done: 20 | For agent: 1 | To be written: 6
Following prompts need to be written:
  1) prompts/2025-12-1240-agents-server-better-agents-graph.md#22: Agents graph on home page should be redesigned using @@ library
  2) prompts/2025-12-1280-agents-server-linking-agents.md#1: @@
  3) prompts/2026-01-0250-client-baraja.md#104: And better and more expressive samples to prompt notation page @@
  4) prompts/2026-01-0340-show-result-before-self-learning.md#1: Show result before self-learning @@
  5) prompts/2026-01-0370-agents-server-uploading-lot-of-files.md#1: @@
  6) prompts/2026-01-0500-spacetrim.md#1: @@

Upcoming tasks (grouped by priority):
Priority 0:
 1. prompts/2026-01-0360-agents-server-images.md#13 - Images are cached BUT other parameters besides `prompt` isn't considered.
```

