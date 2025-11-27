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

---

[ ]

[✨🌕] foo

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🌕] foo

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
