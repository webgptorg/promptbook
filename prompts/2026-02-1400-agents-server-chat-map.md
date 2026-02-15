[x] ~$0.48 14 minutes by OpenAI Codex `gpt-5.1-codex-mini`

[✨📌] Allow to render the map inside a chat

When the agent sends a message with a map geojson feature, render the map with this feature inside the chat, so the users can see the map and the location of the feature on it:

**For example, the agent can send a message like this:**

```markdown
Sure! Here is the location of the nearest cafe:

\`\`\`geojson
{
"type": "FeatureCollection",
"features": [
{
"type": "Feature",
"geometry": {
"type": "Point",
"coordinates": [37.7749, -122.4194]
},
"properties": {
"name": "Nearest Cafe"
}
}
]
}
\`\`\`
```

-   Note \`\`\` are just here double escape characters, the actual message from the agent will contain `geojson ... ` without escaping.
-   Use leaflet for rendering the map, and make sure to render the feature on the map according to the geojson data.
-   This map should be inside a message box.
-   Message can contain the map freely in the content of the message. The message can contain any combination of text and features. For example, technically a chat message can contain the headings, formatting, tables, map, generated image, LaTeX,.. . Now we are implementing only map. I have sayd this as an example.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current rendering of special message objects like image generation, quick buttons, LaTeX,... before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨📌] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨📌] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨📌] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

