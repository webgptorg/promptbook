            <!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

            # 🔳 Metaprompting

            - Author: [hejny](https://github.com/hejny)
            - Created at: 6/23/2024, 11:04:19 PM
            - Updated at: 10/24/2024, 12:21:08 PM
            - Category: Concepts
            - Discussion: #35

            - Generating Prompts from Promptbooks
            - Generating Promptbooks from Promptbooks
            - Updating prompts using Promptbooks
            - Updating Promptbooks from Promptbooks
            - Extending prompts using promptbooks
            - Extending promptbooks using promptbooks
            - Break one prompt into multiple
            - Break N prompts to N
            - Auto summarization - fractal / recursive /...
            - [Emulation, Metamodel, Model variant](https://github.com/webgptorg/promptbook/discussions/95)

            ## Comments

### Comment by hejny on 6/24/2024, 12:22:03 PM

## What we tried

_(Describe our experience here)_

---

### Comment by hejny on 6/24/2024, 2:59:07 PM

## 🔎 Existing solutions

_(Do some research / discussion)_

-   Has anyone else had the same problem?
-   Has a project come up with the solution
-   Is there a research paper about it?
-   Is there an article, video, podcast about it?
-   Is this even a good idea?

---

### Comment by hejny on 10/24/2024, 12:21:08 PM

```typescript
const chatPrompt = {
    title: 'Promptbook speech',
    parameters: {},
    content: spaceTrim(`
        Write Promptbook pipeline which gets name of the company and returns list of domains to register

        - Input parameter is \`companyName\`
        - Output parameter is \`domains\` separaed by new line
        - Itterate over list of domains to check if they are available
        - Use \`$checkDomain(domain: string): boolean\` to check if domain is available
    `),
    modelRequirements: {
        modelVariant: 'CHAT',
        // TODO: [👨‍👨‍👧‍👧] systemMessage: 'You are an assistant who only speaks in rhymes.',
        // TODO: [👨‍👨‍👧‍👧] temperature: 1.5,
    },
};
```
