[ ] !!!

[✨🌘] Add dark mode to agents server

-   There should be both dark and light mode
-   User can pick between system / dark / light mode using a toggle in the control panel, save this information in same place as other user preferences
-   By default, the app should follow the system theme
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing, go through all the pages of the agents server and identify all the components that need to be
    updated to support dark mode, and make sure to implement dark mode in a consistent way across all of them.
    -   Be aware that you need to do a dark mode for entire app and for all the components, for the components used from `src` pass the `theme` prop to the components, for example `<Chat theme="DARK" ... />`
    -   Be also aware that the you need consider app logo
    -   The app should look premium and well designed in both dark and light modes, so make sure to pay attention to the design details and make sure that the colors, contrast, and overall look and feel of the app is good in both modes.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
