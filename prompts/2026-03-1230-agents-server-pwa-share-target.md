[ ]

[📲🤝] Share into installed agent PWA (Android share sheet → new conversation)

-   In Agents Server, agents can be installed as PWA applications and appear as normal apps in Android.
-   Add support for sharing into an installed agent PWA via the Android system share sheet (same feel as sharing to Telegram/WhatsApp/Messenger).
-   Selecting an installed agent from the share sheet must create a new conversation (chat) with that shared content as the initial message.
-   After the share is completed, the initial user message must be auto-sent immediately (no extra user confirmation) and the PWA should open directly into that new conversation.
-   Supported share payloads:
    -   Text share: create the first user message containing the shared text.
    -   File share (image / document): create the first user message (can be empty or a short system-generated text like "Shared file") and add the shared file(s) as attachments.
-   Do not support “various sharing types” beyond the above:
    -   No special handling for contacts, locations, audio recordings, multiple intents, etc.
    -   No rich previews beyond what the existing chat UI already does.
-   The agent should be presented to the user like a contact:
    -   Share sheet shows the agent PWA icon + agent name.
    -   Opening the share target lands in a 1:1 chat UI (agent as the recipient).
-   If the user has multiple agents installed as PWAs, each installed agent must appear as a separate share target option.
-   Handle “cold start” reliably (PWA not running): the shared payload must not be lost.
-   You are working with the [Agents Server](apps/agents-server)
