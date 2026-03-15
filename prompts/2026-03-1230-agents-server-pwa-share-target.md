[ ]

[📲🤝] Share into installed agent PWA (Android share sheet → new conversation)

-   *(@@@@ Written by agent)*
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
-   If the user is not authenticated, handle gracefully:
    -   Redirect to login and then continue the share flow if possible, otherwise show a simple recovery screen with the captured shared payload and a "Send" action. @@@
-   Handle “cold start” reliably (PWA not running): the shared payload must not be lost.
-   Security / privacy:
    -   Do not persist shared payload longer than needed; clear temporary storage after the first message is successfully created/sent. @@@
    -   Respect current upload limits and virus scanning behaviour (if any) for shared files. @@@
-   Error handling:
    -   If sending fails, the conversation should still be created and the message shown as failed with a retry option (consistent with current chat behaviour). @@@

-   Technical approach (high level):
    -   Implement as PWA Share Target (Web Share Target API) using manifest `share_target` so Android routes shares into the installed PWA.
    -   Use `action` endpoint/route in Agents Server that can accept `POST` with `multipart/form-data` (text + files) and then redirects to the created conversation URL.
    -   Ensure each agent-PWA build has unique identity (start_url/scope/manifest) so each installed agent becomes its own Android app + share target entry. @@@

-   You are working with the [Agents Server](apps/agents-server)
-   Touchpoints / files to inspect & update:
    -   [PWA manifest generation / metadata](apps/agents-server/@@@)
    -   [Agent install / PWA entrypoints](apps/agents-server/@@@)
    -   [Chat creation + sending pipeline](apps/agents-server/@@@)
    -   [File upload/attachments pipeline](apps/agents-server/@@@)
    -   [Routing into a specific conversation](apps/agents-server/@@@)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
