[ ] !

[✨🛅] Enhance terminal UI of `ptbk agent run`

**Now the terminal UI of `ptbk agent run` looks very simmilar to `ptbk coder run`:**

```bash

me@DESKTOP-2QD9KQQ MINGW64 ~/work/ai/promptbook-agents/agent (main)
$ npx ptbk agent run --agent github-copilot --model gpt-5.4
Watching messages/queued for queued agent messages.


                               ▄▄▄▄ ▄▄▄▄▄▄ ▄▄▄▄  ▄▄ ▄▄   ▄▄  ▄▄▄
                               ▄▄▄▄ ▄▄▄▄▄▄ ▄▄▄▄  ▄▄ ▄▄   ▄▄  ▄▄▄
                               ██▄█▀  ██   ██▄██ ██▄█▀   ██ ██▀██
                               ██     ██   ██▄█▀ ██ ██ ▄ ██ ▀███▀

┌ Session ─────────────────────────────────────────────────────────────────────────────────────┐
│ State     DONE  Message answered                                                             │
│ Runner   github-copilot  ·  gpt-5.4                                                          │
│ This run Task 1/1  ·  0 done  ·  1 left                                                      │
│ Backlog  Repo 1 total                                                                        │
│ Scope    Priority ≥0                                                                         │
│ Timing   Elapsed 2m  ·  Total estimating...  ·  ETA after first completion                   │
│ Progress ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0% complete (0/1 done) │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌ Current task ────────────────────────────────────────────────────────────────────────────────┐
│ messages/queued/message-0008.md                                                              │
│ Attempt 1/3  ·  Message answered                                                             │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌ Live output ─────────────────────────────────────────────────────────────────────────────────┐
│ › nárok na **5 týdnů dovolené**, tedy\n při plném úvazku obvykle **25 dní / 200 hodin**. ... │
│ › {"type":"assistant.turn_end","data":{"turnId":"11"},"id":"a44a88fe-c88d-45d3-933f-aeada... │
│ › {"type":"assistant.turn_start","data":{"turnId":"12","interactionId":"28baec45-c04e-492... │
│ › {"type":"assistant.message","data":{"messageId":"e6f45346-8e27-4f18-a4b5-7d2950460645",... │
│ › 0iW+Lm3lpi54l83F+d62PEPJXwAI9y5OzxTXXcpQZ8AXlxq+dyIR8bgkGnQyT/VJDcu2adukjh7zcceVni2RZZz... │
│ › {"type":"assistant.reasoning","data":{"reasoningId":"Ib/y6+7u3pVz5TrmJjQBIxHWQofYm/uYxZ... │
│ › {"type":"assistant.turn_end","data":{"turnId":"12"},"id":"126dbb7c-9445-4720-af60-d49da... │
│ › {"type":"result","timestamp":"2026-05-11T10:29:07.987Z","sessionId":"d60236e9-3718-480a... │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌ Controls ────────────────────────────────────────────────────────────────────────────────────┐
│  P  Pause   CTRL+C  Exit                                                                     │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
Tip: `ptbk coder run` used your default Git config because the coding-agent identity environment variables are incomplete.
For cleaner commit history, set `CODING_AGENT_GIT_NAME`, `CODING_AGENT_GIT_EMAIL`, and either `CODING_AGENT_GIT_SIGNING_KEY` or `CODING_AGENT_GPG_KEY_ID`.

me@DESKTOP-2QD9KQQ MINGW64 ~/work/ai/promptbook-agents/agent (main)
$
```

-   But it should be specific to `ptbk agent run`:
    -   The ASCII art should be (first letters) of the agent name. And I dont mean the `--agent` from the CLI flag but agent name from `agent.book` first line
    -   The Progressbar does not make sence, show total of queued and finished messages
    -   Add a box with 1:1 of user message (and trim it if it has lot of characters / lines), keep the live output
-   There are several things called agent:
    -   Agent as the entity defined by `agent.book` and used in the Agents Server
    -   Agent which executes the chat, which is the one from `--agent` CLI flag and can be for example `github-copilot` or `openai-codex`
    -   The name of the command group `ptbk agent`
-   Keep in mind the DRY _(don't repeat yourself)_ principle, especially try to share code between `ptbk agent run` and `ptbk coder run`
-   Do a proper analysis of the current functionality of `ptbk agent` and related functionality before you start implementing.
-   You are working with [`ptbk agent`](src/cli/cli-commands/agent/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
