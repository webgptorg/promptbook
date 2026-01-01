[ ]

[✨🔑] Implement a tool calling into the `LlmExecutionTools`

-   There can be tools in the prompt object.
-   Implement a tool calling loop that will call the tools when the model requests it.
-   The `LlmExecutionTools.callChatModel` should return the final result, not the function tool calling.
-   All the callings should be happening inside this method and encapsulated in this method.
-   Keep in mind the DRY _(don't repeat yourself)_ principle, try to figure out some good abstraction for all the model providers and `LlmExecutionTools` do not to implement same thing multiple times across the repository.
-   Add the changes into the `/changelog/_current-preversion.md`

```typescript
// Jednoduchý Node.js chat s OpenAI, který využívá function calling (tools)
// pro výpočet SHA-256 hashů na vyžádání.
//
// Požadavky:
// npm init -y
// npm install openai dotenv
//
// Vytvořte soubor .env s: OPENAI_API_KEY=sk-...

require('dotenv').config();
const { OpenAI } = require('openai');
const crypto = require('crypto');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const tools = [
    {
        type: 'function',
        function: {
            name: 'compute_sha256',
            description: 'Vypočítá SHA-256 hash zadaného textu (string). Vrátí hash jako hexadecimální řetězec.',
            parameters: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: 'Text, jehož hash má být vypočítán.',
                    },
                },
                required: ['text'],
            },
        },
    },
];

async function compute_sha256({ text }) {
    const hash = crypto.createHash('sha256');
    hash.update(text);
    return hash.digest('hex');
}

const availableTools = {
    compute_sha256,
};

async function runChat() {
    const messages = [
        {
            role: 'system',
            content: 'Jsi užitečný asistent. Pokud uživatel požádá o SHA-256 hash, použij funkci compute_sha256.',
        },
    ];

    console.log("Chat je připraven. Pište zprávy (napište 'exit' pro ukončení):\n");

    process.stdin.on('data', async (input) => {
        const userMessage = input.toString().trim();
        if (userMessage.toLowerCase() === 'exit') {
            console.log('Konec chatu.');
            process.exit(0);
        }

        messages.push({ role: 'user', content: userMessage });

        while (true) {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini', // nebo "gpt-4o", "gpt-3.5-turbo" atd.
                messages,
                tools,
                tool_choice: 'auto',
            });

            const message = response.choices[0].message;
            messages.push(message);

            if (message.tool_calls) {
                for (const toolCall of message.tool_calls) {
                    const functionName = toolCall.function.name;
                    const functionArgs = JSON.parse(toolCall.function.arguments);

                    const functionToCall = availableTools[functionName];
                    if (functionToCall) {
                        const functionResponse = await functionToCall(functionArgs);

                        messages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            name: functionName,
                            content: functionResponse,
                        });
                    }
                }
                // Pokračujeme v loopu, abychom získali finální odpověď od modelu
            } else {
                // Finální odpověď – vypíšeme ji
                console.log('\nAsistent:', message.content, '\n');
                break;
            }
        }
    });
}

runChat().catch(console.error);
```

---

[-]

[✨🔑] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🔑] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🔑] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
