[x] ~$0.3271 an hour by OpenAI Codex `gpt-5.3-codex` - not working

---

[x] ~$1.03 2 hours by OpenAI Codex `gpt-5.3-codex`

[✨🧒] My chats are not saved

-   I see my chat during the chatting but after refreshing the page it vanishes
-   It often changes how many chats I have in my chats left tray
-   They can suddenly disappear without any apparent reason
-   The problem doesn’t occur during the chatting in one thread itself, but it occurs when I refresh the page or when I have multiple chats and I switch between them, then some of them can disappear, sometimes disappear only one, sometimes all of them, and I see "No chats yet" in the left tray.
-   Once the chat is lost, it is lost forever, I cannot see it again, and I have to start a new chat with the agent, and I lose all the history of the previous chat, which is very bad experience.
-   Every chat has its own id `https://pavol-hejny.ptbk.io/agents/5XnBA2HmrLNazF/chat?chat=NhK39CyRyguBxT`, the `NhK39CyRyguBxT` is the id of the chat
-   Chats should be immutable, once they are created, they are append-only, they should not be changed or deleted, and they should be stored in the database permanently, so the user can see the full history of his chats with the agent, and he can refresh the page or switch between chats without losing any of them.
-   When the user navigates to the chat with the specific id, he should see the full history of that chat, and it should not matter whether he is refreshing the page or switching between chats, he should always see the full history of that chat.
-   Despite I have chatted with the agent, I see no history of it in the "My chats" sidebar panel, and after refreshing the page, the chat is lost and I see "No chats yet"
-   Do theese things
    1.  Try to fix this issue
    2.  When there is some problem with saving, indicate it simmilar to the book editor fail save
-   Keep in mind the DRY _(don't repeat yourself)_ principle, share thi notification warning when the chat saving fails with the book editor save failure notification, they should look the same and be reused
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database for the fix migration, do it

---

[-]

[✨🧒] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🧒] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🧒] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

