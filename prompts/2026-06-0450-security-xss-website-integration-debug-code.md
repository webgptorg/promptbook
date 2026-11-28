[-]

[🔐] Remove XSS-vulnerable debug code from website-integration page of Agents Server

-   The website-integration page at [`apps/agents-server/src/app/agents/[agentName]/website-integration/page.tsx`](apps/agents-server/src/app/agents/%5BagentName%5D/website-integration/page.tsx) contains two debug/test lines (120–122) that render the `htmlCode` variable using `dangerouslySetInnerHTML`:
    ```tsx
    {htmlCode}
    {just(true) && <div dangerouslySetInnerHTML={{ __html: htmlCode }} />}
    {just(true) && <div dangerouslySetInnerHTML={{ __html: `<h1>Test</h1>` }} />}
    ```
    The `htmlCode` variable is a `<script>` snippet that includes agent metadata (fullname, color, image, and other fields) formatted as a JSON string inside an HTML attribute. The metadata values are JSON-stringified but **not HTML-escaped**, so a single-quote character in any agent metadata field (e.g., fullname containing `'`) can break out of the `meta='...'` HTML attribute and inject arbitrary HTML/JS. Because `just(true)` evaluates to `true`, this code is currently **active in production** and renders user-controlled content as raw HTML.
-   The fix is to remove lines 120–122 entirely — these are clearly left-over debug/development lines and serve no production purpose. The `htmlCode` integration snippet is already correctly displayed via the `WebsiteIntegrationTabs` component on line 105.
-   The vulnerability is in [`apps/agents-server/src/app/agents/[agentName]/website-integration/page.tsx`](apps/agents-server/src/app/agents/%5BagentName%5D/website-integration/page.tsx) lines 120–122.
-   Do a proper analysis of the current functionality before you start implementing — confirm that removing lines 120–122 does not break any visible feature on the page.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
