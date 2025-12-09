[x]

[✨🌕] From `@promptbook/components` export component `<PromptbookAgent agentUrl="http://s6.ptbk.io/benjamin-white" />`

-   When this component is used, it should render the floating agent button with ability to open the chat window
-   Take the floating agent logic from [Promptbook studio](C:/Users/me/work/webgptorg/promptbook-studio/) under `src/pages/api/embed/miniapp.js.ts` and other relevant files
-   You can use this component to create Agent on one Promptbook Agents server and embed it on another website
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨🌕] It is failing on CORS and permitions

```log
external-agent:1 Access to fetch at 'https://s6.ptbk.io/benjamin-white/api/book' (redirected from 'http://s6.ptbk.io/benjamin-white/api/book') from origin 'http://localhost:4023' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

Update it such:

-   The public API endpoints for agents should be CORS enabled to allow embedding on other websites
-   Use `/agents/benjamin-white/api/profile` _(the `/agents/benjamin-white/api/book` wouldnt be publicy accessiblein future)_

```json
// Sample of /agents/benjamin-white/api/profile
{
    "agentName": "benjamin-dredxx",
    "agentHash": "abb301689969393714f891feee31207c88e540f4216f6cb4c68ae5d773d9ef9e",
    "personaDescription": "Witty and humorous digital friend.\n\n---",
    "initialMessage": null,
    "meta": {
        "color": "#00ffff",
        "image": "https://www.gravatar.com/avatar/353123459?default=robohash&size=200&rating=x"
    },
    "links": [],
    "parameters": []
}
```

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

<!--
Note: This has absurd cost of $5.8508 via Cline + `google-gemini-3-pro-preview`
![alt text](screenshots/2025-11-0280-agents-server-promptbook-agent-component.png)
-->

---

[x]

[✨🌕] Allow to pass agent meta-information into props of `<PromptbookAgent/>`

-   Purpose of this is to be able to show the agent information right away without fetching it from the server or showing some provisional avatar image and color
-   Allow to pass Partial optional `AgentBasicInformation` via props to `<PromptbookAgent meta={...}/>`
-   Information loaded from the server will override the passed props
-   When there is conflict, server information has priority but warn in the console about it
-   Usage will look like: `<PromptbookAgent agentUrl="http://s6.ptbk.io/benjamin-white" meta={{image: "https://www.gravatar.com/avatar/353123459?default=robohash&size=200&rating=x", color: "#00ffff"}} />`
-   The agent chip has now generic blue background color, use the `meta.color` instead
-   You are working with the `PromptbookAgent` component in `/src/book-components/PromptbookAgent/PromptbookAgent.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨🌕] Enhance `<PromptbookAgent/>` mobile UI and UX

-   On mobile, when chat is closet it should show only small floating button on the bottom right not fill the whole width
-   You are working with the `PromptbookAgent` component in `/src/book-components/PromptbookAgent/PromptbookAgent.tsx`

---

[x]

[✨🌕] Move the actions of the chat to the top bar and add there a close icon via extra actions

-   Move the chat actions (like New chat and Download) from the chat area to the top bar of the floating chat window
-   This should be only for PromptbookAgent not for every Chat component
-   Add a close icons in the Chat actions to be able to close the chat
-   Use `ChatProps.extraActions` to add this custom action
-   You are working with the `PromptbookAgent` component in `/src/book-components/PromptbookAgent/PromptbookAgent.tsx`
-   Create some system which will allow to move the existing chat actions to the top bar when used inside PromptbookAgent but keep them in the chat area when used normally
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨🌕] Add connected indicator to `<PromptbookAgent/>`

-   Show litterle green dot on the agent avatar when connected to the server _(able to fetch agent profile)_
-   For pending state show gray dot, when failed to connect show red dot
-   You are working with the `PromptbookAgent` component in `/src/book-components/PromptbookAgent/PromptbookAgent.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🌕] Foo `<PromptbookAgent/>`

-   You are working with the `PromptbookAgent` component in `/src/book-components/PromptbookAgent/PromptbookAgent.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🌕] Foo `<PromptbookAgent/>`

-   You are working with the `PromptbookAgent` component in `/src/book-components/PromptbookAgent/PromptbookAgent.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🌕] Foo `<PromptbookAgent/>`

-   You are working with the `PromptbookAgent` component in `/src/book-components/PromptbookAgent/PromptbookAgent.tsx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
