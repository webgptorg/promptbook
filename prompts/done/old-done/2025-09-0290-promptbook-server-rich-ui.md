[x]

[✨👚] Make Promptbook server rich UI

-   Promptbook server is working perfectly fine as a backend service, but its UI on `/` is very minimal and not user friendly
-   Pass `RemoteServerOptions.isRichUi?: boolean` to the `startRemoteServer` function to enable the rich UI - default is `true`, when user passes `false`, the server should work as before
-   Put this flag also for running the server via CLI - `promptbook-server --no-rich-ui` should disable the rich UI
-   Make a rich UI for the Promptbook server on `/` path
-   Get inspiration from [book components preview server](/book-components/)
-   The UI part of the server should contain React components and TailwindCSS styles
-   By Promptbook server I mean `PROMPTBOOK server listening on port 4460`, `👨‍💻🟣 Run ptbk start-server`, function `startRemoteServer`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
    -   You can use the current server as API backend for the rich UI which will be the full Next.js app proxied / appended to the base server
-   Add the changes into the `CHANGELOG.md`

---

[x]

[✨👚] Enhance Promptbook server rich UI

-   Use React in the rich UI not inline HTML strings
-   Logic of remote server is in [`startRemoteServer` function](src/remote-server/startRemoteServer.ts)
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[-]

[✨👚] quux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[-]

[✨👚] quux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
