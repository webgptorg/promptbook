# Server board section

The server section explains `ptbk coder server`.

## Required behavior to communicate

-   Server mode runs the same prompt processor as `ptbk coder run`.
-   It stays alive after the queue empties and watches for new runnable prompts.
-   It serves a local kanban board at `http://localhost:<port>`.
-   The browser can pause or resume the runner.
-   Prompt sections can be edited through the board.

## Mock board columns

-   Ready
-   Running
-   Draft
-   Done

## Related specs

-   [Visual design](../visual-design.md)
-   [Terminal walkthrough](../terminal-walkthrough.md)
