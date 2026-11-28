[x]

[✨✉️] Add a testing page to run browser in Playground app

-   Use Playwright to run a browser instance in the Playground app
-   The page should open a browser instance and navigate to `https://ptbk.io`, take a screenshot and display it on the page
-   The screenshot should be taken / refreshed on button press
-   The browser instance should not be headless and should be running in one instance for the whole session _(not restarting on each request)_
-   The request to do the screenshot should be made to an API route `/api/test-browser/screenshot` that will return the screenshot image as `image/png`
-   It should only open a new tab and close it after the screenshot is taken, the browser instance should remain running
-   It should be located on `/test-browser`, `http://localhost:4023/test-browser`
-   You are working with the `Playground app` application `/apps/playground`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨✉️] Copy browser opening logic from `/apps/playground` -> `/apps/agents-server`.

-   There should be page in Agents server on /admin/browser-test that will open a browser instance using the same logic as in Playground app
-   Add this page to the menu under "System -> Browser"
-   The browser instance should be requested via `apps/agents-server/src/tools/$provideBrowserForServer.ts`
-   You are working with the `Agents Server` application `/apps/agents-server`

---

[-]

[✨✉️] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨✉️] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
