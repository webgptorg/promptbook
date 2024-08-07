# Prepare Keywords

-   PIPELINE URL `https://promptbook.studio/promptbook/prepare-persona.ptbk.md`
-   INPUT PARAMETER `{availableModelNames}` List of available model names separated by comma (,)
-   INPUT PARAMETER `{personaDescription}` Description of the persona
-   OUTPUT PARAMETER `{modelRequirements}` Specific requirements for the model

## Make modelRequirements

-   MODEL VARIANT Chat
-   MODEL NAME `gpt-4-turbo`
-   EXPECT JSON

```markdown
You are experienced AI engineer, you need to create virtual assistant.
Write

## Sample

\`\`\`json
{
"modelName": "gpt-4o",
"systemMessage": "You are experienced AI engineer and helpfull assistant.",
"temperature": 0.7
}
\`\`\`

## Instructions

### Option `modelName`

Pick from the following models:

-   {availableModelNames}

### Option `systemMessage`

The system message is used to communicate instructions or provide context to the model at the beginning of a conversation. It is displayed in a different format compared to user messages, helping the model understand its role in the conversation. The system message typically guides the model's behavior, sets the tone, or specifies desired output from the model. By utilizing the system message effectively, users can steer the model towards generating more accurate and relevant responses.

For example:

> You are an experienced AI engineer and helpful assistant.

> You are a friendly and knowledgeable chatbot.

### Option `temperature`

The sampling temperature, between 0 and 1. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. If set to 0, the model will use log probability to automatically increase the temperature until certain thresholds are hit.

You can pick a value between 0 and 2. For example:

-   `0.1`: Low temperature, extremely conservative and deterministic
-   `0.5`: Medium temperature, balanced between conservative and creative
-   `1.0`: High temperature, creative and bit random
-   `1.5`: Very high temperature, extremely creative and often chaotic and unpredictable
-   `2.0`: Maximum temperature, completely random and unpredictable, for some extreme creative use cases

# The assistant

Take this description of the persona:

> {personaDescription}
```

`-> {modelRequirements}`
