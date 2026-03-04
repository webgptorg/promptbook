[x] ~$0.9852 40 minutes by OpenAI Codex `gpt-5.3-codex`

[✨😰] Make commitment `USE EMAIL` and allow agent to send emails

**For example, this AI agent can write emails:**

```book
Writing Agent

USE EMAIL agent@example.com
RULE Write emails to customers according to the instructions from user.
```

-   Allow the agent to be using SMTP for sending the emails.
-   These credentials should be stored in a wallet. It should be enable by the commitment `USE EMAIL`.
-   When agent doesn’t have the credentials for sending email, it should ask the user to add the credentials into the wallet, and give instructions on how to do it. _(look how `USE PROJECT` commitment is doing and do something similar for email credentials)_
-   Every email should be saved in the `Message` and `MessageSendAttempt`, look how the tables and the functionality around the sending of the emails _(and messages in general)_ is implemented and align with the current implementation and data model as much as possible.
    -   Sending of the email has two logical steps, first is creating the `Message` with the content of the email, and then creating the `MessageSendAttempt` which will be responsible for actually sending the email and storing the response and status of the sending.
    -   This logic should be abstracted and reusable, and the AI agent when sending the email should just call some tool like `send_email` with the email contents _(use the [type `Message`](src/types/Message.ts) as input object)_ and recieves the response and status of the sending, and all the logic of creating the `Message`, `MessageSendAttempt` and sending the email should be handled inside this tool and its dependencies.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   For inspiration on how to implement this, you can check the implementation of `USE PROJECT` commitment and how the credentials are stored in the wallet and used by the agent, and do something similar for email credentials.
-   If you need to do the database migration, do it
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Keep in mind that you are implementing only the outbound email sending functionality in this task, you are not implementing the receiving email functionality, receiving emails will be implemented in another task.
-   Keep in mind that you are not changing the behavior of the agents, you are just adding a new commitment `USE EMAIL` and related functionality
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[ ]

[✨😰] Rec emails

IMAP / POP3 credentials

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨😰] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨😰] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

