[x]

[✨🏦] Simplify the design of the agent page

-   Agent page has pathname `/agents/[agentName]`
-   Current design has too much information and clutter, it should have just:
    -   Visually appealing and good looking agent profile
    -   Ability to start chat with the agent
-   All the links and complexity should be hidden in a dropdown menu or "More options" menu
-   Look for inspiration at attachment photo
-   It should visually match the Agent color theme, use `Color` object to create matching colors for background, buttons, etc.
-   Use some nice font for the agent name, like `Poppins`, `Montserrat`, `Raleway`, `Nunito`, etc.
-   Use nice rounded cards with Agent image
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

![alt text](screenshots/2025-11-0272-agents-server-agent-page-top-design.png)

---

[-]

[✨🏦] Enhance the design of the agent page

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🏦] Use the agents font on the agent page

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🏦] Allow multiple agent colors and use them all on the agent page

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🏦] Make agent avatar card flippable, on the back is the QR code with VCard

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🏦] Make the background of agent page noisy

```svg
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 1920 1080"
  width="1920" height="1080"
  preserveAspectRatio="xMidYMid slice">
  <defs>
    <!-- Bottom-left blue -->
    <radialGradient id="blueGrad" cx="0%" cy="100%" r="90%">
      <stop offset="0%" stop-color="#79EAFD" />
      <stop offset="50%" stop-color="#218794" />
      <stop offset="100%" stop-color="#0a1a2f" />
    </radialGradient>

    <!-- Bottom-right red -->
    <radialGradient id="redGrad" cx="100%" cy="100%" r="90%">
      <stop offset="0%" stop-color="#FEF3B0" />
      <stop offset="50%" stop-color="#913D25" />
      <stop offset="100%" stop-color="#2a0014" />
    </radialGradient>

    <!-- White top fade -->
    <linearGradient id="whiteTopGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.7" />
    </linearGradient>

    <!-- Strong grain -->
    <filter id="grain" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="3.5" numOctaves="3" seed="8" result="noise" />
      <feComponentTransfer>
        <feFuncR type="linear" slope="3.5" intercept="-1.2" />
        <feFuncG type="linear" slope="3.5" intercept="-1.2" />
        <feFuncB type="linear" slope="3.5" intercept="-1.2" />
        <feFuncA type="table" tableValues="0 0.8" />
      </feComponentTransfer>
    </filter>
  </defs>

  <!-- White base -->
  <rect width="100%" height="100%" fill="#ffffff" />

  <!-- Gradients -->
  <rect width="100%" height="100%" fill="url(#blueGrad)" />
  <rect width="100%" height="100%" fill="url(#redGrad)" style="mix-blend-mode:screen; opacity:0.85" />

  <!-- White fade on top -->
  <rect width="100%" height="100%" fill="url(#whiteTopGrad)" />

  <!-- Strong visible noise -->
  <rect width="100%" height="100%" filter="url(#grain)"
    style="mix-blend-mode:soft-light; opacity:1.2" />
</svg>
```

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🏦] quux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🏦] quux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
