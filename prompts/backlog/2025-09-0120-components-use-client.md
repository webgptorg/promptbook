[-] <- Note: Maybe not solution

[✨🥶] When the component Chat is used in Next.js page, it end up with the error:

```
react-server-dom-turbopack-client.browser.development.js:2326 Uncaught TypeError: useState only works in Client Components. Add the "use client" directive at the top of the file to use it. Read more: https://nextjs.org/docs/messages/react-client-hook-in-server-component
    at resolveErrorDev (react-server-dom-turbopack-client.browser.development.js:2326:46)
    at processFullStringRow (react-server-dom-turbopack-client.browser.development.js:2812:23)
    at processFullBinaryRow (react-server-dom-turbopack-client.browser.development.js:2755:7)
    at processBinaryChunk (react-server-dom-turbopack-client.browser.development.js:2958:15)
    at progress (react-server-dom-turbopack-client.browser.development.js:3222:13)
```

The code is:

```typescript
// page.tsx

import Image from 'next/image';
import { Chat } from '@promptbook/components';

export default function Home() {
    return (
        <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
            <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
                <Image className="dark:invert" src="/next.svg" alt="Next.js logo" width={180} height={38} priority />
                <ol className="font-mono list-inside list-decimal text-sm/6 text-center sm:text-left">
                    <li className="mb-2 tracking-[-.01em]">
                        Get started by editing{' '}
                        <code className="bg-black/[.05] dark:bg-white/[.06] font-mono font-semibold px-1 py-0.5 rounded">
                            src/app/page.tsx
                        </code>
                        .
                    </li>
                    <li className="tracking-[-.01em]">Save and see your changes instantly.</li>
                </ol>

                <div className="flex gap-4 items-center flex-col sm:flex-row">
                    <a
                        className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
                        href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Image className="dark:invert" src="/vercel.svg" alt="Vercel logomark" width={20} height={20} />
                        Deploy now
                    </a>
                    <a
                        className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
                        href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Read our docs
                    </a>
                </div>
                <Chat
                    messages={[
                        { id: '1', from: 'USER', content: 'Hello!', date: new Date(), isComplete: true },
                        {
                            id: '2',
                            from: 'ASSISTANT',
                            content: 'Hi! How can I help?',
                            date: new Date(),
                            isComplete: true,
                        },
                    ]}
                    participants={[
                        {
                            name: 'USER',
                            fullname: 'User',
                            avatarSrc: 'https://i.pravatar.cc/300?u=USER',
                            color: 'blue',
                            isMe: true,
                        },
                    ]}
                    onMessage={() => {}}
                    // onReset={handleReset}
                />
            </main>
            <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
                <a
                    className="flex items-center gap-2 hover:underline hover:underline-offset-4"
                    href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Image aria-hidden src="/file.svg" alt="File icon" width={16} height={16} />
                    Learn
                </a>
                <a
                    className="flex items-center gap-2 hover:underline hover:underline-offset-4"
                    href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Image aria-hidden src="/window.svg" alt="Window icon" width={16} height={16} />
                    Examples
                </a>
                <a
                    className="flex items-center gap-2 hover:underline hover:underline-offset-4"
                    href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Image aria-hidden src="/globe.svg" alt="Globe icon" width={16} height={16} />
                    Go to nextjs.org →
                </a>
            </footer>
        </div>
    );
}
```

---

[x]

[✨🥶] Change the build process such as `/src/_packages/components.index.ts` ends up with 'use client'; statement on the first line.

-   Files `/src/_packages/*.index.ts` are auto-generated
-   The `components.index.ts` should have the `'use client';` statement
-   Other `index.ts` files should stay intact

---

[-]

[✨🥶] baz

---

[-]

[✨🥶] baz
