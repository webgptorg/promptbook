[ ]

[🌙🧩] Implement message replies (faded replied-to preview + swipe-to-reply) and proper data model

-   *(@@@@ Written by agent)*
-   You are working with the [Agents Server](apps/agents-server)
-   Users can reply to an existing message within a thread (threads already exist, but replies do not)
-   The reply must be integrated in the message object so the replying agent can always know:
    -   the thread it is replying in
    -   the specific message it is replying to
-   UI/UX requirements (chat app style):
    -   When composing a reply, show a faded “replying to” preview (similar to WhatsApp/Telegram)
    -   Each message that is itself a reply must render the same faded “replying to” preview (pointing to the original message)
    -   Swipe-to-reply gesture:
        -   swiping on a message sets the composer into reply mode for that message
        -   swipe interaction should be discoverable and not conflict with scrolling
    -   Reply mode can be cancelled (e.g., X/escape) and composer returns to normal
-   Backend/API/data model requirements:
    -   Data model must support storing the “replied-to” relationship inside the message object
    -   Proposed fields (placeholders until we inspect current schema):
        -   `repliedToMessageId: @@@`
        -   `repliedToThreadId: @@@`
        -   `replyRootMessageId: @@@` (optional denormalization for fast UI rendering)
    -   Ensure referential integrity (the replied-to message must belong to the same thread)
    -   Add/adjust API endpoints so the UI can:
        -   create a reply with `threadId` + `repliedToMessageId`
        -   fetch messages including the reply context needed by the UI
-   Agent/participant behavior:
    -   The agent handling a reply must receive sufficient context to understand what message is being replied to (thread + replied-to message)
-   Migration/backward compatibility:
    -   Existing messages without replies must remain valid
    -   Migration should add the new reply-related columns/fields with null defaults
-   Entry points for the implementation work:
    -   Update message schema/types and persistence layer for Agents Server
    -   Update chat UI components (message item + composer)
    -   Update chat API client/server contracts
-   Acceptance criteria:
    -   A user can swipe a message to start replying
    -   A reply is persisted and reloads correctly
    -   The replied-to preview is visible both in composer and on the sent reply bubble
    -   The backend can validate that replied-to message belongs to the same thread
    -   The agent receives thread + replied-to message context when generating a reply

Sources: 【some-common-things-about-promptbook.txt】