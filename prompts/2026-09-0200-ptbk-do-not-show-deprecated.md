[ ]

[✨💘] foo

```console
me@DESKTOP-2QD9KQQ MINGW64 ~/work/ai/promptbook (main)
$ npx ts-node ./src/cli/test/ptbk.ts
Usage: promptbook|ptbk [options] [command]

Create persistent AI agents that turn your company's scattered knowledge into action

Options:
  -V, --version                               output the version number
  -h, --help                                  display help for command

Commands:
  about [options]                             Tells about Promptbook CLI and its abilities
  run|execute [options] [pipelineSource]      Runs a pipeline

                                              Deprecated: This command is part of the old pipeline system.
  login [options]                             Login to the remote Promptbook server

                                              Deprecated: This command is part of the old pipeline system.
  hello|hi [options] [name]                   Just command for testing
  make|compile [options] [path]               Makes a new pipeline collection in given folder

                                              Deprecated: This command is part of the old pipeline system.
  prettify [options] <filesGlob>              Iterates over `.book.md` files and does multiple enhancing operation

                                              1) Adds Mermaid graph
                                              2) Prettifies the markdown

                                              Deprecated: This command is part of the old pipeline system.
  test [options] <filesGlob>                  Iterates over `.book.md` and `.bookc` and checks if they are parsabl

                                              Deprecated: This command is part of the old pipeline system.
  list-models|models [options]                List all available and configured LLM models

                                              Deprecated: This command is part of the old system.
  list-scrapers|scrapers [options]            List all available and configured scrapers and executables

                                              Deprecated: This command is part of the old system.
  start-agents-server|start [options] [path]  Starts a Promptbook agents server

                                              Deprecated: Use `ptbk agents-server start` instead.
  start-pipelines-server [options] [path]     Starts a remote server to execute books

                                              Note: You want probably to use "ptbk agents-server start" to start a
                                              server

                                              Deprecated: This command is part of the old pipeline system.
  agent [options]                             Run a Promptbook agent book directly in the terminal

                                              Subcommands:
                                              - chat: Run an interactive terminal chat session
                                              - exec: Send one message and print the response
  agent-folder [options]                      Non-coding agent utilities backed by repository message files

                                              Subcommands:
                                              - init: Initialize local agent queue and instruction files
                                              - run-once (alias: tick): Answer one queued message and exit
                                              - run-agent (alias: run): Watch one queue and answer messages one by
                                              - run-multiple: Watch direct child agent repositories in one shared
  agents-server [options]                     Local Agents Server runtime and coding-agent orchestration

                                              Subcommands:
                                              - build: Build the web server for later local startup
                                              - dev: Start the web server in development mode with hot reloading
                                              - init: Initialize local web server configuration
                                              - start: Start the web server and local coding-agent message runners
  coder [options]                             Coding utilities for automated development workflows

                                              Subcommands:
                                              - init: Initialize coder configuration in current project
                                              - add: Add one ready-to-run prompt file to the queue
                                              - generate-boilerplates: Generate prompt boilerplate files
                                              - find-refactor-candidates: Find files that need refactoring
                                              - find-unwritten: List prompt sections that still need to be authore
                                              - list: List ready prompts in priority order without running them
                                              - run: Run coding prompts with AI agents
                                              - ping: Test the connection, response time and quota of one harness
                                              - server: Start a long-running coder server with a kanban web UI
                                              - verify: Verify completed prompts
                                              - find-fresh-emoji-tags: Find unused emoji tags
  help [command]                              display help for command
```

-   @@@@@@@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json)
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing) if there are any changes that affect the landing page.
-   Add the changes into the [changelog](changelog/_current-preversion.md)
