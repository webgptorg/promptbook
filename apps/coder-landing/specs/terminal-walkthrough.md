# Terminal walkthrough

The terminal walkthrough is the core educational section of the page.

## Purpose

Show how a developer moves from zero setup to advanced `ptbk coder` operation using concrete commands.

## Required sequence

1. Install Promptbook:

```bash
npm install ptbk
npx ptbk coder --help
```

2. Initialize coder configuration:

```bash
ptbk coder init
```

3. Generate and write prompt files:

```bash
ptbk coder generate-boilerplates --template ./prompts/templates/common.md
```

4. Run the queue locally:

```bash
ptbk coder run \
  --harness openai-codex \
  --model gpt-5.5 \
  --thinking-level xhigh \
  --agent agents/developer.book \
  --context AGENTS.md \
  --test "npm test"
```

5. Run the local server:

```bash
ptbk coder server \
  --harness claude-code \
  --model fable \
  --thinking-level max \
  --agent agents/coding/developer.book \
  --context AGENTS.md \
  --test npm run test-for-ptbk-coder
```

6. Scale operation:

```bash
ptbk coder find-refactor-candidates --level medium --limit 10
ptbk coder run --priority 1 --auto-pull --auto-push --auto-migrate
ptbk coder verify --ignore experimental
```

## Prompt status explanation

-   `[-]` means a prompt section is not ready.
-   `[ ]` means a prompt section is runnable.
-   `[x]` means a prompt section is done.
-   `[!]` means a prompt section failed.
-   Extra `!` markers after `[ ]` raise priority.

## Related specs

-   [Content model](./content-model.md)
-   [Workflow section](./sections/workflow.md)
