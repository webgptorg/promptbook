[x] (2 attempts) ~$0.2661 2 hours by OpenAI Codex `gpt-5.4`

[✨👝] Use the "Octopus2" as default agent avatars

-   Instead of AI generated images as default avatars for agents, use the "Octopus2" avatar visual as the default avatar for agents
-   Leverage that the avatars are animated and visually appealing to make the UI more fun and engaging, instead of static images
-   Be aware that this image is used in multiple places across the app, for example in the agent list, in the chat messages of the agents, in the agent profile, in OG and app icons, favicon,... so make sure to change it everywhere and make sure it works well in all those contexts
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   The avatar is located in `src/avatars/visuals/octopus2AvatarVisual.ts`
-   The "Octopus2" avatar is used for example in [Utils miniapp](apps/utils)
-   You are working with the [Agents Server](apps/agents-server) with the default avatars of the agents
-   If you need to do the database migration, do it
-   When the agent has set `META IMAGE` use it instead of the default avatar, but if `META IMAGE` is not set, use the "Octopus2" avatar as the default one
-   Respect `META COLOR` with one or multiple colors as input for the avatar visual
-   Implement it in a way that it can be easily extended and changed to different avatar visuals in the future
-   Do not delete the feature of generating images, just change the default avatar to the avatar visuals
-   Add the changes into the [changelog](changelog/_current-preversion.md)

