[x]

[✨😋] Create test function that will scroll the Facebook

-   On page `/admin/browser-test` there is a testing suite for browser automation
-   For now there is one button that screenshots the `https://ptbk.io` homepage
-   Add a second button "Scroll Facebook" that will:
    -   Open `https://www.facebook.com/`
    -   Wait for the page to load
    -   wait for the user to be logged in _(check for presence of profile avatar or other element that indicates user is logged in)_
    -   Scroll down the page indefinitely, loading more content
    -   Project the browser view on the page so the user can see the scrolling in action
        -   Note: Now the browser is not headless, so you can see both the projected view and the actual browser window but in the future the browser might be headless so the projected view is the only way to see what is happening
-   This should be the second button on the page, next to the existing "Take Screenshot" button
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle, reuse any existing code where possible, create abstractions if needed.

---

[ ]

[✨😋] Create agentic behaviour on Facebook

-   Change "Scroll Facebook" to "Act on Facebook"
-   The button will now:
    -   Open `https://www.facebook.com/` _(already implemented)_
    -   Wait for the login _(already implemented)_
    -   Pass this to the AI agent with tools to interact with the page
    -   The agent should perform actions such as liking posts, commenting, and navigating through different sections of Facebook based on a given goal
    -   Before running the agent (pressing the button), there should be an input field where the user can specify the goal for the agent, e.g., "Like 5 posts about AI" or "Comment on my friend's latest post"
    -   Before any action is performed, the confirmation dialog should appear showing the planned actions and asking the user to confirm before proceeding
    -   Project the browser view on the page so the user can see what is happening _(already implemented)_
        -   Note: Now the browser is not headless, so you can see both the projected view and the actual browser window but in the future the browser might be headless so the projected view is the only way to see what is happening
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨😋] qux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨😋] qux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
