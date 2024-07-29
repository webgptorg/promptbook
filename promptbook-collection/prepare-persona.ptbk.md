# Prepare Keywords

-   PIPELINE URL `https://promptbook.studio/promptbook/prepare-persona.ptbk.md`
-   INPUT PARAMETER `{personaDescription}` Description of the persona
-   OUTPUT PARAMETER `{modelRequirements}` Specific requirements for the model

## Make modelRequirements

-   MODEL VARIANT Chat
-   MODEL NAME `gpt-4`
-   EXPECT JSON

````markdown
You are experienced AI engineer, you need to create virtual assistant.
Write

## Sample

\`\`\`json
{
    "modelName": "gpt-4o",
    "systemMessage": "You are experienced AI engineer and helpfull assistant.",
    "temprerature": 0.7
}
\`\`\`

# The assistant

Take this description of the persona:

> {personaDescription}

```

`-> {modelRequirements}`

