[x]

[✨🪛] Make `useSendMessageToLlmChat` hook

-   This allows to send message to any `LlmChat` component from anywhere in the React tree
-   It will do the same thing as user typing message into the input and pressing Enter
-   It will add the message to the chat thread and trigger sending it to the LLM
-   Hook `useSendMessageToLlmChat` exists alongside the `LlmChat` component
-   Hook `useSendMessageToLlmChat` is exported from `@promptbook/components`
-   Make some sample of this functionality in `LlmChatPreview`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
    -   Maybe use the functionality (or make common abstraction) with message predefined buttons, `parseMessageButtons`
-   Add the changes into the `CHANGELOG.md`

_This is the example usage:_

```typescript
'use client';

import { LlmChat } from '@promptbook/components';
import { useSendMessageToLlmChat } from '@promptbook/components';

export default function Home() {
    const sendMessage = useSendMessageToLlmChat();

    return (
        <div className="h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* THE PERSONA IS THE WEBSITE - Full-screen chat interface */}
            <div className="flex-1 relative z-10 p-4 md:p-6">
                <div className="h-full max-w-6xl mx-auto">
                    {/* Welcome message overlay - appears on first visit */}
                    <div className="absolute top-8 left-8 right-8 z-30 pointer-events-none">
                        <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 max-w-2xl mx-auto">
                            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">Hi! I'm Pavol 👋</h1>
                            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
                                Welcome to my AI-powered workspace. I'm here to help transform your business with
                                practical AI integration. Ask me about workshops, pricing, implementation strategies, or
                                anything else you're curious about.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    className="px-3 py-1 bg-purple-500/30 text-purple-200 rounded-full text-xs cursor-pointer"
                                    onClick={() => void sendMessage('Tell me about your workshops!')}
                                >
                                    Workshop Design
                                </button>
                                <button
                                    type="button"
                                    className="px-3 py-1 bg-blue-500/30 text-blue-200 rounded-full text-xs"
                                    onClick={() => void sendMessage('Tell me about your AI strategy!')}
                                >
                                    AI Strategy
                                </button>
                                <button
                                    type="button"
                                    className="px-3 py-1 bg-green-500/30 text-green-200 rounded-full text-xs"
                                    onClick={() => void sendMessage('Tell me about your team training!')}
                                >
                                    Team Training
                                </button>
                                <button
                                    type="button"
                                    className="px-3 py-1 bg-pink-500/30 text-pink-200 rounded-full text-xs"
                                    onClick={() => void sendMessage('Tell me about your implementation process!')}
                                >
                                    Implementation
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* The main persona interface - THIS IS THE WEBSITE */}
                    <div className="h-full bg-black/20 backdrop-blur-sm rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
                        <div className="h-full p-6 md:p-8">
                            <LlmChat /* ... */ className="h-full" sendMessage={sendMessage} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
```

---

[x]

[✨🪛] Fix `useSendMessageToLlmChat` hook

-   Now user needs to use and wrap component and hook usage in `LlmChatContext`
-   This shouldnt be the case, consumer should use JUST the combination of `useSendMessageToLlmChat` hook and `LlmChat` component without knowing anything about the React context
-   If it couldnt be implemented with context, use different approach
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

**This is the example which should work out of the box:**

```typescript
'use client';

import { LlmChat } from '@promptbook/components';
import { useSendMessageToLlmChat } from '@promptbook/components';

export default function Home() {
    const sendMessage = useSendMessageToLlmChat();

    return (
        <>
            <button type="button" onClick={() => void sendMessage('Hello!')}>
                Hello
            </button>
            <LlmChat /* ... */ sendMessage={sendMessage} />
        </>
    );
}
```

---

[-]

[✨🪛] quux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[-]

[✨🪛] quux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
