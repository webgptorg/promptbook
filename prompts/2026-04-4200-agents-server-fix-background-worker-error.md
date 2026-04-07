[ ] !!!

[✨😴] Fix "Background worker lease expired before the chat turn finished."

```json
{
    "summary": "Background worker lease expired before the chat turn finished.",
    "source": "recoverExpiredRunningUserChatJobs",
    "recordedAt": "2026-04-07T21:02:28.678Z",
    "provider": null,
    "generationDurationMs": null,
    "error": null,
    "job": {
        "id": "79UKryj9jD5STh",
        "status": "RUNNING",
        "userId": 2,
        "agentPermanentId": "HSnsXr8uLXPptL",
        "chatId": "5A9WsHUxYwvrmk",
        "userMessageId": "1n371v5YiSJsQA",
        "assistantMessageId": "RDJmL96jqSVdmz",
        "clientMessageId": "uuNMx1bh8torr756qN",
        "attemptCount": 1,
        "queuedAt": "2026-04-07T20:42:17.023+00:00",
        "startedAt": "2026-04-07T20:42:18.188+00:00",
        "updatedAt": "2026-04-07T20:50:41.204+00:00",
        "lastHeartbeatAt": "2026-04-07T20:50:41.204+00:00",
        "leaseExpiresAt": "2026-04-07T21:00:41.204+00:00"
    }
}
```

-   This error happend especially when the agent was doing some long running task and more of the tasks are running
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨😴] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨😴] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨😴] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
