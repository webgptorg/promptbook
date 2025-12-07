[!]

[✨🦄] Create object that represents message from any source, inbound / outbound

**This is the structure of the `Message` object:**

```typescript
type Message<TParticipant> = {
    channel: string_name;
    direction: 'INBOUND' | 'OUTBOUND';
    sender: TParticipant;
    recipient: TParticipant;
    content: string;
    metadata: Record<string, really_any>;
};
```

-   Purpose of this is to prepare for future where we can have messages from different sources, not only chat messages in web chat
-   It should be ready for both inbound and outbound messages
-   It should be ready for web messages, email messages, sms, Whatsapp, Telegram, Facebook Messenger, etc.
-   For this create the database table `Message`
-   Create interface `Message`, distinct from existing `ChatMessage` and generic `Message`
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🦄] baz

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🦄] baz

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🦄] baz

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
