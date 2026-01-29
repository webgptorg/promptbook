<!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

# What shape should the chat thread in Promptbook have?

-   Author: [hejny](https://github.com/hejny)
-   Created at: 10/24/2024, 12:32:08 PM
-   Updated at: 10/28/2024, 3:11:28 PM
-   Category: Polls (Promptbook asking community)
-   Discussion: #156

Advice, I'm solving the integration of native conversation threads in chat completion models for @Promptbook. So far we couldn't hold threads, we only summarized the previous conversation in the prompt and always started a new conversation. Now we'd like to add the ability to send the previous conversation to the model for completion as well, as the models allow: however, I have a dilemma how to technically handle this. In principle, two possibilities come to mind:

1.  Array
    Messages are represented as an array where it goes zig-zag assistant, user, assistant, user, assistant, user.

2.  Chains
    Each message can contain a link to the previous message, or null if it is the first message in the conversation. At the same time, each message has a unique UUID or hash, which is computed from both the content of the message itself and the hash of the previous message it links to.

Both have advantages and disadvantages. The former is technically simpler and also conforms to the much more direct format that APIs typically require. At the same time, purely from a programming point of view, the second solution strikes me as much more elegant. While it's a bit harder to implement, it has a lot of advantages, especially in complex branching conversations where multiple messages can reference the same source conversation, but I only keep each unique message in memory and cache.

I'd be glad for an opinion, some insight, insight on how others solve this, or how you solve it when integrating language models.

## Array

```typescript
const chatPrompt = {
    title: 'Promptbook speech',
    parameters: {},
    content: [
        'Write me a joke about programmers!',
        spaceTrim(`

        Why do programmers prefer dark mode?
        Because the light attracts bugs!

        `),
        'Explain it',
    ],
    modelRequirements: {
        modelVariant: 'CHAT',
    },
};
```

## Chain

```typescript
const chatPrompt = {
    title: 'Promptbook speech',
    parameters: {},
    content: 'Explain it',
    modelRequirements: {
        modelVariant: 'CHAT',
    },
    parent: {
        content: spaceTrim(`
            Why do programmers prefer dark mode?

            Because the light attracts bugs!
        `),
        parent: {
            content: 'Write me a joke about programmers!',
            modelRequirements: {
                modelVariant: 'CHAT',
            },
        },
    },
};
```
