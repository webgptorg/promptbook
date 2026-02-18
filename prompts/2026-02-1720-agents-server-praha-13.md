[x] ~$0.27 30 minutes by OpenAI Codex `gpt-5.3-codex`

---

[ ]

[✨🚻] Fix the recording of chat history

```log
[ChatHistory] Failed to record message. {
  agentName: 'c3GobjqbReBto8',
  source: 'AGENT_PAGE_CHAT',
  error: {
    code: '23503',
    details: 'Key (agentName)=(c3GobjqbReBto8) is not present in table "local0_Agent".',
    hint: null,
    message: 'insert or update on table "local0_ChatHistory" violates foreign key constraint "local0_ChatHistory_agentName_fkey"'
  }
}
```

-   The chat history isn't recorded at all in the table `ChatHistory` in the database. Fix it.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of recording chat history before you start implementing.
-   If you need to do the database migration, do it.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[x] ~$0.00 3 minutes by OpenAI Codex `gpt-5.3-codex`

[✨🚻] Feedback record

-   The feedback is recorded in the table `ChatFeedback` in the database but only the last message from the chat thread that the feedback is given for is recorded. Fix it.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of feedback submission and storage before you start implementing.
-   If you need to do the database migration, do it.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[x] ~$0.00 a few seconds by OpenAI Codex `gpt-5.1-codex-mini`

[✨🚻] Record other metadata like timing in both chat feedback and chat history

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🚻] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
