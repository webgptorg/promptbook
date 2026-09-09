# Component: GitHub star call to action

The reusable outlined repository link used in the [header](../sections/header.md), on both desktop and in the expanded mobile menu.

-   A Promptbook-Blue star icon, the label `Star on GitHub`, and the current number of stars, divided by a subtle vertical border.
-   It links to https://github.com/webgptorg/promptbook, where a signed-in visitor can star Promptbook.
-   The star total comes from the public `stargazers_count` field at https://api.github.com/repos/webgptorg/promptbook. It is fetched on the server and cached for one hour, rather than through a client-side script.
-   If GitHub cannot provide the total, the link and its `Star on GitHub` call to action remain visible but the counter is omitted.
-   The link has an accessible label which names Promptbook, GitHub, and the star count when available. The decorative star icon and repeated visual count are hidden from assistive technology.
