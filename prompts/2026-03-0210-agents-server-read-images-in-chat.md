[ ]

[✨📱] Allow agents to read images attached to chat messages

-   Users can attach image files to chat messages in the Agents Server UI, but LLM responses currently claim they cannot read images.
-   When user attaches an image to a chat message, include that image directly in the chat completion request sent to the model (multimodal input), so the model can see it.
-   This should work by default for every agent, without requiring any special capability toggles, commitments, browser, scraping, or other advanced tools.
-   Keep it super simple: only pass images through in the same completion request; do not add any new “vision tool”.
-   If the selected model/provider does not support images, handle gracefully:
    -   Fallback to current behavior but add a clear system-level hint to the assistant response like "This model cannot process images" and show to user in UI.
    -   @@@ confirm preferred fallback: automatically switch to a vision-capable model vs keep model and show error.
-   Support at least: PNG, JPEG, WEBP (and GIF as still image @@@).
-   Limitations / safety:
    -   Enforce max image size @@@ (bytes) and optional max dimensions @@@; show error in UI when exceeded.
    -   Do not store raw base64 in DB; store uploaded asset and reference by URL/id (current attachments mechanism) and fetch/stream it to provider.
    -   Ensure access control: only chat participants (and the running agent) can access the image bytes.
-   UX:
    -   In chat bubble, keep showing attachment thumbnail as today.
    -   Add small badge/tooltip on the assistant message when images were included in the request (for debugging) @@@ optional.
-   Implementation notes:
    -   Convert stored attachment into the provider-specific "image" content part (for OpenAI-compatible chat completions: content array containing {type:"input_image"/"image_url"...} @@@ depending on current API client).
    -   Ensure streaming responses still work.
    -   Ensure works for: agent profile chat UI, "team" agents, and API chat endpoint if exists @@@.
-   Do a proper analysis of the current functionality before you start implementing.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   You are working with:
    -   [chat attachments utilities](apps/agents-server/src/utils/chat/chat-attachments.ts)
    -   Chat API route(s) that build provider messages @@@
    -   Provider adapter(s) for chat completions @@@
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨📱] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨📱] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨📱] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨📱] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
