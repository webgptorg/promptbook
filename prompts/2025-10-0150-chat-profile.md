[x]

[✨🔞] Chat component should have avatar profile on hover

-   When user hovers over the participant avatar in the chat component, it should show the avatar profile
-   Chat component is located in `src/book-components/Chat/Chat/Chat.tsx`
-   The avatar profile is located in `src/book-components/AvatarProfile/AvatarProfile/AvatarProfileFromSource.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x] _<- Repeat for other `style={{` _

[✨🔞] Do not use inline styles, use CSS modules

-   `<div style={{` <- Move inline styles to CSS module
-   Do it for `/src/book-components/Chat/Chat/ChatMessageItem.tsx` file
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨🔞] Chat component have avatar profile on hover

-   Make there some debounce so the profile does not appear immediately on hover but after 800ms
-   Allow to click and bypass the debounce - show immediately
-   Do not hide automatically when mouse leaves - add a close button to the top-right profile popup
-   Chat component is located in `src/book-components/Chat/Chat/Chat.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨🔞] Chat component have avatar profile on hover

-   Make sure the avatar profile is not cut off when near the edge of the screen
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

![cropped avatar](screenshots/2025-10-0150-chat-profile.png)

---

[x]

[✨🔞] Chat component have avatar profile on hover

-   It should be outside of the main chat container to avoid being cut off by overflow hidden, it floating on top of everything on the page
-   Simmilar with "View Source" popup in `<BookEditor />`, the Book editor should be popup on top of everything
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

![alt text](screenshots/2025-10-0150-chat-profile-1.png)

---

[x]

[✨🔞] Add prop `isReadonly` to `<BookEditor />`

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[x]

[✨🔞] Chat component have avatar profile on hover

-   Allow to view the entire agent source in `<BookEditor />` from this preview
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[x]

[✨🔞] Chat component have avatar profile on hover

-   It closes the popup when clicking outside of it
-   **Also closes when pressing Escape key**
-   **Also closes when scrolling the page or the chat container**
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🔞] Chat component have avatar profile on hover

-   In this popup, there is a button "View Source" that should open the `<BookEditor />` with the agent source
-   **This button is not working** it only closes the popup NOT opening the `<BookEditor />`, fix it
-   The agent source in `<BookEditor />` should be in popup on top of entire page in a modal, this modal should be closable by "x" as well as clicking outside and pressing Escape key _(simmilar to avatar profile popup)_
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🔞] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
