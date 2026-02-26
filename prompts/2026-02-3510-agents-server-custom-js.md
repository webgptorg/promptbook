[x] ~$0.1756 10 minutes by OpenAI Codex `gpt-5.1-codex-mini`

[✨🍣] Allow to set custom javascript in Agents server

-   This javascript will be loaded on every page of the Agents server, and can be used to add custom functionality or integrations with third-party services.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Do a database migration for this change, create table `CustomJavascript`
-   Create `/admin/custom-js` page to manage custom JavaScript
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[x] ~$0.00 15 minutes by OpenAI Codex `gpt-5.1-codex-mini`

[✨🍣] Use proper Monaco editor for custom JavaScript editing.

-   When there is an unsaved change, prevent the browser from closing the page and show a warning to the user about unsaved changes.
-   Add a button to download custom JavaScript file.
-   Allow to create multiple JavaScript files, These JavaScript files would be applied all; this is just an organizational feature.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `CustomJavascript` before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍣] per page and user etc

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `CustomJavascript` before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[ ]

[✨🍣] Analytics integrations

-   Implement integration with Google Analytics and Smartsapp using the custom JavaScript functionality.
-   For Google Analytics, integrate the gtag.js library and provide an interface for users to input their tracking ID and configure basic tracking settings.
-   For Smartsapp, integrate their JavaScript SDK and provide an interface for users to input their workspace ID and configure basic tracking settings.
-   This should be effectively the same as adding full custom JavaScript, but for the user it should be much easier.
-   It should Be together with the custom JavaScript files.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `CustomJavascript` before you start implementing.
-   If you need to do immigration, do it.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍣] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `CustomJavascript` before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

